// Pure moderation rules, kept apart from Firebase so they can be unit tested with `npm test`.

/** Distinct people who must report the same post or comment before it is hidden automatically. */
export const AUTO_HIDE_REPORTS = 3;

export type ReportTarget = 'post' | 'comment' | 'user';

export interface ReportLike {
  reporterUid: string;
  status?: string;
}

/** Firestore path of a reported post or comment. Comment ids arrive as `postId/commentId`. Users are not hidden this way. */
export function targetPath(type: string, id: string): string | null {
  const parts = id.split('/');
  if (parts.some((p) => p.length === 0 || p === '.' || p === '..')) return null;
  if (type === 'post' && parts.length === 1) return `posts/${parts[0]}`;
  if (type === 'comment' && parts.length === 2) return `posts/${parts[0]}/comments/${parts[1]}`;
  return null;
}

/** Counts distinct reporters on still-open reports (so resolved ones do not re-hide content a moderator restored), ignoring the owner reporting themselves. */
export function distinctReporters(reports: ReportLike[], ownerUid: string | undefined): number {
  return new Set(reports.filter((r) => (r.status === undefined || r.status === 'open') && r.reporterUid !== ownerUid).map((r) => r.reporterUid)).size;
}

export function shouldAutoHide(reports: ReportLike[], ownerUid: string | undefined, threshold = AUTO_HIDE_REPORTS): boolean {
  return distinctReporters(reports, ownerUid) >= threshold;
}
