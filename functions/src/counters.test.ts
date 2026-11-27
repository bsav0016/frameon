// Counter recounts, run against the Firestore emulator (`npm run test:functions` from the repo root).
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-frameon';
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run these through the Firestore emulator: npm run test:functions');
initializeApp({ projectId: 'demo-frameon' });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { recountPost, recountSeller } = require('./counters') as typeof import('./counters');

async function clearAll() {
  for (const collection of ['posts', 'profiles', 'sellerReviews']) await db.recursiveDelete(db.collection(collection));
}
const post = async () => (await db.doc('posts/p1').get()).data();
const profile = async () => (await db.doc('profiles/seller1').get()).data();

describe('counters', () => {
  beforeEach(async () => {
    await clearAll();
    await db.doc('posts/p1').set({ ownerUid: 'seller1', ratingSum: 0, ratingCount: 0, commentCount: 0 });
    await db.doc('profiles/seller1').set({ username: 'alice', sellerRatingSum: 0, sellerRatingCount: 0 });
  });
  after(clearAll);

  it('counts ratings and comments, and gives the same answer however often it runs', async () => {
    await db.doc('posts/p1/ratings/a').set({ stars: 5 });
    await db.doc('posts/p1/ratings/b').set({ stars: 2 });
    await db.doc('posts/p1/comments/c1').set({ text: 'hi' });
    for (let i = 0; i < 3; i++) await recountPost('p1', { ratings: true, comments: true });
    assert.deepEqual(
      [(await post())?.ratingSum, (await post())?.ratingCount, (await post())?.commentCount],
      [7, 2, 1],
    );
  });

  it('corrects a drifted counter and follows edits and deletes', async () => {
    await db.doc('posts/p1').update({ ratingSum: 40, ratingCount: 9, commentCount: 5 });
    await db.doc('posts/p1/ratings/a').set({ stars: 4 });
    await recountPost('p1', { ratings: true, comments: true });
    assert.equal((await post())?.ratingSum, 4);
    assert.equal((await post())?.ratingCount, 1);
    assert.equal((await post())?.commentCount, 0);
    await db.doc('posts/p1/ratings/a').set({ stars: 1 });
    await recountPost('p1', { ratings: true });
    assert.equal((await post())?.ratingSum, 1);
    await db.doc('posts/p1/ratings/a').delete();
    await recountPost('p1', { ratings: true });
    assert.deepEqual([(await post())?.ratingSum, (await post())?.ratingCount], [0, 0]);
  });

  it('leaves the other counters alone and ignores a deleted post', async () => {
    await db.doc('posts/p1').update({ commentCount: 3 });
    await db.doc('posts/p1/ratings/a').set({ stars: 3 });
    await recountPost('p1', { ratings: true });
    assert.equal((await post())?.commentCount, 3);
    await assert.doesNotReject(recountPost('missing', { ratings: true, comments: true }));
    assert.equal((await db.doc('posts/missing').get()).exists, false);
  });

  it('recounts a seller from their reviews only', async () => {
    await db.doc('sellerReviews/r1').set({ sellerUid: 'seller1', stars: 5 });
    await db.doc('sellerReviews/r2').set({ sellerUid: 'seller1', stars: 4 });
    await db.doc('sellerReviews/r3').set({ sellerUid: 'other', stars: 1 });
    await recountSeller('seller1');
    await recountSeller('seller1');
    assert.deepEqual([(await profile())?.sellerRatingSum, (await profile())?.sellerRatingCount], [9, 2]);
    await assert.doesNotReject(recountSeller('nobody'));
    assert.equal((await db.doc('profiles/nobody').get()).exists, false);
  });
});
