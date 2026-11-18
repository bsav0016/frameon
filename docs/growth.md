# Growth: sharing, the landing page and tagged links

FrameOn grows through artists: an artist who posts a piece and shares it brings their own audience. This adds ways to
share and a page to land on, and tags the store links so the App Store can say which one worked. Nothing is added to
the app or the site to track anyone (no script, no analytics SDK); the store counts installs itself, so the privacy
policy and the App Privacy answers ("no tracking, no analytics") stay true.

## What is in the app

- **Share a post:** the share icon at the top right of any post opens the phone's share sheet with the caption, the
  artist's username, the price if the piece is for sale, and a link to the app. No image is attached and nothing the
  post does not already show is included.
- **Share your profile:** on your own profile, **Share profile** sends "Follow @you on FrameOn ..." and a link.
- Both are plain text through React Native's built-in share sheet, so they can ship as an over-the-air update.

Messages are built in `src/lib/growth.ts` (tested in `src/lib/__tests__/growth.test.ts`).

## What is on the site

`https://bsav0016.github.io/frameon/` is now a landing page for artists and for people who love art, with the App Store
button, instead of only the policy links. It is built by `scripts/build-site.mjs` and published by the Pages workflow.

## Tagged links

| Where | Campaign |
| --- | --- |
| Landing page | `web-home` |
| Shared post (iPhone) | `share-post-ios` |
| Shared profile (iPhone) | `share-profile-ios` |

Android shares link to the website until there is a Google Play listing; when there is, set `PLAY_STORE_URL` in
`src/lib/growth.ts` and the Android campaigns (`share-post-android`, `share-profile-android`) start working. For a new place
you post (an art group, a studio newsletter), pick a name like `reddit-art` (lower case, words and dashes, 40 characters
at most) and build the link with `appStoreLink('reddit-art')`. Add the name to the table above.

**One value to set: the App Store provider token.** The App Store only reports a campaign link that carries the account's
provider token (`pt`). In App Store Connect open the app, App Analytics, Campaigns, Create Campaign Link, and copy the
number after `pt=` into `APP_STORE_PROVIDER_TOKEN` in `src/lib/growth.ts`. It is public and the same for every app on the
account. Until it is set the links work but the App Store does not report their campaign.

## Where to read results

- App Store Connect, App Analytics, Acquisition, Campaigns: first-time downloads per campaign.
- Google Search Console: add the site and submit its sitemap once one exists (the site has none yet; the landing page
  and policies are small).

## Getting artists

Growth depends on having pieces worth looking at, so the first job is a handful of real artists posting real work.

- Ask artists you know to post and share one piece each; the share message is written to be understood by someone who
  has never heard of the app.
- Post in art communities (Reddit art subreddits, Instagram and Discord art groups) by showing a piece and saying it is on
  FrameOn, not by posting a bare link. Read each community's self-promotion rules first.
- Lead with selling: "list an original and get paid through Stripe, 5% fee" is a clear reason to try it.
- Only promote while the app has content: an empty feed is a poor first impression. The demo seed
  (`store-assets/tools/seed-demo.mjs`) is for store review only, so remove it (`cleanup`) before real promotion.
