import contract from '../../../compat/app-contract.json';
import { NOTIFICATION_TYPES, ORDER_STATUSES, orderSchema } from '../models';

// The real firebase/firestore build is ESM that jest does not transform; the schema only needs Timestamp.toDate().
jest.mock('firebase/firestore', () => {
  class Timestamp {
    date: Date;
    constructor(d: Date) {
      this.date = d;
    }
    static fromDate(d: Date) {
      return new Timestamp(d);
    }
    toDate() {
      return this.date;
    }
  }
  return { Timestamp };
});
// eslint-disable-next-line import/first
import { Timestamp } from 'firebase/firestore';

const base = {
  postId: 'p1',
  postImageURL: 'https://img/1.jpg',
  buyerUid: 'b',
  buyerUsername: 'pat',
  sellerUid: 's',
  amountCents: 4500,
  shippingAddress: { name: 'Pat', line1: '1 Main St', line2: '', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  createdAt: Timestamp.fromDate(new Date('2026-11-01T00:00:00Z')),
};

describe('orderSchema', () => {
  it('still reads an order written before shipping existed', () => {
    const order = orderSchema.parse({ ...base, status: 'paid' });
    expect(order.carrier).toBeNull();
    expect(order.trackingNumber).toBeNull();
    expect(order.shippedAt).toBeNull();
    expect(order.deliveredAt).toBeNull();
  });

  it('reads every lifecycle status', () => {
    for (const status of ORDER_STATUSES) expect(orderSchema.parse({ ...base, status }).status).toBe(status);
  });

  it('reads tracking and shipping dates', () => {
    const order = orderSchema.parse({
      ...base,
      status: 'shipped',
      carrier: 'USPS',
      trackingNumber: '9400111899223197428490',
      shippedAt: Timestamp.fromDate(new Date('2026-11-02T12:00:00Z')),
    });
    expect(order.carrier).toBe('USPS');
    expect(order.shippedAt?.toISOString()).toBe('2026-11-02T12:00:00.000Z');
    expect(order.deliveredAt).toBeNull();
  });

  it('rejects an unknown status', () => {
    expect(orderSchema.safeParse({ ...base, status: 'lost-in-space' }).success).toBe(false);
  });
});

describe('deploy contract', () => {
  it('never promises more than the app handles', () => {
    for (const status of contract.orderStatuses) expect(ORDER_STATUSES).toContain(status);
    for (const type of contract.notificationTypes) expect(NOTIFICATION_TYPES).toContain(type);
  });
});
