// Counters are recomputed from the documents they summarise instead of nudged with
// FieldValue.increment. Cloud Functions deliver events at least once, so an increment can
// be applied twice for one write; a recount gives the same answer however many times it runs.
import { AggregateField, getFirestore } from 'firebase-admin/firestore';

export async function recountPost(postId: string, kinds: { ratings?: boolean; comments?: boolean }): Promise<void> {
  const db = getFirestore();
  const postRef = db.doc(`posts/${postId}`);
  const fields: Record<string, number> = {};
  if (kinds.ratings) {
    const r = await postRef
      .collection('ratings')
      .aggregate({ count: AggregateField.count(), total: AggregateField.sum('stars') })
      .get();
    fields.ratingCount = r.data().count;
    fields.ratingSum = r.data().total ?? 0;
  }
  if (kinds.comments) {
    const c = await postRef.collection('comments').count().get();
    fields.commentCount = c.data().count;
  }
  // The post can be deleted between the trigger and the write.
  try {
    await postRef.update(fields);
  } catch (e) {
    if ((e as { code?: number }).code !== 5) throw e;
  }
}

export async function recountSeller(sellerUid: string): Promise<void> {
  const db = getFirestore();
  const r = await db
    .collection('sellerReviews')
    .where('sellerUid', '==', sellerUid)
    .aggregate({ count: AggregateField.count(), total: AggregateField.sum('stars') })
    .get();
  try {
    await db.doc(`profiles/${sellerUid}`).update({ sellerRatingCount: r.data().count, sellerRatingSum: r.data().total ?? 0 });
  } catch (e) {
    if ((e as { code?: number }).code !== 5) throw e;
  }
}
