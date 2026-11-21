import type { Order } from './models';

/** Pure helpers for the Orders screen. The server (functions/src/orderLogic.ts) is the authority on what is allowed. */

export const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other'] as const;

export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  paid: 'Paid, waiting to ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

/** A public tracking page for the carrier, or null when there is no reliable one ("Other"). */
export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const n = encodeURIComponent(trackingNumber.replace(/\s+/g, ''));
  switch (carrier) {
    case 'USPS':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case 'UPS':
      return `https://www.ups.com/track?tracknum=${n}`;
    case 'FedEx':
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case 'DHL':
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    default:
      return null;
  }
}

/** Mirrors the server rule (4 to 40 letters, numbers, spaces or dashes) so people get the message before a round trip. */
export function trackingProblem(value: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(value.trim()) ? null : 'Enter the tracking number: 4 to 40 letters, numbers, spaces or dashes.';
}

export type OrderAction = 'ship' | 'confirmDelivery';

/** Which button an order offers to this person right now. */
export function orderAction(order: Pick<Order, 'status'>, role: 'buyer' | 'seller'): OrderAction | null {
  if (role === 'seller' && order.status === 'paid') return 'ship';
  if (role === 'buyer' && order.status === 'shipped') return 'confirmDelivery';
  return null;
}
