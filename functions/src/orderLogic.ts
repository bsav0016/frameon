// The order lifecycle as a pure function, so the Stripe webhook, the callables and the scheduler all
// agree on which changes are legal and tests need no Firestore. Nothing here touches the network.
//
//   paid ──ship──▶ shipped ──deliver──▶ delivered
//     │               │                     │
//     └───────────────┴──── refund ─────────┴──▶ refunded
//     └─────────── dispute opened ──▶ disputed ──won──▶ back to the status before
//                                                └─lost─▶ stays disputed, outcome "lost"

export const ORDER_STATUSES = ['paid', 'shipped', 'delivered', 'refunded', 'disputed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'] as const;
export type Carrier = (typeof CARRIERS)[number];

/** The fields of an order this logic reads. */
export interface OrderState {
  status: OrderStatus;
  buyerUid: string;
  sellerUid: string;
  /** Set while disputed, so a won dispute can restore it. */
  statusBeforeDispute?: OrderStatus | null;
}

export type OrderEvent =
  | { type: 'ship'; actorUid: string; carrier: string; trackingNumber: string }
  | { type: 'confirmDelivery'; actorUid: string }
  | { type: 'autoDeliver' }
  | { type: 'refund' }
  | { type: 'disputeOpened' }
  | { type: 'disputeClosed'; won: boolean };

/** `update` holds the fields to merge into the order; timestamps are added by the caller. */
export type Transition =
  | { kind: 'update'; update: Record<string, unknown>; stamp?: 'shippedAt' | 'deliveredAt' | 'refundedAt' | 'disputedAt' }
  | { kind: 'noop' }
  | { kind: 'rejected'; reason: string };

const rejected = (reason: string): Transition => ({ kind: 'rejected', reason });
const NOOP: Transition = { kind: 'noop' };

export function cleanTracking(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(t) ? t : null;
}

export function nextOrderState(order: OrderState, event: OrderEvent): Transition {
  const { status } = order;
  switch (event.type) {
    case 'ship': {
      if (event.actorUid !== order.sellerUid) return rejected('Only the seller can mark an order shipped.');
      const carrier = CARRIERS.find((c) => c === event.carrier);
      if (!carrier) return rejected('Choose a carrier.');
      const trackingNumber = cleanTracking(event.trackingNumber);
      if (!trackingNumber) return rejected('Enter a tracking number of 4 to 40 letters, numbers, spaces or dashes.');
      if (status !== 'paid') return rejected(status === 'shipped' || status === 'delivered' ? 'This order was already marked shipped.' : 'This order cannot be shipped.');
      return { kind: 'update', update: { status: 'shipped', carrier, trackingNumber }, stamp: 'shippedAt' };
    }
    case 'confirmDelivery': {
      if (event.actorUid !== order.buyerUid) return rejected('Only the buyer can confirm delivery.');
      if (status === 'delivered') return NOOP;
      if (status !== 'shipped') return rejected('This order has not been shipped yet.');
      return { kind: 'update', update: { status: 'delivered' }, stamp: 'deliveredAt' };
    }
    case 'autoDeliver':
      // The scheduler asks about every shipped order, so anything else is simply not its business.
      return status === 'shipped' ? { kind: 'update', update: { status: 'delivered', deliveredBy: 'auto' }, stamp: 'deliveredAt' } : NOOP;
    case 'refund':
      // Stripe retries and also reports refunds that follow a dispute, so repeats are normal.
      if (status === 'refunded') return NOOP;
      return { kind: 'update', update: { status: 'refunded' }, stamp: 'refundedAt' };
    case 'disputeOpened':
      if (status === 'disputed' || status === 'refunded') return NOOP;
      return { kind: 'update', update: { status: 'disputed', statusBeforeDispute: status, disputeOutcome: null }, stamp: 'disputedAt' };
    case 'disputeClosed': {
      if (status !== 'disputed') return NOOP;
      if (!event.won) return { kind: 'update', update: { disputeOutcome: 'lost' } };
      return { kind: 'update', update: { status: order.statusBeforeDispute ?? 'paid', statusBeforeDispute: null, disputeOutcome: 'won' } };
    }
  }
}
