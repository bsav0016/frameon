# Release checklist

> ## Stripe is switched to LIVE (done 2026-11-12)
>
> The live secret key and live webhook secret are set in Firebase (`STRIPE_SECRET_KEY` v2, `STRIPE_WEBHOOK_SECRET` v3), the functions were redeployed, and EAS **production** uses the `pk_live_` publishable key. The whole backend is one Firebase project, so every build, including development builds, now charges real cards.
>
> Still to do before submitting: one real end-to-end purchase (a $1 piece, a seller with live Stripe onboarding, a real card), then refund it in the Stripe dashboard. Old test secret versions can be destroyed with `npx firebase functions:secrets:prune --project frameonnew`.

Everything the code needs is done except the items below, which need your accounts or decisions.

## 1. Accounts and credentials (you)
- [ ] `npx eas-cli login`, then `npx eas-cli init` in this folder. It writes `extra.eas.projectId` into app.json; push notifications stay off until that exists.
- [ ] **Android push (FCM v1)**, in order:
  1. The Firebase Android app (`com.brainsavidge.frameonnew`, id `1:322073099238:android:9c90bbb6d65651358a7427`) is already registered; `google-services.json` is gitignored.
  2. Give EAS the config file: `npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment development --environment preview --environment production`.
  3. Firebase console, Project settings, Service accounts, Generate new private key. Keep that JSON out of the repo and out of chat.
  4. `npx eas-cli credentials` then Android, a build profile, Google Service Account, then Manage your Google Service Account Key for Push Notifications (FCM V1), then upload the JSON from step 3. Delete the local copy afterwards.
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
- [x] Screenshots, icon and feature graphic are in `store-assets/` (see its README). The iPhone images are web renders of the app; swap in real-device captures from the dev build if you prefer.
- [ ] Upload: iPhone 6.9" set to App Store Connect, `store-assets/android/*` to the Play listing, `store-assets/icon/icon-1024.png` if asked for a marketing icon.

## 4. Before going live (security)
- [ ] Deploy rules and functions: `npx firebase deploy --project frameonnew`.
- [ ] Firebase **App Check** (Play Integrity / App Attest) to stop non-app clients calling the backend. Needs a dev build, then enforce for Firestore, Storage and Functions.
- [ ] Restrict the Firebase web API key to the app's bundle ID / package in Google Cloud console, credentials.
- [ ] Budget alert in Google Cloud billing.
- [ ] Review the `reports` collection daily; the Terms promise action within 24 hours.
- [ ] Remove any leftover `zz_test_*` accounts from Authentication.
