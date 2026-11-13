# Store listing copy and declarations

Everything to paste into App Store Connect and Google Play Console. Screenshots and graphics are in `store-assets/`.

URLs (all live):
- Privacy Policy: https://bsav0016.github.io/frameon/privacy/
- Terms of Use: https://bsav0016.github.io/frameon/terms/
- Support: https://bsav0016.github.io/frameon/support/
- Account deletion instructions (Play asks for this): https://bsav0016.github.io/frameon/support/#delete-account
- Marketing URL: https://bsav0016.github.io/frameon/
- Support email: savidgeapps@gmail.com

---

## Apple App Store

**Name (30):** FrameOn
**Subtitle (30):** Share and buy original art
**Bundle ID:** BrianSavidge.FrameOnNew
**Primary category:** Shopping. **Secondary:** Social Networking.
**Copyright:** 2026 Brian Savidge

**Promotional text (170):**
Post your art, follow other artists, rate and comment on their work, and buy original pieces straight from the person who made them.

**Keywords (100):**
`art,artist,paintings,gallery,prints,marketplace,sell art,buy art,original,portfolio,creative,drawing`

**Description:**
```
FrameOn is a home for original art.

Share your work
Post photos of your paintings, drawings, prints and more. Add a caption, set a price if you want to sell, and build a profile people can follow.

Discover artists
Your home feed shows new work from the artists you follow. Search for artists by name and browse everything people are posting.

Join the conversation
Rate pieces with one to five stars, leave comments, and get notified when someone rates or comments on your work or follows you.

Buy directly from the maker
Found something you love? Check out in seconds with secure payment through Stripe. Sellers see your shipping address and send the piece straight to you. After you buy, you can leave the seller a review.

Sell your own art
Connect a payout account with Stripe from Settings, then list pieces with a price and quantity. FrameOn keeps a 5% fee that includes payment processing.

A safe community
You can report any post, comment or user, and block anyone you do not want to see. Reports are reviewed within 24 hours, and there is no tolerance for objectionable content or abusive users. You can delete your account and content at any time from Settings.
```

**What's New (2.0.0):** FrameOn has been rebuilt from the ground up: a faster, cleaner design, secure checkout with Stripe, seller payouts, ratings and reviews, notifications, and tools to report and block. Existing accounts from the old version need to create a new account.

**Age rating questionnaire:** Contains user-generated content: **Yes** (moderated: report, block, terms, 24 hour review). Unrestricted web access: No. Gambling, contests: No. Alcohol, tobacco, drugs: None. Violence, sexual content, profanity, horror: None in the app itself (user-generated content is the only exposure). Expect 12+ or 17+ depending on how Apple weighs UGC.

**App Privacy ("nutrition label"):** Data is linked to the user. Nothing is used for tracking and there is no third-party advertising or analytics.

| Data type | Collected | Purpose |
| --- | --- | --- |
| Contact info: email address | Yes | App functionality, account |
| Contact info: name | Yes (optional) | App functionality |
| Contact info: physical address | Yes (shipping address at purchase) | App functionality |
| User content: photos | Yes | App functionality |
| User content: other (captions, comments, ratings, bio) | Yes | App functionality |
| Identifiers: user ID | Yes | App functionality |
| Purchases: purchase history | Yes | App functionality |
| Financial info: payment info | Collected by Stripe, never stored by FrameOn | App functionality. Declare it, because Stripe's payment sheet collects it. |

Not collected: location, contacts, browsing history, health, diagnostics, advertising data.

**Export compliance:** the app only uses standard encryption (HTTPS), already declared via `ITSAppUsesNonExemptEncryption: false`.

**Notes for App Review:**
```
FrameOn is a social marketplace for original art. Users post photos of their work, follow artists, rate and comment, and buy pieces from sellers. Payments are processed by Stripe; sellers receive payouts through Stripe Connect. The goods are physical artwork shipped by the seller, so in-app purchase is not used (Guideline 3.1.3(e)).

Apple Pay: yes, in checkout. Open any post that has a price, tap Buy, fill in the shipping address and continue. Stripe's payment sheet opens and shows Apple Pay (on a device with a card in Wallet) alongside card entry; the merchant ID is merchant.BrianSavidge.FrameOnNew. This is where the PassKit framework is used.

Demo account (buyer): username <DEMO USERNAME>, password <DEMO PASSWORD>.
You can browse the feed and Search, open a post, rate and comment, follow artists, and open Settings.

User-generated content safeguards (Guideline 1.2):
- Terms of Use and Privacy Policy must be accepted at sign-up (checkbox, recorded server-side).
- Report: the flag icon on any post or comment, and "Report user" in a profile's menu.
- Block: "Block user" in a profile's menu; blocked users are hidden everywhere. Manage them under Settings > Blocked users.
- Reports are reviewed within 24 hours; offending content is removed and abusive accounts are suspended.
- Delete account: Settings > Delete account (removes profile, posts and comments).
- Support: savidgeapps@gmail.com

Purchasing: checkout opens Stripe's payment sheet. <Say here whether the backend is in live or test mode when you submit. In live mode reviewers cannot pay with a test card, so describe the flow up to the payment sheet.>
```

---

## Google Play

**App name (30):** FrameOn: Share and Buy Art
**Short description (80):** Share your art, follow artists, and buy original pieces from the maker.
**Category:** Art & Design. **Tags:** Art, Shopping, Social.
**Package:** com.brainsavidge.frameonnew
**Contact email:** savidgeapps@gmail.com. **Website:** https://bsav0016.github.io/frameon/

**Full description (4000):** use the App Store description above (it is plain text and fits).

**Graphics:** `store-assets/android/icon-512.png`, `store-assets/android/feature-graphic-1024x500.png`, phone screenshots `store-assets/android/phone-*.png`.

**Target audience:** 18 and over (an art marketplace with purchases and user-generated content; not designed for children).
**Ads:** none.
**Content rating (IARC questionnaire):** user-generated content and user interaction: Yes; shares location: No; digital purchases: No (physical goods); violence, sex, language, controlled substances: No.

**Data safety form:**
- Does the app collect or share data? Collects. Shares: no data shared with third parties for their own use (Stripe and Google Firebase process data on our behalf).
- Data collected:
  - Personal info: name (optional), email address, user IDs, address (shipping).
  - Photos and videos: photos (the art and profile picture the user chooses to post).
  - Financial info: payment info (handled by Stripe), purchase history.
  - App activity / other user-generated content: comments, ratings, bio.
  - Device or other IDs: push notification token.
- Purposes: app functionality, account management. Not for advertising or analytics.
- Data encrypted in transit: Yes.
- Users can request deletion: Yes. In the app (Settings > Delete account) and at https://bsav0016.github.io/frameon/support/#delete-account

**Release plan:** upload the first Android App Bundle to the **Internal testing** track, test on real devices, then promote to production. Closed testing requirements for new personal developer accounts may apply (a minimum number of testers for 14 days before production); check Play Console for your account type.

---

## Known review risk

Apple Guideline 1.2 asks for a way to filter objectionable content, not just report it. FrameOn has terms acceptance, reporting, blocking, a 24 hour review promise and account removal, but no automatic screening of uploaded images. Many apps pass with that, but an automated check on uploads (for example Google Cloud Vision SafeSearch in a Cloud Function that hides flagged posts) would remove the risk. It is the main thing worth considering before submitting to Apple.
