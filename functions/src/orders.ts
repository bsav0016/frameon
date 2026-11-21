import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

import { autoCompleteShippedOrders, confirmOrderDelivery, shipOrder } from './orderEvents';

// Callables are reachable by any client; authorization (seller or buyer of that order) happens inside.
const opts = { region: 'us-central1', maxInstances: 20, invoker: 'public' as const };

function requireUid(auth: { uid: string } | undefined): string {
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return auth.uid;
}

function orderIdOf(data: unknown): string {
  const id = (data as { orderId?: unknown } | undefined)?.orderId;
  if (typeof id !== 'string' || id.length === 0 || id.length > 100 || id.includes('/')) throw new HttpsError('invalid-argument', 'Invalid order.');
  return id;
}

/** The seller says the piece is on its way. The buyer is notified. */
export const markOrderShipped = onCall(opts, async (req) => {
  const uid = requireUid(req.auth);
  await shipOrder(uid, orderIdOf(req.data), req.data?.carrier, req.data?.trackingNumber);
  return { ok: true };
});

/** The buyer confirms the piece arrived. The seller is notified. */
export const confirmDelivery = onCall(opts, async (req) => {
  const uid = requireUid(req.auth);
  await confirmOrderDelivery(uid, orderIdOf(req.data));
  return { ok: true };
});

/** Shipped orders the buyer never confirmed count as delivered after AUTO_DELIVER_DAYS. */
export const autoCompleteOrders = onSchedule({ region: 'us-central1', schedule: 'every day 09:00', timeZone: 'America/Chicago' }, async () => {
  const completed = await autoCompleteShippedOrders();
  logger.info('auto-completed shipped orders', { completed });
});
