# FrameOn

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

## Growth

Posts and profiles can be shared from the app (plain text and a link, no image), the website has a landing page, and store links carry campaign tags so installs can be told apart in App Store Connect. See [docs/growth.md](docs/growth.md).

## Layout

- `src/app` routes (expo-router); `(auth)` when signed out, `(tabs)` when signed in
- `src/components/ui` design-system components
- `src/constants/theme.ts` design tokens (light and dark)
- `src/lib` Firebase setup, auth state, formatting and validation
