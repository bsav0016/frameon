// Shipping, delivery confirmation and auto-completion, run against the Firestore emulator
// (`npm run test:functions` from the repo root starts it).
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-frameon';
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run these through the Firestore emulator: npm run test:functions');
initializeApp({ projectId: 'demo-frameon' });
const db = getFirestore();

// eslint-disable-next-line @typescript-eslint/no-require-imports
const events = require('./orderEvents') as typeof import('./orderEvents');

const DAY = 24 * 60 * 60 * 1000;
const TRACKING = '9400 1118 9922 3197 4284 90';

async function clearAll() {
  for (const collection of ['orders', 'posts', 'profiles', 'notifications']) await db.recursiveDelete(db.collection(collection));
}

const seedOrder = (id: string, over: Record<string, unknown> = {}) =>
  db.doc(`orders/${id}`).set({ status: 'paid', postId: 'post1', buyerUid: 'buyer1', sellerUid: 'seller1', amountCents: 4500, ...over });
const order = async (id: string) => (await db.doc(`orders/${id}`).get()).data();
const notesFor = async (uid: string) => (await db.collection(`notifications/${uid}/items`).get()).docs.map((d) => d.data());
const code = (expected: string) => (e: unknown) => (e as { code?: string }).code === expected;

describe('order shipping and delivery', () => {
  before(clearAll);
  beforeEach(async () => {
    await clearAll();
    await db.doc('profiles/buyer1').set({ username: 'pat' });
    await db.doc('profiles/seller1').set({ username: 'alice' });
    await db.doc('posts/post1').set({ ownerUid: 'seller1', quantity: 1, imageURL: 'https://img/1.jpg' });
  });
  after(clearAll);

  describe('shipOrder', () => {
    it('marks a paid order shipped with carrier and tracking, and tells the buyer', async () => {
      await seedOrder('o1');
      await events.shipOrder('seller1', 'o1', 'USPS', `  ${TRACKING} `);
      const o = await order('o1');
      assert.equal(o?.status, 'shipped');
      assert.equal(o?.carrier, 'USPS');
      assert.equal(o?.trackingNumber, TRACKING);
      assert.ok(o?.shippedAt);

      const notes = await notesFor('buyer1');
      assert.equal(notes.length, 1);
      assert.equal(notes[0].type, 'order_shipped');
      assert.equal(notes[0].fromUsername, 'alice');
      assert.equal(notes[0].orderId, 'o1');
      assert.equal((await notesFor('seller1')).length, 0);
    });

    it('is only for that order\'s seller', async () => {
      await seedOrder('o1');
      await assert.rejects(events.shipOrder('buyer1', 'o1', 'USPS', TRACKING), code('permission-denied'));
      await assert.rejects(events.shipOrder('stranger', 'o1', 'USPS', TRACKING), code('permission-denied'));
      assert.equal((await order('o1'))?.status, 'paid');
      assert.equal((await notesFor('buyer1')).length, 0);
    });

    it('rejects an unknown order, carrier or tracking number', async () => {
      await seedOrder('o1');
      await assert.rejects(events.shipOrder('seller1', 'missing', 'USPS', TRACKING), code('not-found'));
      await assert.rejects(events.shipOrder('seller1', 'o1', 'Pigeon', TRACKING), code('invalid-argument'));
      await assert.rejects(events.shipOrder('seller1', 'o1', undefined, TRACKING), code('invalid-argument'));
      await assert.rejects(events.shipOrder('seller1', 'o1', 'USPS', 'abc'), code('invalid-argument'));
      await assert.rejects(events.shipOrder('seller1', 'o1', 'USPS', { $ne: 1 }), code('invalid-argument'));
      assert.equal((await order('o1'))?.status, 'paid');
    });

    it('cannot ship twice or ship a refunded order', async () => {
      await seedOrder('o1');
      await events.shipOrder('seller1', 'o1', 'USPS', TRACKING);
      await assert.rejects(events.shipOrder('seller1', 'o1', 'UPS', '1Z999AA10123456784'), code('failed-precondition'));
      assert.equal((await order('o1'))?.carrier, 'USPS');
      assert.equal((await notesFor('buyer1')).length, 1);

      await seedOrder('o2', { status: 'refunded' });
      await assert.rejects(events.shipOrder('seller1', 'o2', 'USPS', TRACKING), code('failed-precondition'));
    });
  });

  describe('confirmOrderDelivery', () => {
    it('marks a shipped order delivered and tells the seller', async () => {
      await seedOrder('o1', { status: 'shipped', carrier: 'USPS', trackingNumber: TRACKING });
      await events.confirmOrderDelivery('buyer1', 'o1');
      const o = await order('o1');
      assert.equal(o?.status, 'delivered');
      assert.ok(o?.deliveredAt);
      const notes = await notesFor('seller1');
      assert.equal(notes.length, 1);
      assert.equal(notes[0].type, 'order_delivered');
      assert.equal(notes[0].fromUsername, 'pat');
    });

    it('is only for the buyer and only after shipping', async () => {
      await seedOrder('o1', { status: 'shipped' });
      await assert.rejects(events.confirmOrderDelivery('seller1', 'o1'), code('permission-denied'));
      await assert.rejects(events.confirmOrderDelivery('stranger', 'o1'), code('permission-denied'));
      await assert.rejects(events.confirmOrderDelivery('buyer1', 'missing'), code('not-found'));
      await seedOrder('o2');
      await assert.rejects(events.confirmOrderDelivery('buyer1', 'o2'), code('failed-precondition'));
      assert.equal((await order('o1'))?.status, 'shipped');
    });

    it('can be repeated without a second notification', async () => {
      await seedOrder('o1', { status: 'shipped' });
      await events.confirmOrderDelivery('buyer1', 'o1');
      await events.confirmOrderDelivery('buyer1', 'o1');
      assert.equal((await notesFor('seller1')).length, 1);
    });
  });

  describe('autoCompleteShippedOrders', () => {
    const shippedAgo = (days: number) => Timestamp.fromMillis(Date.now() - days * DAY);

    it('delivers only shipped orders older than the limit, and says it was automatic', async () => {
      await seedOrder('old', { status: 'shipped', shippedAt: shippedAgo(events.AUTO_DELIVER_DAYS + 1) });
      await seedOrder('recent', { status: 'shipped', shippedAt: shippedAgo(3) });
      await seedOrder('unshipped', { status: 'paid' });
      await seedOrder('disputed', { status: 'disputed', shippedAt: shippedAgo(40) });
      await seedOrder('done', { status: 'delivered', shippedAt: shippedAgo(40) });

      assert.equal(await events.autoCompleteShippedOrders(), 1);
      const old = await order('old');
      assert.equal(old?.status, 'delivered');
      assert.equal(old?.deliveredBy, 'auto');
      assert.ok(old?.deliveredAt);
      for (const [id, status] of [['recent', 'shipped'], ['unshipped', 'paid'], ['disputed', 'disputed'], ['done', 'delivered']]) {
        assert.equal((await order(id))?.status, status, id);
      }
      const notes = await notesFor('seller1');
      assert.equal(notes.length, 1);
      assert.equal(notes[0].orderId, 'old');
    });

    it('does nothing the second time', async () => {
      await seedOrder('old', { status: 'shipped', shippedAt: shippedAgo(30) });
      assert.equal(await events.autoCompleteShippedOrders(), 1);
      assert.equal(await events.autoCompleteShippedOrders(), 0);
      assert.equal((await notesFor('seller1')).length, 1);
    });

    it('leaves an order the buyer already confirmed alone', async () => {
      await seedOrder('o1', { status: 'shipped', shippedAt: shippedAgo(30) });
      await events.confirmOrderDelivery('buyer1', 'o1');
      assert.equal(await events.autoCompleteShippedOrders(), 0);
      assert.equal((await order('o1'))?.deliveredBy, undefined);
    });
  });
});
