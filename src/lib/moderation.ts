/** Moderators (a Cloud Function or the takedown script) set `status` to 'hidden'. Clients never write it. */
export type ModerationStatus = 'active' | 'hidden';

type Moderated = { status: ModerationStatus; ownerUid?: string; authorUid?: string };

/** Hidden content is shown to nobody except the person who made it, so they can see what was removed. */
export function isVisibleTo(item: Moderated, viewerUid?: string): boolean {
  if (item.status !== 'hidden') return true;
  return !!viewerUid && (item.ownerUid === viewerUid || item.authorUid === viewerUid);
}
