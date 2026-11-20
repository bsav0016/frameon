// Payment webhook tests. They run against the Firestore emulator (`npm run test:functions` from the repo
// root starts it) and a fake Stripe client, so no network and no real keys are involved.
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const SECRET = 'whsec_test_secret';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.STRIPE_SECRET_KEY = 'sk_test_unused';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-frameon';
process.env.MODERATOR_UID = 'mod1';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run these through the Firestore emulator: npm run test:functions');
initializeApp({ projectId: 'demo-frameon' });
const db = getFirestore();

// Signing and parsing use Stripe's real implementation; only the calls that would reach the network are faked.
const real = new Stripe('sk_test_unused');
const refundCalls: Array<Record<string, unknown>> = [];
let existingRefunds = 0;
let chargePaymentIntent: string | null = 'pi_from_charge';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripeModule = require('./stripe') as { getStripe: () => unknown };
stripeModule.getStripe = () => ({
  webhooks: real.webhooks,
  charges: { retrieve: async () => ({ payment_intent: chargePaymentIntent }) },
  refunds: {
    list: async () => ({ data: Array.from({ length: existingRefunds }, () => ({})) }),
    create: async (args: Record<string, unknown>) => {
      refundCalls.push(args);
      return {};
    },
  },
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { stripeWebhook } = require('./payments') as { stripeWebhook: (req: unknown, res: unknown) => Promise<void> };

// The developer alert is an Expo push; capture it instead of calling out.
const pushes: Array<Array<{ to: string; title: string; body: string }>> = [];
globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
  pushes.push(JSON.parse(init?.body ?? '[]'));
  return { ok: true } as Response;
}) as typeof fetch;

interface Reply {
  status: number;
  body: unknown;
}

async function send(event: object, opts: { signature?: string } = {}): Promise<Reply> {
  const payload = JSON.stringify(event);
  const signature = opts.signature ?? real.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  const reply: Reply = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      reply.status = code;
      return res;
    },
    send(body: unknown) {
      reply.body = body;
      return res;
    },
    json(body: unknown) {
      reply.body = body;
      return res;
    },
  };
  await stripeWebhook({ headers: { 'stripe-signature': signature }, rawBody: Buffer.from(payload) }, res);
  return reply;
}

const paymentSucceeded = (id: string, metadata: Record<string, string> = { postId: 'post1', buyerUid: 'buyer1', sellerUid: 'seller1' }) => ({
  id: `evt_${id}`,
  object: 'event',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id,
      object: 'payment_intent',
      amount: 4500,
      metadata,
      shipping: { name: 'Pat Buyer', address: { line1: '1 Main St', line2: '', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } },
    },
  },
});

const chargeRefunded = (paymentIntent: string, refunded = true) => ({
  id: `evt_refund_${paymentIntent}`,
  object: 'event',
  type: 'charge.refunded',
  data: { object: { id: `ch_${paymentIntent}`, object: 'charge', payment_intent: paymentIntent, refunded } },
});

async function clearAll() {
  for (const collection of ['orders', 'posts', 'purchases', 'profiles', 'notifications', 'users']) await db.recursiveDelete(db.collection(collection));
}

const seedPost = (quantity: number) => db.doc('posts/post1').set({ ownerUid: 'seller1', quantity, imageURL: 'https://img/1.jpg', priceCents: 4500 });
const order = async (id: string) => (await db.doc(`orders/${id}`).get()).data();
const quantity = async () => (await db.doc('posts/post1').get()).data()?.quantity;
const sellerNotifications = async () => (await db.collection('notifications/seller1/items').get()).docs.map((d) => d.data());

