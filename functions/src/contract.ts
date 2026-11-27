// What the backend can write that the app has to understand. `scripts/check-compat.mjs` compares these lists
// with compat/app-contract.json before a deploy, so adding a value here is a deliberate, ordered step:
// ship the app first, record it in the contract, then deploy.
export { ORDER_STATUSES } from './orderLogic';

export const NOTIFICATION_TYPES = [
  'rating',
  'comment',
  'follow',
  'purchase',
  'removal',
  'order_refunded',
  'order_disputed',
  'order_shipped',
  'order_delivered',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
