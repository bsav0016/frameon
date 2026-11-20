// What Stripe's refund and dispute events do to an order. The legal moves come from orderLogic; this file
// applies them to Firestore inside transactions and tells the people involved. Every handler is safe to
// run twice, because Stripe retries webhooks and reports a refund that follows a dispute as a second event.
import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

import { alertModerator } from './alerts';
import { nextOrderState, type OrderEvent, type OrderState, type Transition } from './orderLogic';

const db = getFirestore();

/** The stored order fields this file reads, on top of what orderLogic needs. */
interface OrderDoc extends OrderState {
  postId: string;
}

// Orders that still entitle a buyer to review the seller.
const LIVE: string[] = ['paid', 'shipped', 'delivered', 'disputed'];

function apply(tx: Transaction, ref: FirebaseFirestore.DocumentReference, t: Extract<Transition, { kind: 'update' }>) {
  tx.update(ref, { ...t.update, ...(t.stamp ? { [t.stamp]: FieldValue.serverTimestamp() } : {}) });
}

async function usernameOf(uid: string): Promise<string> {
  return ((await db.doc(`profiles/${uid}`).get()).data()?.username as string | undefined) ?? 'someone';
}

type OrderNotice = 'order_refunded' | 'order_disputed';

async function notifyOrder(type: OrderNotice, toUid: string, fromUid: string, order: { postId: string }, orderId: string) {
  const [post, fromUsername] = await Promise.all([db.doc(`posts/${order.postId}`).get(), usernameOf(fromUid)]);
  await db.collection(`notifications/${toUid}/items`).add({
    type,
    fromUid,
    fromUsername,
    fromPhotoURL: null,
    postId: order.postId,
    postImageURL: (post.data()?.imageURL as string | undefined) ?? null,
    stars: null,
    orderId,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Full refund of an order: mark it refunded, put an unshipped piece back in stock, take away the buyer's
 * right to review the seller unless they have another live order with them, and tell both sides.
 * A piece that already shipped is not restocked, because the seller may have sent it.
 */
export async function refundOrder(orderId: string): Promise<'refunded' | 'ignored'> {
  const orderRef = db.doc(`orders/${orderId}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return null;
    const order = snap.data() as OrderDoc & { buyerUid: string; sellerUid: string };
    const t = nextOrderState(order, { type: 'refund' });
    if (t.kind !== 'update') return null;

    const postRef = db.doc(`posts/${order.postId}`);
    const [post, pair] = await Promise.all([
      tx.get(postRef),
      tx.get(db.collection('orders').where('buyerUid', '==', order.buyerUid).where('sellerUid', '==', order.sellerUid)),
    ]);
    const hasOtherLiveOrder = pair.docs.some((d) => d.id !== orderId && LIVE.includes(d.data().status));
    const restock = order.status === 'paid' && post.exists;

    apply(tx, orderRef, t);
    if (restock) tx.update(postRef, { quantity: FieldValue.increment(1) });
    if (!hasOtherLiveOrder) tx.delete(db.doc(`purchases/${order.sellerUid}_${order.buyerUid}`));
    return { order, restock };
  });
  if (!result) return 'ignored';

  const { order } = result;
  await Promise.all([
    notifyOrder('order_refunded', order.buyerUid, order.sellerUid, order, orderId),
    notifyOrder('order_refunded', order.sellerUid, order.buyerUid, order, orderId),
  ]);
  logger.info('order refunded', { orderId, restocked: result.restock });
  return 'refunded';
}

async function transitionOrder(orderId: string, event: OrderEvent) {
  const orderRef = db.doc(`orders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return null;
    const order = snap.data() as OrderDoc & { buyerUid: string; sellerUid: string };
    const t = nextOrderState(order, event);
    if (t.kind !== 'update') return null;
    apply(tx, orderRef, t);
    return order;
  });
}

/** A buyer disputed the charge: flag the order, tell the seller and alert the developer, who must answer in Stripe. */
export async function disputeOpened(orderId: string, reason: string): Promise<'flagged' | 'ignored'> {
  const order = await transitionOrder(orderId, { type: 'disputeOpened' });
  if (!order) return 'ignored';
  await notifyOrder('order_disputed', order.sellerUid, order.buyerUid, order, orderId);
  await alertModerator('Payment disputed', `Order ${orderId} was disputed (${reason}). Respond in the Stripe dashboard before the deadline.`, { type: 'dispute', orderId });
  return 'flagged';
}

/** The dispute ended. Won puts the order back where it was; lost leaves it disputed with the outcome recorded. */
export async function disputeClosed(orderId: string, won: boolean): Promise<'closed' | 'ignored'> {
  const order = await transitionOrder(orderId, { type: 'disputeClosed', won });
  if (!order) return 'ignored';
  if (!won) await alertModerator('Dispute lost', `Order ${orderId}: the dispute was lost and the funds were withdrawn.`, { type: 'dispute', orderId });
  return 'closed';
}
