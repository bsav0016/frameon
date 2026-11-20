import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanTracking, nextOrderState, ORDER_STATUSES, type OrderEvent, type OrderState, type OrderStatus } from './orderLogic';

const order = (status: OrderStatus, extra: Partial<OrderState> = {}): OrderState => ({ status, buyerUid: 'buyer', sellerUid: 'seller', ...extra });
const ship = (actorUid = 'seller', over: Partial<Extract<OrderEvent, { type: 'ship' }>> = {}): OrderEvent => ({
  type: 'ship',
  actorUid,
  carrier: 'USPS',
  trackingNumber: '9400 1000 0000 0000 0000 00',
  ...over,
});

describe('ship', () => {
  it('moves a paid order to shipped with carrier and trimmed tracking', () => {
    const t = nextOrderState(order('paid'), ship('seller', { trackingNumber: '  1Z999AA10123456784 ' }));
    assert.deepEqual(t, { kind: 'update', update: { status: 'shipped', carrier: 'USPS', trackingNumber: '1Z999AA10123456784' }, stamp: 'shippedAt' });
  });

  it('is only for the seller', () => {
    assert.equal(nextOrderState(order('paid'), ship('buyer')).kind, 'rejected');
    assert.equal(nextOrderState(order('paid'), ship('someone')).kind, 'rejected');
  });

  it('needs a known carrier and a plausible tracking number', () => {
    assert.equal(nextOrderState(order('paid'), ship('seller', { carrier: 'Pigeon' })).kind, 'rejected');
    for (const bad of ['', '   ', 'abc', 'x'.repeat(41), '12 34; DROP', '<b>1234</b>']) {
      assert.equal(nextOrderState(order('paid'), ship('seller', { trackingNumber: bad })).kind, 'rejected', bad);
    }
  });

  it('cannot ship twice or from any state but paid', () => {
    for (const status of ORDER_STATUSES.filter((s) => s !== 'paid')) {
      assert.equal(nextOrderState(order(status), ship()).kind, 'rejected', status);
    }
  });
});

describe('confirmDelivery', () => {
  it('moves shipped to delivered for the buyer', () => {
    assert.deepEqual(nextOrderState(order('shipped'), { type: 'confirmDelivery', actorUid: 'buyer' }), {
      kind: 'update',
      update: { status: 'delivered' },
      stamp: 'deliveredAt',
    });
  });

  it('is only for the buyer, and only after shipping', () => {
    assert.equal(nextOrderState(order('shipped'), { type: 'confirmDelivery', actorUid: 'seller' }).kind, 'rejected');
    for (const status of ['paid', 'refunded', 'disputed'] as const) {
      assert.equal(nextOrderState(order(status), { type: 'confirmDelivery', actorUid: 'buyer' }).kind, 'rejected', status);
    }
  });

  it('is a no-op when already delivered', () => {
    assert.equal(nextOrderState(order('delivered'), { type: 'confirmDelivery', actorUid: 'buyer' }).kind, 'noop');
  });
});

describe('autoDeliver', () => {
  it('delivers shipped orders only and records that it was automatic', () => {
    assert.deepEqual(nextOrderState(order('shipped'), { type: 'autoDeliver' }), {
      kind: 'update',
      update: { status: 'delivered', deliveredBy: 'auto' },
      stamp: 'deliveredAt',
    });
    for (const status of ['paid', 'delivered', 'refunded', 'disputed'] as const) {
      assert.equal(nextOrderState(order(status), { type: 'autoDeliver' }).kind, 'noop', status);
    }
  });
});

describe('refund', () => {
  it('refunds an order from any live state', () => {
    for (const status of ['paid', 'shipped', 'delivered', 'disputed'] as const) {
      assert.deepEqual(nextOrderState(order(status), { type: 'refund' }), { kind: 'update', update: { status: 'refunded' }, stamp: 'refundedAt' }, status);
    }
  });

  it('is idempotent', () => {
    assert.equal(nextOrderState(order('refunded'), { type: 'refund' }).kind, 'noop');
  });
});

describe('disputes', () => {
  it('opening remembers the status to return to', () => {
    for (const status of ['paid', 'shipped', 'delivered'] as const) {
      assert.deepEqual(nextOrderState(order(status), { type: 'disputeOpened' }), {
        kind: 'update',
        update: { status: 'disputed', statusBeforeDispute: status, disputeOutcome: null },
        stamp: 'disputedAt',
      });
    }
  });

  it('does not reopen a disputed order and does not override a refund', () => {
    assert.equal(nextOrderState(order('disputed', { statusBeforeDispute: 'shipped' }), { type: 'disputeOpened' }).kind, 'noop');
    assert.equal(nextOrderState(order('refunded'), { type: 'disputeOpened' }).kind, 'noop');
  });

  it('a won dispute restores the earlier status', () => {
    assert.deepEqual(nextOrderState(order('disputed', { statusBeforeDispute: 'shipped' }), { type: 'disputeClosed', won: true }), {
      kind: 'update',
      update: { status: 'shipped', statusBeforeDispute: null, disputeOutcome: 'won' },
    });
    // Defensive: an order disputed before this field existed falls back to paid.
    const restored = nextOrderState(order('disputed'), { type: 'disputeClosed', won: true });
    assert.equal(restored.kind === 'update' && restored.update.status, 'paid');
  });

  it('a lost dispute stays disputed and records the outcome', () => {
    assert.deepEqual(nextOrderState(order('disputed', { statusBeforeDispute: 'paid' }), { type: 'disputeClosed', won: false }), {
      kind: 'update',
      update: { disputeOutcome: 'lost' },
    });
  });

  it('closing an order that is not disputed does nothing', () => {
    for (const status of ['paid', 'shipped', 'delivered', 'refunded'] as const) {
      assert.equal(nextOrderState(order(status), { type: 'disputeClosed', won: true }).kind, 'noop', status);
    }
  });
});

describe('cleanTracking', () => {
  it('accepts common carrier formats', () => {
    for (const ok of ['9400111899223197428490', '1Z999AA10123456784', '1234 5678 9012', 'ABC-123-456']) assert.equal(cleanTracking(ok), ok);
  });

  it('rejects non-strings', () => {
    assert.equal(cleanTracking(undefined), null);
    assert.equal(cleanTracking(12345678), null);
  });
});
