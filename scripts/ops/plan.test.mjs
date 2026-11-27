import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALERTS, backupScheduleArgs, budgetArgs, pitrArgs, policyJson, serviceName } from './plan.mjs';

describe('ops plan', () => {
  it('names Cloud Run services the way Cloud Functions v2 does', () => {
    assert.equal(serviceName('stripeWebhook'), 'stripewebhook');
    assert.equal(serviceName('autoCompleteOrders'), 'autocompleteorders');
  });

  it('watches the money paths by service and keeps the catch-all disjoint', () => {
    const [webhook, orders, rest] = ALERTS;
    assert.match(webhook.filter, /service_name="stripewebhook"/);
    for (const fn of ['markordershipped', 'confirmdelivery', 'autocompleteorders']) assert.match(orders.filter, new RegExp(`service_name="${fn}"`));
    for (const alert of ALERTS) assert.match(alert.filter, /severity>=ERROR/);
    assert.match(rest.filter, /NOT \(/);
    assert.match(rest.filter, /service_name="stripewebhook"/);
    assert.match(rest.filter, /service_name="autocompleteorders"/);
  });

  it('builds a log-match policy that emails once an hour at most', () => {
    const p = policyJson(ALERTS[0], 'projects/p/notificationChannels/1');
    assert.deepEqual(p.notificationChannels, ['projects/p/notificationChannels/1']);
    assert.equal(p.conditions[0].conditionMatchedLog.filter, ALERTS[0].filter);
    assert.equal(p.alertStrategy.notificationRateLimit.period, '3600s');
    assert.ok(p.documentation.content.length > 20);
  });

  it('builds the budget, recovery and backup commands', () => {
    const budget = budgetArgs('0000-AAAA-BBBB', 25);
    assert.ok(budget.includes('--budget-amount=25USD'));
    assert.equal(budget.filter((a) => a.startsWith('--threshold-rule')).length, 3);
    assert.ok(pitrArgs('frameonnew').includes('--enable-pitr'));
    assert.ok(backupScheduleArgs('frameonnew').includes('--recurrence=daily'));
  });
});
