import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentCreated, onDocumentDeleted, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const opts = { region: REGION };

type Profile = { username?: string; photoURL?: string | null };

async function profileOf(uid: string): Promise<Profile> {
  const snap = await db.doc(`profiles/${uid}`).get();
  return (snap.data() as Profile | undefined) ?? {};
}

async function notify(
  toUid: string,
  fromUid: string,
  fields: { type: 'rating' | 'comment' | 'follow' | 'purchase'; postId?: string; postImageURL?: string; stars?: number; orderId?: string },
) {
  if (toUid === fromUid) return;
  // Blocked users should not be able to ping the person who blocked them.
  const blocked = await db.doc(`blocks/${toUid}_${fromUid}`).get();
  if (blocked.exists) return;
  const from = await profileOf(fromUid);
  await db.collection(`notifications/${toUid}/items`).add({
    type: fields.type,
    fromUid,
    fromUsername: from.username ?? 'someone',
    fromPhotoURL: from.photoURL ?? null,
    postId: fields.postId ?? null,
    postImageURL: fields.postImageURL ?? null,
    stars: fields.stars ?? null,
    orderId: fields.orderId ?? null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ---- ratings: keep posts/{id}.ratingSum / ratingCount in sync and notify the owner ----
export const onRatingWritten = onDocumentWritten({ ...opts, document: 'posts/{postId}/ratings/{uid}' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const delta = (after?.stars ?? 0) - (before?.stars ?? 0);
  const countDelta = (after ? 1 : 0) - (before ? 1 : 0);
  const postRef = db.doc(`posts/${event.params.postId}`);
  const post = await postRef.get();
  if (!post.exists) return;
  await postRef.update({ ratingSum: FieldValue.increment(delta), ratingCount: FieldValue.increment(countDelta) });
  if (after && !before) {
    const data = post.data()!;
    await notify(data.ownerUid, event.params.uid, { type: 'rating', postId: post.id, postImageURL: data.imageURL, stars: after.stars });
  }
});

// ---- comments ----
export const onCommentCreated = onDocumentCreated({ ...opts, document: 'posts/{postId}/comments/{commentId}' }, async (event) => {
  const postRef = db.doc(`posts/${event.params.postId}`);
  const post = await postRef.get();
  if (!post.exists) return;
  await postRef.update({ commentCount: FieldValue.increment(1) });
  const data = post.data()!;
  await notify(data.ownerUid, event.data!.data().authorUid, { type: 'comment', postId: post.id, postImageURL: data.imageURL });
});

export const onCommentDeleted = onDocumentDeleted({ ...opts, document: 'posts/{postId}/comments/{commentId}' }, async (event) => {
  const postRef = db.doc(`posts/${event.params.postId}`);
  if ((await postRef.get()).exists) await postRef.update({ commentCount: FieldValue.increment(-1) });
});

// ---- follows ----
export const onFollowCreated = onDocumentCreated({ ...opts, document: 'follows/{id}' }, async (event) => {
  const { follower, followee } = event.data!.data();
  await notify(followee, follower, { type: 'follow' });
});

// ---- seller rating aggregate on profiles/{uid} ----
export const onSellerReviewWritten = onDocumentWritten({ ...opts, document: 'sellerReviews/{id}' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const sellerUid = (after ?? before)?.sellerUid as string | undefined;
  if (!sellerUid) return;
  const delta = (after?.stars ?? 0) - (before?.stars ?? 0);
  const countDelta = (after ? 1 : 0) - (before ? 1 : 0);
  const ref = db.doc(`profiles/${sellerUid}`);
  if ((await ref.get()).exists) await ref.update({ sellerRatingSum: FieldValue.increment(delta), sellerRatingCount: FieldValue.increment(countDelta) });
});

// ---- post deletion: remove subcollections and the photo ----
export const onPostDeleted = onDocumentDeleted({ ...opts, document: 'posts/{postId}' }, async (event) => {
  const { postId } = event.params;
  await db.recursiveDelete(db.collection(`posts/${postId}/ratings`));
  await db.recursiveDelete(db.collection(`posts/${postId}/comments`));
  const imagePath = event.data?.data().imagePath as string | undefined;
  if (imagePath) {
    try {
      await getStorage().bucket().file(imagePath).delete({ ignoreNotFound: true });
    } catch (e) {
      logger.warn('could not delete post image', { imagePath, e });
    }
  }
});
export * from './auth';
export * from './moderation';
export * from './payments';
export * from './push';
