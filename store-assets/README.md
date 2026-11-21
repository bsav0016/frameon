# Store assets

Everything in here is generated, so it can be rebuilt when the design or the app changes.

| Folder | Contents | Used for |
| --- | --- | --- |
| `icon/` | 1024px icon, Android adaptive layers (background, foreground, monochrome), rounded tile | The app icon (copied into `assets/images/` by `tools/build_icons.py`) |
| `ios/6.9in/` | 8 screenshots, 1320 x 2868 | App Store Connect, iPhone 6.9" (the main required set) |
| `ios/6.5in/` | 8 screenshots, 1284 x 2778 | App Store Connect, iPhone 6.5" (optional spare) |
| `android/` | `icon-512.png`, `feature-graphic-1024x500.png`, 8 phone screenshots at 1080 x 2160 | Google Play listing (also copied to `portfolio-worktrees/play-assets/frameon/`) |

## How they were made

- **Icon and feature graphic:** vector art in `tools/icon_art.py`, rendered by headless Chrome (`tools/render.py`).
  Run `python store-assets/tools/build_icons.py` and `python store-assets/tools/build_play_graphics.py`.
- **Artwork for the screenshots:** `tools/demo_art.py` paints 8 pieces procedurally (no stock images).
- **Demo community:** `tools/seed-demo.mjs seed` creates four demo accounts, eight posts, follows, ratings and comments in the
  Firebase project (sign in as `avery_lane`; the random password for that run is saved in the gitignored `tools/demo-state.json`); `avatars` adds profile photos; `cleanup` deletes
  everything again. The demo artists get the Stripe `chargesEnabled` seller flag through gcloud so prices show. The demo accounts
  were deleted after the captures, so run `seed` again before re-shooting.
- **iPhone screenshots:** the web build of the same code (`npx expo export --platform web`), captured at exact iPhone sizes
  with a scripted browser (`tools/capture_ios.py`), then given an iOS status bar and home indicator (`tools/finish_ios.py`).
  They are renders of the real app UI, but fonts are the browser's rather than San Francisco, so replace them with captures
  from a real iPhone or simulator if you want pixel-exact store images.
- **Android screenshots:** real captures from the Pixel 8 emulator running the app in Expo Go, resized to 1080 x 2160
  (Play requires a ratio of at most 2:1) with the system UI demo mode on for a clean 9:00 status bar.

- **Order screens (07 and 08, `phone-7`, `phone-8`):** orders are written by the Stripe webhook after a real payment, so these are rendered from the web build running against the **local** Firebase emulators, never production. Start `demo_art.py`, build with `EXPO_PUBLIC_FIREBASE_EMULATOR=1` (plus placeholder `EXPO_PUBLIC_*` values and project `demo-frameon`), run `npx firebase emulators:exec --only auth,firestore --project demo-frameon` around `tools/seed-orders-emulator.mjs` and `tools/capture_orders.py`, then `finish_ios.py` for the iPhone frames. The Android pair is the same web render at 1080 x 2160 without an Android status bar; swap in emulator captures if you want those pixel-exact. `docs/images/orders.png` (README) is the two 6.9" shots side by side.

## Notes

- iPad support is off (`ios.supportsTablet` is false), so no iPad screenshots are required.
- The Terms and Privacy text is in `src/lib/legal.ts`; the store listing needs the privacy policy at a public URL.
