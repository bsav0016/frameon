import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findIncompatible, findUnsupportedByApp } from './compat.mjs';

const contract = { orderStatuses: ['paid', 'shipped'], notificationTypes: ['rating', 'order_shipped'] };

describe('deploy compatibility', () => {
  it('passes when the backend writes only what the app understands', () => {
    assert.deepEqual(findIncompatible({ contract, backend: { orderStatuses: ['paid'], notificationTypes: ['rating', 'order_shipped'] } }), []);
  });

  it('blocks a new order status or notification type the app does not know', () => {
    const problems = findIncompatible({
      contract,
      backend: { orderStatuses: ['paid', 'shipped', 'disputed'], notificationTypes: ['rating', 'order_disputed'] },
    });
    assert.equal(problems.length, 2);
    assert.match(problems[0], /order status "disputed"/);
    assert.match(problems[1], /notification type "order_disputed"/);
  });

  it('flags a contract that promises more than the app source handles', () => {
    assert.deepEqual(findUnsupportedByApp({ contract, app: { orderStatuses: ['paid', 'shipped'], notificationTypes: ['rating', 'order_shipped'] } }), []);
    const problems = findUnsupportedByApp({ contract, app: { orderStatuses: ['paid'], notificationTypes: ['rating', 'order_shipped'] } });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /"shipped"/);
  });
});
