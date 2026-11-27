// What the operations setup creates, as plain data so it can be tested without Google Cloud.

/** Cloud Functions v2 run as Cloud Run services named after the function, lower-cased. */
export const serviceName = (fn) => fn.toLowerCase();

const isService = (fns) => fns.map((f) => `resource.labels.service_name="${serviceName(f)}"`).join(' OR ');
const errorsFrom = (fns) => `resource.type="cloud_run_revision" AND (${isService(fns)}) AND severity>=ERROR`;

const MONEY_PATHS = ['stripeWebhook'];
const ORDER_PATHS = ['markOrderShipped', 'confirmDelivery', 'autoCompleteOrders'];

/** One alert per area, so the email says what broke. */
export const ALERTS = [
  {
    name: 'FrameOn: payment webhook error',
    doc: 'stripeWebhook logged an error. Stripe retries, but a handler that keeps failing after a charge can leave an order unrecorded. Check the function logs, then the Stripe dashboard (Developers, Webhooks) for failed deliveries.',
    filter: errorsFrom(MONEY_PATHS),
  },
  {
    name: 'FrameOn: order callable or scheduler error',
    doc: 'markOrderShipped, confirmDelivery or the daily autoCompleteOrders job logged an error. Shipped orders may not be completing.',
    filter: errorsFrom(ORDER_PATHS),
  },
  {
    name: 'FrameOn: any other function error',
    doc: 'A Cloud Function logged an error (moderation, push, account deletion, counters). Open the logs for the service named in the alert.',
    filter: `resource.type="cloud_run_revision" AND severity>=ERROR AND NOT (${isService([...MONEY_PATHS, ...ORDER_PATHS])})`,
  },
];

/** Body for `gcloud alpha monitoring policies create --policy-from-file`. */
export function policyJson(alert, channelName) {
  return {
    displayName: alert.name,
    combiner: 'OR',
    conditions: [{ displayName: alert.name, conditionMatchedLog: { filter: alert.filter } }],
    alertStrategy: { notificationRateLimit: { period: '3600s' }, autoClose: '86400s' },
    notificationChannels: [channelName],
    documentation: { content: alert.doc, mimeType: 'text/markdown' },
  };
}

export const CHANNEL_NAME = 'FrameOn alerts (email)';
export const BUDGET_NAME = 'FrameOn monthly budget';
export const BACKUP_RETENTION = '14d';
export const BUDGET_THRESHOLDS = [0.5, 0.9, 1.0];

export const budgetArgs = (billingAccount, amountUsd) => [
  'billing', 'budgets', 'create',
  `--billing-account=${billingAccount}`,
  `--display-name=${BUDGET_NAME}`,
  `--budget-amount=${amountUsd}USD`,
  ...BUDGET_THRESHOLDS.map((t) => `--threshold-rule=percent=${t}`),
];

export const pitrArgs = (project) => ['firestore', 'databases', 'update', '--database=(default)', '--enable-pitr', `--project=${project}`];

export const backupScheduleArgs = (project) => [
  'firestore', 'backups', 'schedules', 'create',
  '--database=(default)', '--recurrence=daily', `--retention=${BACKUP_RETENTION}`, `--project=${project}`,
];
