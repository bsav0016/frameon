import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import type Stripe from 'stripe';

import { getStripe as stripe, stripeKey, webhookSecret } from './stripe';

const db = getFirestore();
const REGION = 'us-central1';

// Total fee shown to sellers in the app: 5% of the price. Stripe's own fee is paid out of it.
const APP_FEE_RATE = 0.05;
const callable = { region: REGION, maxInstances: 20, invoker: 'public' as const, secrets: [stripeKey] };

function requireUid(auth: { uid: string } | undefined): string {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return auth.uid;
}

const text = (v: unknown, field: string, max = 100, optional = false) => {
  if (optional && (v === undefined || v === null || v === '')) return '';
  if (typeof v !== 'string' || v.trim() === '' || v.length > max) throw new HttpsError('invalid-argument', `Invalid ${field}.`);
  return v.trim();
};

interface Shipping {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'US' | 'CA';
}

function parseShipping(v: unknown): Shipping {
  const s = (v ?? {}) as Record<string, unknown>;
  const country = s.country === 'US' || s.country === 'CA' ? s.country : null;
  if (!country) throw new HttpsError('invalid-argument', 'Please select a country.');
  const shipping: Shipping = {
    name: text(s.name, 'name', 100),
    line1: text(s.line1, 'address', 100),
    line2: text(s.line2, 'address line 2', 100, true),
    city: text(s.city, 'city', 60),
    state: text(s.state, 'state', 2).toUpperCase(),
    postalCode: text(s.postalCode, 'postal code', 10),
    country,
  };
  if (!/^[A-Z]{2}$/.test(shipping.state)) throw new HttpsError('invalid-argument', 'State must be a 2 letter abbreviation.');
  if (country === 'US' && !/^\d{5}$/.test(shipping.postalCode)) throw new HttpsError('invalid-argument', 'ZIP code must be 5 digits.');
  if (country === 'CA' && !/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(shipping.postalCode)) throw new HttpsError('invalid-argument', 'Postal code must look like K1A 0B1.');
  return shipping;
}

// ---------------------------------------------------------------- seller onboarding

/** Stripe only accepts https return URLs, so it comes back here and we bounce into the app. */
export const connectRedirect = onRequest({ region: REGION, invoker: 'public' }, (req, res) => {
  const to = req.query.to === 'refresh' ? 'refresh' : 'return';
  res.redirect(302, `frameon://connect/${to}`);
});

