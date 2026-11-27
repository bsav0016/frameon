# Operations

What watches the live backend (Firebase project `frameonnew`) and how to recover from a bad day. Nothing here runs by itself: the setup script below has to be run once by someone with Google Cloud access.

## What is set up

`scripts/ops/setup-alerts.mjs` creates, and skips whatever already exists:

| What | Why |
| --- | --- |
| Email notification channel | Where alerts go. Email is deliberate: a push alert needs the app and the Expo service to be healthy, which is not a given when something is wrong. |
| Alert: payment webhook error | `stripeWebhook` logged an error. Stripe retries, but a handler that keeps failing after a charge leaves an order unrecorded. |
| Alert: order callable or scheduler error | `markOrderShipped`, `confirmDelivery` or the daily `autoCompleteOrders` job failed. |
| Alert: any other function error | Everything else at ERROR severity (moderation, push, account deletion, counters). |
| Monthly budget | Emails at 50%, 90% and 100% of the amount you choose. Alerts only; it does not stop spending. |
| Point-in-time recovery | Restore Firestore to any second in the last 7 days. |
| Daily backup, kept 14 days | A restorable copy for longer than 7 days back. |

Each alert is a log match: it fires when a matching ERROR line is written, at most one email an hour, and closes itself after a day. The services are named after the functions, lower-cased (Cloud Functions v2 runs on Cloud Run).

## Run it

You need the [gcloud CLI](https://cloud.google.com/sdk/docs/install), signed in (`gcloud auth login`) as an owner of the project, and the ID of the billing account (Google Cloud console, Billing).

```
node scripts/ops/setup-alerts.mjs --project frameonnew --email you@example.com --billing-account 000000-AAAAAA-BBBBBB --budget 25
```

That only prints what it would do. Add `--apply` to make the changes. It is safe to run again.

The `monitoring.googleapis.com`, `billingbudgets.googleapis.com` and `firestore.googleapis.com` APIs must be enabled; gcloud offers to enable them.

## Check that an alert reaches you

Alerts that have never fired are untested. After running the script, write a fake error that looks like one from the webhook, and expect an email within a few minutes:

```
gcloud logging write frameon-alert-test "alert test, ignore" --severity=ERROR --monitored-resource-type=cloud_run_revision --monitored-resource-labels=service_name=stripewebhook,revision_name=test,location=us-central1,configuration_name=test --project=frameonnew
```

If nothing arrives, check the channel is verified (Monitoring, Alerting, Edit notification channels) and that the email did not land in spam.

## Restore

Point-in-time (a mistake in the last 7 days): restore into a **new** database, check it, then copy data back or switch over. Never restore over the live one.

```
gcloud firestore databases clone --source-database="projects/frameonnew/databases/(default)" --snapshot-time=2026-12-01T10:00:00Z --destination-database=restore-check --project=frameonnew
```

From a daily backup (older): `gcloud firestore backups list --project=frameonnew`, then `gcloud firestore databases restore --source-backup=<backup resource name> --destination-database=restore-check --project=frameonnew`.

Do a drill once: restore into `restore-check`, open it in the Firebase console and confirm orders and profiles are there, then delete it (`gcloud firestore databases delete --database=restore-check`). A backup nobody has restored is a guess.

Storage (photos) has no backup here. Deleting a post deletes its photo on purpose.

## When an alert fires

1. Open the log link in the email, or `gcloud functions logs read <function> --project=frameonnew --limit=50`.
2. Payment webhook: also open Stripe, Developers, Webhooks, and look for failed deliveries. Stripe retries for days; fix the cause and the retries land. `docs/release-checklist.md` has the order flow to verify afterwards.
3. Scheduler: shipped orders stay shipped until the next daily run completes them; nothing is lost.
4. Budget: open Billing, Reports, and filter by service to find the cause before raising the limit.
