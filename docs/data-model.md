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
| `posts/{id}` | signed in | create/edit/delete own (price needs `chargesEnabled`) | `ratingSum`, `ratingCount`, `commentCount`, stock |
| `posts/{id}/ratings/{uid}` | signed in | 1-5 stars, not own post | aggregates via `onRatingWritten` |
| `posts/{id}/comments/{id}` | signed in | create; delete own or on own post | `commentCount` |
| `purchases/{seller}_{buyer}` | none | none | webhook; gates seller reviews |
| `sellerReviews/{seller}_{rater}` | signed in | buyers only | seller rating totals |
| `orders/{id}` | buyer, seller | none | webhook |
| `notifications/{uid}/items/{id}` | owner | mark read, delete | triggers |
| `reports/{id}` | none | create only | |

Money is integer cents everywhere. Price 0 with quantity 0 means not for sale; otherwise $0.50 to $10,000 and
quantity 1 to 10,000.

Known limit: the feed queries `ownerUid in [...]` in chunks of 30 and merges, so very large follow lists are
approximate. A fan-out feed collection would remove this if it matters.

Tests: `npm run test:rules` (needs Java) runs the rules against the emulators.
