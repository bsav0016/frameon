// The deploy-order rule from docs/release-checklist.md as a function: the backend may only write values the
// installed apps understand (installed builds drop orders and notifications whose status or type they do not know).

const KEYS = [
  ['orderStatuses', 'order status'],
  ['notificationTypes', 'notification type'],
];

/** Values the backend can write that the supported app does not understand, as readable messages. */
export function findIncompatible({ contract, backend }) {
  const problems = [];
  for (const [key, label] of KEYS) {
    const known = new Set(contract[key]);
    for (const value of backend[key]) {
      if (!known.has(value)) problems.push(`The backend can write ${label} "${value}", which the supported app does not understand.`);
    }
  }
  return problems;
}

/** Values the contract promises that the app source no longer handles (the contract must never claim more than the app does). */
export function findUnsupportedByApp({ contract, app }) {
  const problems = [];
  for (const [key] of KEYS) {
    const known = new Set(app[key]);
    for (const value of contract[key]) {
      if (!known.has(value)) problems.push(`compat/app-contract.json lists "${value}" (${key}), but the app source does not handle it.`);
    }
  }
  return problems;
}