export const startSellerOnboarding = onCall(callable, async (req) => {
  const uid = requireUid(req.auth);
  const userRef = db.doc(`users/${uid}`);
  const user = (await userRef.get()).data() as { email?: string; stripeAccountId?: string } | undefined;
  if (!user) throw new HttpsError('failed-precondition', 'Account not found.');

  const s = stripe();
  let accountId = user.stripeAccountId;
  if (!accountId) {
    const account = await s.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { uid },
    });
    accountId = account.id;
    await userRef.update({ stripeAccountId: accountId });
  }

  const base = `https://${REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/connectRedirect`;
  const link = await s.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${base}?to=refresh`,
    return_url: `${base}?to=return`,
  });
  return { url: link.url };
});

/** Called when the user returns from onboarding. The account.updated webhook keeps it current afterwards. */
export const syncSellerStatus = onCall(callable, async (req) => {
  const uid = requireUid(req.auth);
  const userRef = db.doc(`users/${uid}`);
  const accountId = ((await userRef.get()).data() as { stripeAccountId?: string } | undefined)?.stripeAccountId;
  if (!accountId) return { chargesEnabled: false, started: false };
  const account = await stripe().accounts.retrieve(accountId);
  const chargesEnabled = account.charges_enabled === true && account.details_submitted === true;
  await userRef.update({ chargesEnabled });
  return { chargesEnabled, started: true };
});

// ---------------------------------------------------------------- checkout

/** The price, seller and stock all come from Firestore. The client only says which post and where to ship. */
export const createPaymentIntent = onCall(callable, async (req) => {
  const buyerUid = requireUid(req.auth);
  const postId = text(req.data?.postId, 'post', 100);
  const shipping = parseShipping(req.data?.shipping);

  const post = (await db.doc(`posts/${postId}`).get()).data() as { ownerUid: string; priceCents: number; quantity: number; status?: string } | undefined;
  if (!post || post.status === 'hidden' || post.priceCents < 50 || post.quantity < 1) throw new HttpsError('failed-precondition', 'This piece is no longer available.');
  if (post.ownerUid === buyerUid) throw new HttpsError('failed-precondition', 'You cannot buy your own art.');

  const [seller, blockedByThem, blockedByMe] = await Promise.all([
    db.doc(`users/${post.ownerUid}`).get(),
    db.doc(`blocks/${post.ownerUid}_${buyerUid}`).get(),
    db.doc(`blocks/${buyerUid}_${post.ownerUid}`).get(),
  ]);
  const sellerData = seller.data() as { stripeAccountId?: string; chargesEnabled?: boolean } | undefined;
  if (blockedByThem.exists || blockedByMe.exists) throw new HttpsError('failed-precondition', 'This piece is not available to you.');
  if (!sellerData?.chargesEnabled || !sellerData.stripeAccountId) throw new HttpsError('failed-precondition', 'This seller cannot accept payments right now.');

  const intent = await stripe().paymentIntents.create({
    amount: post.priceCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    application_fee_amount: Math.round(post.priceCents * APP_FEE_RATE),
    transfer_data: { destination: sellerData.stripeAccountId },
    shipping: {
      name: shipping.name,
      address: { line1: shipping.line1, line2: shipping.line2 || undefined, city: shipping.city, state: shipping.state, postal_code: shipping.postalCode, country: shipping.country },
    },
    metadata: { postId, buyerUid, sellerUid: post.ownerUid },
  });
  return { clientSecret: intent.client_secret, amountCents: post.priceCents };
});

// ---------------------------------------------------------------- webhook

async function fulfill(pi: Stripe.PaymentIntent) {
  const { postId, buyerUid, sellerUid } = pi.metadata;
  if (!postId || !buyerUid || !sellerUid) {
    logger.error('payment intent without metadata', { id: pi.id });
    return;
  }
  const orderRef = db.doc(`orders/${pi.id}`);
  const postRef = db.doc(`posts/${postId}`);
  const buyer = (await db.doc(`profiles/${buyerUid}`).get()).data() as { username?: string } | undefined;
  const s = pi.shipping;
  const shippingAddress = {
    name: s?.name ?? '',
    line1: s?.address?.line1 ?? '',
    line2: s?.address?.line2 ?? '',
    city: s?.address?.city ?? '',
    state: s?.address?.state ?? '',
    postalCode: s?.address?.postal_code ?? '',
    country: s?.address?.country === 'CA' ? 'CA' : 'US',
  };

  // Stock is decremented here, transactionally, so two simultaneous buyers cannot both get the last piece.
  const outcome = await db.runTransaction(async (tx) => {
    if ((await tx.get(orderRef)).exists) return 'duplicate' as const; // Stripe retries webhooks
    const post = (await tx.get(postRef)).data() as { quantity?: number; imageURL?: string } | undefined;
    const base = { postId, postImageURL: post?.imageURL ?? '', buyerUid, buyerUsername: buyer?.username ?? '', sellerUid, amountCents: pi.amount, shippingAddress, createdAt: FieldValue.serverTimestamp() };
    if (!post || (post.quantity ?? 0) < 1) {
      tx.set(orderRef, { ...base, status: 'refunded', reason: 'out_of_stock' });
      return 'sold_out' as const;
    }
    tx.update(postRef, { quantity: FieldValue.increment(-1) });
    tx.set(orderRef, { ...base, status: 'paid' });
    tx.set(db.doc(`purchases/${sellerUid}_${buyerUid}`), { sellerUid, buyerUid, lastOrderId: pi.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(db.collection(`notifications/${sellerUid}/items`).doc(), {
      type: 'purchase',
      fromUid: buyerUid,
      fromUsername: buyer?.username ?? 'someone',
      fromPhotoURL: null,
      postId,
      postImageURL: post.imageURL ?? null,
      stars: null,
      orderId: pi.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return 'paid' as const;
  });

  // On a retry the order already exists, so re-check that an out-of-stock sale really got its refund.
  if (outcome === 'sold_out' || (outcome === 'duplicate' && (await orderRef.get()).data()?.reason === 'out_of_stock')) {
    const existing = await stripe().refunds.list({ payment_intent: pi.id, limit: 1 });
    if (existing.data.length === 0) {
      await stripe().refunds.create({ payment_intent: pi.id, reverse_transfer: true, refund_application_fee: true });
      logger.warn('refunded sale of an out-of-stock post', { id: pi.id, postId });
    }
  }
}

export const stripeWebhook = onRequest({ region: REGION, invoker: 'public', secrets: [stripeKey, webhookSecret] }, async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(req.rawBody, signature as string, webhookSecret.value());
  } catch {
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await fulfill(event.data.object);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const id = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (id && charge.refunded) await db.doc(`orders/${id}`).update({ status: 'refunded' }).catch(() => undefined);
        break;
      }
      case 'account.updated': {
        const account = event.data.object;
        const users = await db.collection('users').where('stripeAccountId', '==', account.id).limit(1).get();
        await Promise.all(users.docs.map((u) => u.ref.update({ chargesEnabled: account.charges_enabled === true && account.details_submitted === true })));
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    logger.error('webhook handler failed', { type: event.type, e });
    res.status(500).send('Handler error'); // Stripe will retry
  }
});
