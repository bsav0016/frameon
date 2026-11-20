# Data model

Firestore is deny-by-default (`firestore.rules`). Clients write only their own content; money, counters,
notifications and anything touching another user is written by Cloud Functions (Admin SDK).

| Collection | Read | Client write | Server write |
| --- | --- | --- | --- |
| `profiles/{uid}` | signed in | name, bio, photoURL (owner) | create/delete, `username`, `usernameLower`, seller rating totals |
| `users/{uid}` (email, Stripe ids, `chargesEnabled`) | owner | none | all |
| `usernames/{name}` | none | none | all |
| `follows/{follower}_{followee}` | signed in | create/delete own | notification trigger |
| `blocks/{blocker}_{blocked}` | blocker | create/delete own | |
| `posts/{id}` | signed in | create/edit/delete own (price needs `chargesEnabled`) | `ratingSum`, `ratingCount`, `commentCount`, stock, `status` |
| `posts/{id}/ratings/{uid}` | signed in | 1-5 stars, not own post | aggregates via `onRatingWritten` |
| `posts/{id}/comments/{id}` | signed in | create; delete own or on own post | `commentCount`, `status` |
| `purchases/{seller}_{buyer}` | none | none | webhook; gates seller reviews |
| `sellerReviews/{seller}_{rater}` | signed in | buyers only | seller rating totals |
| `orders/{id}` | buyer, seller | none | webhook, order callables |
| `notifications/{uid}/items/{id}` | owner | mark read, delete | triggers |
| `reports/{id}` | none | create only | |

Orders move through `paid`, `shipped`, `delivered`, `refunded` and `disputed`. The legal moves live in one pure function, `functions/src/orderLogic.ts` (unit-tested), so the webhook, callables and scheduler cannot disagree. Clients never write orders, which the rules tests check. Shipped orders carry `carrier`, `trackingNumber` and `shippedAt`; delivered ones `deliveredAt` (and `deliveredBy: 'auto'` when the scheduler did it); a disputed order keeps `statusBeforeDispute` and `disputeOutcome`. All of these are missing on older orders, and the app reads them as empty. The Stripe webhook does not use the new statuses yet; the app build that understands them has to be out before functions start writing them, because older builds drop orders whose status they do not know.

Money is integer cents everywhere. Price 0 with quantity 0 means not for sale; otherwise $0.50 to $10,000 and
quantity 1 to 10,000.

Known limit: the feed queries `ownerUid in [...]` in chunks of 30 and merges, so very large follow lists are
approximate. A fan-out feed collection would remove this if it matters.

Tests: `npm run test:rules` (needs Java) runs the rules against the emulators. `npm run test:functions` (also needs Java) runs the Stripe webhook tests against the Firestore emulator with a fake Stripe client; both run in CI.

`status` (`active` or `hidden`) on posts and comments is written by moderators only (Admin SDK). A missing value means active. Clients filter hidden items out client-side (the owner still sees their own hidden post), and `createPaymentIntent` rejects hidden posts. Filtering is client-side on purpose: a `where('status')` query would need a backfill and new indexes.