describe('stripeWebhook', () => {
  before(async () => {
    await clearAll();
  });
  beforeEach(async () => {
    await clearAll();
    refundCalls.length = 0;
    pushes.length = 0;
    existingRefunds = 0;
    chargePaymentIntent = 'pi_from_charge';
    await db.doc('profiles/buyer1').set({ username: 'pat' });
    await db.doc('profiles/seller1').set({ username: 'alice' });
    await db.doc('users/mod1/devices/ExponentPushToken[dev]').set({});
  });
  after(async () => {
    await clearAll();
  });

  it('rejects a bad signature and writes nothing', async () => {
    await seedPost(1);
    const reply = await send(paymentSucceeded('pi_bad'), { signature: 't=1,v1=deadbeef' });
    assert.equal(reply.status, 400);
    assert.equal(await order('pi_bad'), undefined);
    assert.equal(await quantity(), 1);
  });

  it('turns a successful payment into a paid order, takes one from stock and tells the seller', async () => {
    await seedPost(3);
    const reply = await send(paymentSucceeded('pi_paid'));
    assert.equal(reply.status, 200);

    const o = await order('pi_paid');
    assert.equal(o?.status, 'paid');
    assert.equal(o?.buyerUid, 'buyer1');
    assert.equal(o?.buyerUsername, 'pat');
    assert.equal(o?.sellerUid, 'seller1');
    assert.equal(o?.amountCents, 4500);
    assert.equal(o?.shippingAddress.postalCode, '78701');
    assert.equal(await quantity(), 2);
    assert.equal((await db.doc('purchases/seller1_buyer1').get()).data()?.lastOrderId, 'pi_paid');

    const notes = await sellerNotifications();
    assert.equal(notes.length, 1);
    assert.equal(notes[0].type, 'purchase');
    assert.equal(notes[0].orderId, 'pi_paid');
    assert.equal(refundCalls.length, 0);
  });

  it('handles a duplicate delivery once: one order, one decrement, one notification', async () => {
    await seedPost(3);
    await send(paymentSucceeded('pi_dup'));
    const again = await send(paymentSucceeded('pi_dup'));
    assert.equal(again.status, 200);
    assert.equal(await quantity(), 2);
    assert.equal((await sellerNotifications()).length, 1);
    assert.equal(refundCalls.length, 0);
  });

  it('refunds a sale of a sold-out piece and records why', async () => {
    await seedPost(0);
    const reply = await send(paymentSucceeded('pi_sold_out'));
    assert.equal(reply.status, 200);

    const o = await order('pi_sold_out');
    assert.equal(o?.status, 'refunded');
    assert.equal(o?.reason, 'out_of_stock');
    assert.equal(await quantity(), 0);
    assert.equal((await sellerNotifications()).length, 0);
    assert.equal((await db.doc('purchases/seller1_buyer1').get()).exists, false);
    assert.deepEqual(refundCalls, [{ payment_intent: 'pi_sold_out', reverse_transfer: true, refund_application_fee: true }]);
  });

  it('refunds a sale of a deleted post', async () => {
    const reply = await send(paymentSucceeded('pi_gone'));
    assert.equal(reply.status, 200);
    assert.equal((await order('pi_gone'))?.reason, 'out_of_stock');
    assert.equal(refundCalls.length, 1);
  });

  it('does not refund a sold-out sale twice when Stripe retries the webhook', async () => {
    await seedPost(0);
    await send(paymentSucceeded('pi_retry'));
    existingRefunds = 1; // Stripe now lists the refund created by the first delivery
    await send(paymentSucceeded('pi_retry'));
    assert.equal(refundCalls.length, 1);
  });

  it('retries the missing refund when the first delivery failed before refunding', async () => {
    await seedPost(0);
    await send(paymentSucceeded('pi_late'));
    refundCalls.length = 0; // first attempt's refund is considered lost; Stripe still lists none
    await send(paymentSucceeded('pi_late'));
    assert.equal(refundCalls.length, 1);
  });

  it('ignores a payment without metadata', async () => {
    await seedPost(1);
    const reply = await send(paymentSucceeded('pi_nometa', {}));
    assert.equal(reply.status, 200);
    assert.equal(await order('pi_nometa'), undefined);
    assert.equal(await quantity(), 1);
  });

  it('marks the order refunded when Stripe reports a refund', async () => {
    await seedPost(1);
    await send(paymentSucceeded('pi_refund'));
    const reply = await send(chargeRefunded('pi_refund'));
    assert.equal(reply.status, 200);
    assert.equal((await order('pi_refund'))?.status, 'refunded');
  });

  it('leaves the order alone on a partial refund and tolerates an unknown order', async () => {
    await seedPost(1);
    await send(paymentSucceeded('pi_partial'));
    await send(chargeRefunded('pi_partial', false));
    assert.equal((await order('pi_partial'))?.status, 'paid');

    const reply = await send(chargeRefunded('pi_unknown'));
    assert.equal(reply.status, 200);
    assert.equal(await order('pi_unknown'), undefined);
  });

  it('acknowledges event types it does not use', async () => {
    const reply = await send({ id: 'evt_other', object: 'event', type: 'customer.created', data: { object: { id: 'cus_1', object: 'customer' } } });
    assert.equal(reply.status, 200);
    assert.deepEqual(reply.body, { received: true });
  });

  describe('refunds', () => {
    const notesFor = async (uid: string) => (await db.collection(`notifications/${uid}/items`).get()).docs.map((d) => d.data());
    const marker = async () => (await db.doc('purchases/seller1_buyer1').get()).exists;

    it('refunds an unshipped order: back in stock, review right revoked, both sides told', async () => {
      await seedPost(3);
      await send(paymentSucceeded('pi_r1'));
      assert.equal(await quantity(), 2);
      assert.equal(await marker(), true);

      await send(chargeRefunded('pi_r1'));
      const o = await order('pi_r1');
      assert.equal(o?.status, 'refunded');
      assert.ok(o?.refundedAt);
      assert.equal(await quantity(), 3);
      assert.equal(await marker(), false);

      const buyerNotes = await notesFor('buyer1');
      const sellerNotes = (await notesFor('seller1')).filter((n) => n.type === 'order_refunded');
      assert.equal(buyerNotes.length, 1);
      assert.equal(buyerNotes[0].type, 'order_refunded');
      assert.equal(buyerNotes[0].fromUsername, 'alice');
      assert.equal(buyerNotes[0].orderId, 'pi_r1');
      assert.equal(sellerNotes.length, 1);
      assert.equal(sellerNotes[0].fromUsername, 'pat');
    });

    it('does the work once when Stripe sends the refund event twice', async () => {
      await seedPost(3);
      await send(paymentSucceeded('pi_r2'));
      await send(chargeRefunded('pi_r2'));
      await send(chargeRefunded('pi_r2'));
      assert.equal(await quantity(), 3);
      assert.equal((await notesFor('buyer1')).length, 1);
    });

    it('does not restock a piece that already shipped, but still revokes the review right', async () => {
      await seedPost(1);
      await db.doc('orders/pi_r3').set({ status: 'shipped', postId: 'post1', buyerUid: 'buyer1', sellerUid: 'seller1', amountCents: 4500 });
      await db.doc('purchases/seller1_buyer1').set({ sellerUid: 'seller1', buyerUid: 'buyer1' });
      await send(chargeRefunded('pi_r3'));
      assert.equal((await order('pi_r3'))?.status, 'refunded');
      assert.equal(await quantity(), 1);
      assert.equal(await marker(), false);
    });

    it('keeps the review right while the buyer has another live order with that seller', async () => {
      await seedPost(5);
      await send(paymentSucceeded('pi_r4a'));
      await send(paymentSucceeded('pi_r4b'));
      await send(chargeRefunded('pi_r4a'));
      assert.equal(await marker(), true);
      await send(chargeRefunded('pi_r4b'));
      assert.equal(await marker(), false);
    });

    it('does not restock a sale that was refunded for being out of stock', async () => {
      await seedPost(0);
      await send(paymentSucceeded('pi_r5'));
      await send(chargeRefunded('pi_r5')); // Stripe then reports the refund we issued
      assert.equal(await quantity(), 0);
      assert.equal((await notesFor('buyer1')).length, 0);
    });

    it('does not restock when the post no longer exists', async () => {
      await db.doc('orders/pi_r6').set({ status: 'paid', postId: 'deleted', buyerUid: 'buyer1', sellerUid: 'seller1' });
      const reply = await send(chargeRefunded('pi_r6'));
      assert.equal(reply.status, 200);
      assert.equal((await order('pi_r6'))?.status, 'refunded');
      assert.equal((await db.doc('posts/deleted').get()).exists, false);
    });
  });

  describe('disputes', () => {
    const dispute = (type: 'created' | 'closed', over: Record<string, unknown> = {}) => ({
      id: `evt_dispute_${type}`,
      object: 'event',
      type: `charge.dispute.${type}`,
      data: { object: { id: 'dp_1', object: 'dispute', payment_intent: 'pi_d1', charge: 'ch_1', reason: 'fraudulent', status: type === 'created' ? 'needs_response' : 'won', ...over } },
    });
    const sellerDisputeNotes = async () => (await db.collection('notifications/seller1/items').get()).docs.map((d) => d.data()).filter((n) => n.type === 'order_disputed');

    beforeEach(async () => {
      await seedPost(2);
      await send(paymentSucceeded('pi_d1'));
      await db.doc('orders/pi_d1').update({ status: 'shipped' });
    });

    it('flags the order, tells the seller and alerts the developer', async () => {
      const reply = await send(dispute('created'));
      assert.equal(reply.status, 200);
      const o = await order('pi_d1');
      assert.equal(o?.status, 'disputed');
      assert.equal(o?.statusBeforeDispute, 'shipped');
      assert.ok(o?.disputedAt);
      assert.equal((await sellerDisputeNotes()).length, 1);
      assert.equal(pushes.length, 1);
      assert.equal(pushes[0][0].to, 'ExponentPushToken[dev]');
      assert.equal(pushes[0][0].title, 'Payment disputed');
    });

    it('handles a repeated dispute event once', async () => {
      await send(dispute('created'));
      await send(dispute('created'));
      assert.equal((await sellerDisputeNotes()).length, 1);
      assert.equal(pushes.length, 1);
    });

    it('finds the order through the charge when the dispute has no payment intent', async () => {
      chargePaymentIntent = 'pi_d1';
      await send(dispute('created', { payment_intent: null }));
      assert.equal((await order('pi_d1'))?.status, 'disputed');
    });

    it('puts the order back when the dispute is won', async () => {
      await send(dispute('created'));
      await send(dispute('closed', { status: 'won' }));
      const o = await order('pi_d1');
      assert.equal(o?.status, 'shipped');
      assert.equal(o?.disputeOutcome, 'won');
    });

    it('keeps a lost dispute flagged and alerts the developer again', async () => {
      await send(dispute('created'));
      pushes.length = 0;
      await send(dispute('closed', { status: 'lost' }));
      const o = await order('pi_d1');
      assert.equal(o?.status, 'disputed');
      assert.equal(o?.disputeOutcome, 'lost');
      assert.equal(pushes.length, 1);
      assert.equal(pushes[0][0].title, 'Dispute lost');
    });

    it('ignores closing statuses that do not move money and disputes on unknown orders', async () => {
      await send(dispute('created'));
      await send(dispute('closed', { status: 'warning_closed' }));
      assert.equal((await order('pi_d1'))?.status, 'disputed');
      const reply = await send(dispute('created', { payment_intent: 'pi_unknown' }));
      assert.equal(reply.status, 200);
      assert.equal(await order('pi_unknown'), undefined);
    });

    it('lets a refund after a lost dispute complete', async () => {
      await send(dispute('created'));
      await send(dispute('closed', { status: 'lost' }));
      await send(chargeRefunded('pi_d1'));
      assert.equal((await order('pi_d1'))?.status, 'refunded');
    });
  });
});
