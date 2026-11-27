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

## Crash and error reporting (Sentry)

The app reports crashes and unexpected errors to [Sentry](https://sentry.io). It is **off** until you set it up, and it is off in development builds and on the web.

What is sent: the error and where it happened, the device model, OS and app version, and the anonymous account id (the Firebase uid). Not sent: email, name, address, photos, IP address or request details; email addresses that appear inside an error message are replaced with `[email]` before sending (`src/lib/reporting.ts`). The in-app privacy policy says this.

What counts as a report: a screen that crashes while rendering (the person sees "Something went wrong, try again"), a crash in native or JavaScript code, a failed data query that is not a normal offline or permission case, and any action that fails with the generic "Something went wrong" message (expected failures such as a taken username or no connection are not reported).

Set it up once:

1. Create a Sentry account and a React Native project. Copy its DSN (a URL; it ends up inside the app, so it is not a secret).
2. Set it for builds: `eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn> --environment production --visibility plaintext` (and `preview`).
3. For readable stack traces, give EAS builds and update publishing the upload settings: `SENTRY_ORG` and `SENTRY_PROJECT` (plaintext) and `SENTRY_AUTH_TOKEN` (a Sentry organisation token; keep it secret: `eas env:create ... --visibility secret`). The native build then uploads its source maps. `npm run update:production` uploads an update's source maps itself when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set in your shell.
4. Reporting needs a native module, so it reaches people only with a **store build** (the next version, 2.1.0); an over-the-air update to 2.0.0 cannot add it.
5. In Sentry, add an alert rule that emails you for a new issue, then crash the app once on purpose in a test build and check the report arrives with a readable stack.
6. Update the store privacy answers (see `docs/store-listing.md`) before submitting that build.

To turn it off without a new build, publish an over-the-air update with `EXPO_PUBLIC_SENTRY_DSN` unset in your shell: the DSN is read when the JavaScript is bundled, so that update starts without reporting.

## Deploying the backend (GitHub Actions)

Actions tab, **Deploy backend**, Run workflow, on `main`. It runs everything CI runs on that commit, then waits for you to approve the `production` environment, then deploys functions, Firestore rules and indexes, and Storage rules to `frameonnew`. Nothing else deploys the backend; the manual `npx firebase deploy` still works from a machine that has the two local `.env` files (`functions/.env`, `functions/.env.frameonnew`) and is the fallback.

**The app-first rule is enforced.** `compat/app-contract.json` lists the order statuses and notification types the oldest supported app build understands. Before deploying, `npm run check:compat` compares it with what the backend can write (`functions/src/contract.ts`) and stops the deploy if the backend would write anything else, because installed apps silently drop what they do not recognise. To add a new status or type:

1. Add it to the app (`src/lib/models.ts`) and to the backend (`functions/src/contract.ts`) and merge.
2. Ship the app change to people (store release or over-the-air update).
3. Add the value to `compat/app-contract.json` in its own small PR (a test checks the contract never lists something the app cannot handle).
4. Run the deploy workflow.

### One-time setup

Sign-in to Google Cloud is keyless (workload identity federation): no service account key is stored in GitHub. GitHub now puts the owner and repository **ids** in the sign-in token's subject (`repo:OWNER@OWNER_ID/REPO@REPO_ID:environment:production`), so the commands below use that form. Check yours with `gh api repos/bsav0016/frameon/actions/oidc/customization/sub` (the `sub_claim_prefix`); a condition written with the plain names is rejected with "The given credential is rejected by the attribute condition". Run these once, replacing `PROJECT_NUMBER` with the number shown on the Google Cloud console home page for `frameonnew`:

```
gcloud iam workload-identity-pools create github --location=global --project=frameonnew
gcloud iam workload-identity-pools providers create-oidc frameon-deploy --location=global --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com --attribute-mapping="google.subject=assertion.sub" --attribute-condition="assertion.sub=='repo:bsav0016@95955909/frameon@1453503861:environment:production'" --project=frameonnew
gcloud iam service-accounts create github-deployer --project=frameonnew
gcloud iam service-accounts add-iam-policy-binding github-deployer@frameonnew.iam.gserviceaccount.com --role=roles/iam.workloadIdentityUser --member="principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/subject/repo:bsav0016@95955909/frameon@1453503861:environment:production" --project=frameonnew
gcloud projects add-iam-policy-binding frameonnew --member="serviceAccount:github-deployer@frameonnew.iam.gserviceaccount.com" --role=roles/firebase.admin
gcloud projects add-iam-policy-binding frameonnew --member="serviceAccount:github-deployer@frameonnew.iam.gserviceaccount.com" --role=roles/iam.serviceAccountUser
```

The condition means only a job running in this repository's `production` environment can sign in; a pull request or another branch cannot. `roles/firebase.admin` is a broad starting point that is known to work for Firebase deploys; narrow it later if you wish (functions, rules and index admin roles).

Then in GitHub, repository Settings, Environments, **New environment** named `production`:
- Required reviewers: yourself. (This is the approval step.) Deployment branches: `main` only.
- Environment variables: `GCP_WORKLOAD_IDENTITY_PROVIDER` = `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/frameon-deploy`, `GCP_SERVICE_ACCOUNT` = `github-deployer@frameonnew.iam.gserviceaccount.com`, `MODERATOR_UID` = your moderator uid (see `docs/moderation.md`).
- Environment secret: `WEB_API_KEY` (the Firebase web API key the sign-in function uses; it is the value in your local `functions/.env`).

If something goes wrong, the first run of the workflow is where to find out: the sign-in and deploy steps print the error. A deploy that fails part way leaves the functions that did deploy in place; run it again.
