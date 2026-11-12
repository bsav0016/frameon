# FrameOn

> **Before any production release:** the Stripe secret key and webhook secret in Firebase are still the *test* values and must be swapped for live ones. See the top of `docs/release-checklist.md`.

A marketplace for sharing and selling artwork: post photos, rate and comment on work, follow artists, and buy
pieces through Stripe. Expo (React Native) rebuild of the original Swift app.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the Firebase web config (Firebase console > Project settings > Your apps)
npx expo start
```

Stripe's native SDK is not in Expo Go, so payments need a development build (`eas build --profile development`).

## Scripts

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `npm run check`     | lint, typecheck and tests     |
| `npm run lint`      | ESLint                        |
| `npm run typecheck` | `tsc --noEmit`                |
| `npm test`          | Jest                          |

## Layout

- `src/app` routes (expo-router); `(auth)` when signed out, `(tabs)` when signed in
- `src/components/ui` design-system components
- `src/constants/theme.ts` design tokens (light and dark)
- `src/lib` Firebase setup, auth state, formatting and validation
