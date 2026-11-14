# Moderation

How reports and takedowns work. Terms and the store listing promise action on reports within 24 hours.

## What happens to a report
1. A user files a report in the app (`reports/{id}`; clients can create but never read them).
2. The `onReportCreated` function marks it `open`. For a post or comment, once **3 different people** have open reports on it (the owner reporting themselves does not count), it sets `status: 'hidden'` on the content. Users are never auto-actioned.
3. The function pushes an alert to the moderator's registered devices ("New report" or "Content auto-hidden").

Hidden posts and comments disappear from feeds, search, profiles and comment lists for everyone but their owner, and cannot be bought. Content with no `status` counts as active.

## Setup (once)
- Set the moderator's uid for alerts: add `MODERATOR_UID=<your uid>` to `functions/.env.frameonnew`, then deploy functions. Your account must be signed in on a device that registered for push (Settings). Without it the function only logs.
- `gcloud auth application-default login` so the script can use your credentials.

## Daily tools
`node functions/scripts/moderate.mjs <command>` (project `frameonnew`, override with `FIREBASE_PROJECT`):

| Command | Does |
|---|---|
| `list` | open reports, oldest first |
| `hide post <id>` / `hide comment <postId>/<commentId>` | hide and mark that target's reports actioned |
| `unhide post <id>` | restore (restoring after a mistaken auto-hide is safe: resolved reports no longer count) |
| `delete-post <id>` | delete; `onPostDeleted` removes the photo, ratings, comments |
| `suspend <uid>` / `unsuspend <uid>` | disable or enable sign-in |
| `dismiss <reportId>` / `actioned <reportId>` | close a report without touching content |

Test the logic with `npm test --prefix functions`.
