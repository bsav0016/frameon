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

// ---- image screening (Google Cloud Vision SafeSearch) ----

const LIKELIHOODS = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'] as const;
export type Likelihood = (typeof LIKELIHOODS)[number];

/** The client library returns either the enum name or its number depending on version. */
export function normalizeLikelihood(v: unknown): Likelihood {
  if (typeof v === 'number') return LIKELIHOODS[v] ?? 'UNKNOWN';
  return LIKELIHOODS.includes(v as Likelihood) ? (v as Likelihood) : 'UNKNOWN';
}

export interface SafeSearch {
  adult?: unknown;
  violence?: unknown;
  racy?: unknown;
}

export type ImageAction = 'ok' | 'review' | 'hide';

/**
 * Art can legitimately contain nudity, so this is deliberately conservative: only VERY_LIKELY adult or violent
 * content is hidden automatically. LIKELY adult/violence, or VERY_LIKELY racy, is queued for a human.
 */
export function imageAction(s: SafeSearch): ImageAction {
  const adult = normalizeLikelihood(s.adult);
  const violence = normalizeLikelihood(s.violence);
  const racy = normalizeLikelihood(s.racy);
  if (adult === 'VERY_LIKELY' || violence === 'VERY_LIKELY') return 'hide';
  if (adult === 'LIKELY' || violence === 'LIKELY' || racy === 'VERY_LIKELY') return 'review';
  return 'ok';
}

/** Storage paths the app writes: posts/{uid}/{postId}.ext and avatars/{uid}/{file}. */
export function parseImagePath(name: string): { kind: 'post'; uid: string; postId: string } | { kind: 'avatar'; uid: string } | null {
  const post = /^posts\/([^/]+)\/([^/.]+)\.[A-Za-z0-9]+$/.exec(name);
  if (post) return { kind: 'post', uid: post[1], postId: post[2] };
  const avatar = /^avatars\/([^/]+)\/[^/]+$/.exec(name);
  if (avatar) return { kind: 'avatar', uid: avatar[1] };
  return null;
}

// ---- removal notices and moderator actions ----

export type RemovalKind = 'post' | 'comment' | 'avatar';

/** What the owner is told when their content is hidden. */
export function removalText(kind: string): { title: string; body: string } {
  const what = kind === 'comment' ? 'comment' : kind === 'avatar' ? 'profile photo' : 'post';
  return { title: 'Content removed', body: `Your ${what} was removed by FrameOn moderators. Contact support if you think this is a mistake.` };
}

/** Moderators are marked by the server on their private user doc; clients cannot write it. */
export function isModerator(userDoc: { moderator?: unknown } | undefined): boolean {
  return userDoc?.moderator === true;
}

export interface ModerateRequest {
  targetType: 'post' | 'comment';
  targetId: string;
  action: 'hide' | 'unhide';
}

export function parseModerateRequest(data: unknown): ModerateRequest | null {
  const d = data as { targetType?: unknown; targetId?: unknown; action?: unknown } | null | undefined;
  if (!d || (d.targetType !== 'post' && d.targetType !== 'comment')) return null;
  if (d.action !== 'hide' && d.action !== 'unhide') return null;
  if (typeof d.targetId !== 'string' || targetPath(d.targetType, d.targetId) === null) return null;
  return { targetType: d.targetType, targetId: d.targetId, action: d.action };
}
