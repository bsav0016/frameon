# Release checklist

Everything the code needs is done except the items below, which need your accounts or decisions.

## 1. Accounts and credentials (you)
- [ ] `npx eas-cli login`, then `npx eas-cli init` in this folder. It writes `extra.eas.projectId` into app.json; push notifications stay off until that exists.
- [ ] **Android push (FCM v1):** Firebase console, Project settings, Service accounts, generate a key; upload it with `npx eas-cli credentials` (Android, Push Notifications).
- [ ] **iOS push (APNs):** let EAS create the key when `eas build` asks (needs the Apple Developer login).
- [ ] Stripe: Connect enabled, **live** keys swapped in (`firebase functions:secrets:set STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, a live webhook endpoint, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` set for the production build).
- [ ] Apple merchant ID `merchant.BrianSavidge.FrameOnNew` created (only needed for Apple Pay).

## 2. Builds
- Development build for testing payments and push: `npx eas-cli build --profile development --platform android` (or ios).
- Release: `npx eas-cli build --profile production`, then `npx eas-cli submit`.
- Env vars for EAS builds: add the `EXPO_PUBLIC_*` values from `.env.local` as EAS environment variables (they are not read from the gitignored file in the cloud).

## 3. Store listing
- [ ] Public **privacy policy URL** (same text as Settings > Privacy Policy, see `src/lib/legal.ts`) and a **support URL or email**.
- [ ] Have the Terms and Privacy text reviewed; update `TERMS_VERSION` in `functions/src/auth.ts` if they change.
- [ ] Age rating: user-generated content, so answer the UGC questions honestly (report, block, 24h review, terms acceptance, account deletion are all implemented).
- [ ] App Privacy answers: email, username, name, photos, user content, purchases and shipping address are collected and linked to the user; none used for tracking.
- [ ] Review notes: give Apple a demo account and explain how to reach report, block and delete account (Settings). Selling needs Stripe test onboarding, so say sellers are optional.
- [ ] Screenshots from a dev build on 6.9" and 6.5" iPhones; Android phone screenshots; feature graphic.

## 4. Before going live (security)
- [ ] Deploy rules and functions: `npx firebase deploy --project frameonnew`.
- [ ] Firebase **App Check** (Play Integrity / App Attest) to stop non-app clients calling the backend. Needs a dev build, then enforce for Firestore, Storage and Functions.
- [ ] Restrict the Firebase web API key to the app's bundle ID / package in Google Cloud console, credentials.
- [ ] Budget alert in Google Cloud billing.
- [ ] Review the `reports` collection daily; the Terms promise action within 24 hours.
- [ ] Remove any leftover `zz_test_*` accounts from Authentication.
