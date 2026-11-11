import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { getStripe, stripeKey } from './stripe';

const db = getFirestore();
const WEB_API_KEY = defineString('WEB_API_KEY');
// Callables are reachable by any client; authorization happens inside each function.
const opts = { region: 'us-central1', maxInstances: 20, invoker: 'public' as const };

const USERNAME = /^[A-Za-z0-9_.]{3,20}$/;
// Bump when the Terms of Use change materially, so we can tell who accepted which version.
const TERMS_VERSION = '2026-11-11';
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
// One message for every failure so the endpoint cannot be used to discover which usernames exist.
const BAD_LOGIN = 'Invalid username or password.';

const str = (v: unknown, field: string, max = 200) => {
  if (typeof v !== 'string' || v.length === 0 || v.length > max) throw new HttpsError('invalid-argument', `Invalid ${field}.`);
  return v;
};

export const isUsernameAvailable = onCall(opts, async (req) => {
  const name = str(req.data?.username, 'username', 20);
  if (!USERNAME.test(name)) return { available: false };
  return { available: !(await db.doc(`usernames/${name.toLowerCase()}`).get()).exists };
});

/** Creates the Auth user, reserves the username and writes the public profile and private user doc atomically. */
export const registerAccount = onCall(opts, async (req) => {
  const username = str(req.data?.username, 'username', 20);
  const email = str(req.data?.email, 'email', 254).trim();
  const password = str(req.data?.password, 'password', 128);
  const name = typeof req.data?.name === 'string' ? req.data.name.trim().slice(0, 50) : '';
  if (!USERNAME.test(username)) throw new HttpsError('invalid-argument', 'Usernames are 3-20 letters, numbers, dots or underscores.');
  if (password.length < 8) throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  if (req.data?.acceptedTerms !== true) throw new HttpsError('failed-precondition', 'You must accept the Terms of Use to create an account.');

  const lower = username.toLowerCase();
  const usernameRef = db.doc(`usernames/${lower}`);
  if ((await usernameRef.get()).exists) throw new HttpsError('already-exists', 'That username is taken.');

  let uid: string;
  try {
    uid = (await getAuth().createUser({ email, password, displayName: username })).uid;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'An account with that email already exists.');
    if (code === 'auth/invalid-email') throw new HttpsError('invalid-argument', 'That email address is not valid.');
    if (code === 'auth/invalid-password') throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
    throw new HttpsError('internal', 'Could not create the account.');
  }

  try {
    await db.runTransaction(async (tx) => {
      if ((await tx.get(usernameRef)).exists) throw new HttpsError('already-exists', 'That username is taken.');
      tx.create(usernameRef, { uid });
      tx.create(db.doc(`profiles/${uid}`), {
        username,
        usernameLower: lower,
        name,
        bio: '',
        photoURL: null,
        sellerRatingSum: 0,
        sellerRatingCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.create(db.doc(`users/${uid}`), { email, chargesEnabled: false, termsAcceptedAt: FieldValue.serverTimestamp(), termsVersion: TERMS_VERSION, createdAt: FieldValue.serverTimestamp() });
    });
  } catch (e) {
    await getAuth().deleteUser(uid).catch(() => undefined); // do not leave an orphan Auth user behind
    throw e;
  }
  return { ok: true };
});

/**
 * Username + password login. Email addresses never leave the server: the password is verified against
 * Firebase Auth with the account's email, then a custom token is minted. Repeated failures lock the name.
 */
export const signInWithUsername = onCall(opts, async (req) => {
  const lower = str(req.data?.username, 'username', 20).toLowerCase();
  const password = str(req.data?.password, 'password', 128);

  const attemptsRef = db.doc(`loginAttempts/${lower}`);
  const attempts = (await attemptsRef.get()).data() as { count?: number; lockedUntil?: number } | undefined;
  if (attempts?.lockedUntil && attempts.lockedUntil > Date.now()) {
    throw new HttpsError('resource-exhausted', 'Too many attempts. Try again in a few minutes.');
  }

  const fail = async (): Promise<never> => {
    const count = (attempts?.lockedUntil && attempts.lockedUntil <= Date.now() ? 0 : (attempts?.count ?? 0)) + 1;
    await attemptsRef.set(count >= MAX_FAILURES ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count, lockedUntil: 0 });
    throw new HttpsError('unauthenticated', BAD_LOGIN);
  };

  const owner = (await db.doc(`usernames/${lower}`).get()).data() as { uid?: string } | undefined;
  if (!owner?.uid) return fail();
  const user = await getAuth().getUser(owner.uid).catch(() => null);
  if (!user?.email || user.disabled) return fail();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY.value()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password, returnSecureToken: false }),
  });
  if (!res.ok) return fail();

  await attemptsRef.delete().catch(() => undefined);
  return { token: await getAuth().createCustomToken(owner.uid) };
});

/**
 * Deletes the caller's account and content (App Store requirement). Orders are kept because the buyer or
 * seller on the other side still needs the record. Post subcollections and photos go via onPostDeleted.
 */
export const deleteAccount = onCall({ ...opts, timeoutSeconds: 300, secrets: [stripeKey] }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  // Require a login within the last 5 minutes so a stolen idle session cannot delete the account.
  if (!req.auth?.token.auth_time || Date.now() / 1000 - req.auth.token.auth_time > 300) {
    throw new HttpsError('failed-precondition', 'Please sign in again to delete your account.');
  }

  const profile = (await db.doc(`profiles/${uid}`).get()).data() as { username?: string } | undefined;
  const stripeAccountId = ((await db.doc(`users/${uid}`).get()).data() as { stripeAccountId?: string } | undefined)?.stripeAccountId;

  const posts = await db.collection('posts').where('ownerUid', '==', uid).get();
  for (const p of posts.docs) await db.recursiveDelete(p.ref);

  const comments = await db.collectionGroup('comments').where('authorUid', '==', uid).get();
  await Promise.all(comments.docs.map((c) => c.ref.delete()));

  for (const [col, field] of [['follows', 'follower'], ['follows', 'followee'], ['blocks', 'blocker'], ['blocks', 'blocked'], ['sellerReviews', 'raterUid']] as const) {
    const snap = await db.collection(col).where(field, '==', uid).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }

  // Remove the seller's Stripe account. Stripe refuses if money is still owed; that must not block deletion.
  if (stripeAccountId) await getStripe().accounts.del(stripeAccountId).catch((e) => logger.warn('could not delete Stripe account', { stripeAccountId, e }));

  await db.recursiveDelete(db.collection(`notifications/${uid}/items`));
  if (profile?.username) await db.doc(`usernames/${profile.username.toLowerCase()}`).delete();
  await db.doc(`profiles/${uid}`).delete();
  await db.doc(`users/${uid}`).delete();
  await getStorage().bucket().deleteFiles({ prefix: `avatars/${uid}/` }).catch(() => undefined);
  await getAuth().deleteUser(uid);
  return { ok: true };
});
