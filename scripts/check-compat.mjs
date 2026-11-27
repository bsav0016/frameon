// Run after `npm run build --prefix functions`. Exits 1 when the backend would write a value the supported app cannot read.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { findIncompatible } from './compat.mjs';

const require = createRequire(import.meta.url);
const contract = JSON.parse(readFileSync(new URL('../compat/app-contract.json', import.meta.url), 'utf8'));
const { ORDER_STATUSES, NOTIFICATION_TYPES } = require('../functions/lib/contract.js');

const problems = findIncompatible({ contract, backend: { orderStatuses: ORDER_STATUSES, notificationTypes: NOTIFICATION_TYPES } });
if (problems.length) {
  console.error(problems.join('\n'));
  console.error('\nShip the app change first (store release or over-the-air update), add the value to compat/app-contract.json, then deploy.');
  process.exit(1);
}
console.log(`Backend and supported app agree: ${ORDER_STATUSES.length} order statuses, ${NOTIFICATION_TYPES.length} notification types.`);
