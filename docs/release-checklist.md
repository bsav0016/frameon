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
- [ ] **Apple Pay** (checkout offers it, so these are required before an iOS build that is submitted):
  1. Developer portal, Certificates, Identifiers & Profiles, Identifiers, **Merchant IDs**: create `merchant.BrianSavidge.FrameOnNew`, and turn on **Apple Pay Payment Processing** for the app's identifier (`BrianSavidge.FrameOnNew`), choosing that merchant ID. EAS builds sign with this; a build made before this step has no Apple Pay.
  2. Stripe dashboard, Settings, Payments, **Apple Pay**, "Add new application" under iOS: Stripe gives you a certificate signing request; upload it in the developer portal under the merchant ID's **Apple Pay Payment Processing Certificate**, download the `.cer` and upload it back to Stripe. Do this for the mode the build will charge in (live for the store build), and check whether test mode needs its own.
  3. Make a new iOS build (the merchant ID and entitlement are native settings, so an over-the-air update cannot add them) and test on a real iPhone with a card in Wallet: open a priced post, Buy, fill the address, Continue, and Apple Pay appears in the payment sheet.

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

## 5. Over-the-air updates (after the store builds are live)

Builds from 2.0.0 on include `expo-updates` and listen to the channel named in `eas.json` (`production` for store builds). An update only reaches builds with the **same app version** (`runtimeVersion` follows `version` in `app.json`).

| Change | How it ships |
| --- | --- |
| Screens, copy, JavaScript, images bundled in the app | `npm run update:production`, reaches users on their next launch (applied on that launch if it downloads within 3 seconds, otherwise on the one after) |
| A native library, new permissions, native `app.json` settings, a new Expo SDK | Store release with a new version number |
| Cloud Functions, Firestore and Storage rules | `npx firebase deploy --project frameonnew`, not an app update |

**Rule of thumb:** if the change could not run in the app that is already installed, it is a store release. When unsure, it is a store release. Dependabot bumps of native packages (Stripe, notifications, image picker and so on) go out as store releases.

### Updates on the first open

`app.json` sets `updates.fallbackToCacheTimeout` to 3000. At launch the app checks for an update and, if one exists, holds the splash screen for up to 3 seconds while it downloads, so it starts on the new code straight away. If the download is not done in time the app starts on the code it already has and the update applies on the next launch. The check is quick when there is nothing new; the cost is that on a very slow connection every start can wait up to 3 seconds.

This value is read by the native build, so it only takes effect in builds made after it was set. The 2.0.0 builds that are already submitted keep applying updates on the second launch; it takes effect from the next store build.

### Publishing

1. Make the change on a branch and open a PR as usual (CI runs lint, typecheck and tests).
2. Try it on preview first. From your branch: `npm run update:preview`. It refuses to run with uncommitted changes, runs lint, typecheck, tests and a bundle check, then publishes to the `preview` channel. Open a preview build (`npx eas-cli build --profile preview`), force-quit and reopen the app (the update is applied on that launch if it downloads within 3 seconds; on a slow connection reopen once more), and check the fix.
3. Merge the PR, then from an up-to-date `main`: `git checkout main && git pull && npm run update:production`. It refuses unless you are on `main`, the tree is clean and `HEAD` equals `origin/main`, so production gets exactly what was merged.
4. Add `-- --dry-run` to either command to run every check and print the publish command without publishing.

The scripts need `npx eas-cli login`, and the checks need the `EXPO_PUBLIC_*` values from `.env.local` (or the placeholder values CI uses) in your environment.

### Rolling back

1. `npx eas-cli update:list --branch production --limit 5` shows the update group ids.
2. `npx eas-cli update:rollback <GROUP_ID> --message "Roll back: <why>"` (the group must be the latest on its branch and runtime version). Phones pick it up on their next launch.
3. Fix forward on a branch, try it on preview, publish again.

A rollback cannot recall an update from phones that already applied it and never reopen the app.

### Notes

- Production builds were made with Stripe live keys (`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is an EAS environment variable). `update:production` publishes with the `production` EAS environment, so the same key is used. Check the variables with `npx eas-cli env:list --environment production` if a payment screen misbehaves after an update.
- Check Apple's and Google's current rules on over-the-air updates before relying on them for anything beyond fixing JavaScript and assets.
