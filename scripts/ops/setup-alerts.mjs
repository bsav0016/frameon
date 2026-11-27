// Sets up alerting, point-in-time recovery, daily backups and a billing budget.
// Safe to re-run: anything that already exists is skipped. Prints what it would do unless --apply is given.
//
//   node scripts/ops/setup-alerts.mjs --project frameonnew --email you@example.com \
//     --billing-account 000000-AAAAAA-BBBBBB --budget 25 [--apply]
//
// Needs the gcloud CLI, signed in (the active account) as someone who may edit monitoring, billing budgets and Firestore.
// It uses only commands every gcloud install has: no alpha or beta components. Notification channels go through
// the Monitoring REST API with gcloud's access token.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { ALERTS, BUDGET_NAME, CHANNEL_NAME, backupScheduleArgs, budgetArgs, pitrArgs, policyJson } from './plan.mjs';

const { values: a } = parseArgs({
  options: {
    project: { type: 'string' },
    email: { type: 'string' },
    'billing-account': { type: 'string' },
    budget: { type: 'string' },
    apply: { type: 'boolean', default: false },
  },
});
for (const k of ['project', 'email', 'billing-account', 'budget']) {
  if (!a[k]) {
    console.error(`Missing --${k}. See the comment at the top of this file.`);
    process.exit(2);
  }
}

const gcloud = (args) => {
  const r = spawnSync('gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.error) throw new Error(`could not run gcloud: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`gcloud ${args.slice(0, 4).join(' ')} failed:\n${r.stderr}`);
  return r.stdout;
};
const json = (args) => JSON.parse(gcloud([...args, '--format=json', `--project=${a.project}`]) || 'null');
const say = (s) => console.log(a.apply ? s : `[dry run] ${s}`);
const run = (args) => {
  if (a.apply) gcloud(args);
};

// 1. Email channel (the gcloud command group for channels is not generally available, so use the REST API)
const api = async (method, body) => {
  const token = gcloud(['auth', 'print-access-token']).trim();
  const res = await fetch(`https://monitoring.googleapis.com/v3/projects/${a.project}/notificationChannels`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': a.project, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Monitoring API ${method} failed (${res.status}): ${await res.text()}`);
  return res.json();
};
let channel = ((await api('GET')).notificationChannels ?? []).find((c) => c.displayName === CHANNEL_NAME);
if (channel) say(`channel exists: ${CHANNEL_NAME}`);
else {
  say(`create email channel ${CHANNEL_NAME} -> ${a.email}`);
  if (a.apply) channel = await api('POST', { type: 'email', displayName: CHANNEL_NAME, labels: { email_address: a.email } });
}

// 2. Log-match alert policies
const existing = new Set((json(['monitoring', 'policies', 'list']) ?? []).map((p) => p.displayName));
const dir = mkdtempSync(join(tmpdir(), 'frameon-ops-'));
ALERTS.forEach((alert, i) => {
  if (existing.has(alert.name)) return say(`alert exists: ${alert.name}`);
  say(`create alert: ${alert.name}`);
  if (!a.apply) return;
  const file = join(dir, `policy-${i}.json`);
  writeFileSync(file, JSON.stringify(policyJson(alert, channel.name), null, 2));
  gcloud(['monitoring', 'policies', 'create', `--policy-from-file=${file}`, `--project=${a.project}`]);
});

// 3. Budget
const budgets = JSON.parse(gcloud(['billing', 'budgets', 'list', `--billing-account=${a['billing-account']}`, '--format=json']) || '[]');
if (budgets.some((b) => b.displayName === BUDGET_NAME)) say(`budget exists: ${BUDGET_NAME}`);
else {
  say(`create budget ${BUDGET_NAME}: ${a.budget} USD per month, emails at 50%, 90%, 100%`);
  run(budgetArgs(a['billing-account'], a.budget));
}

// 4. Point-in-time recovery (restore to any second in the last 7 days) and a daily backup kept 14 days
const db = json(['firestore', 'databases', 'describe', '--database=(default)']);
if (db?.pointInTimeRecoveryEnablement === 'POINT_IN_TIME_RECOVERY_ENABLED') say('point-in-time recovery already on');
else {
  say('enable point-in-time recovery');
  run(pitrArgs(a.project));
}
const schedules = json(['firestore', 'backups', 'schedules', 'list', '--database=(default)']) ?? [];
if (schedules.length) say('a backup schedule already exists');
else {
  say('create daily backup schedule, kept 14 days');
  run(backupScheduleArgs(a.project));
}
if (!a.apply) console.log('\nNothing was changed. Re-run with --apply to make these changes.');
