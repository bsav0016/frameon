import type { Href } from 'expo-router';

import { postHref, userHref } from './routes';

/**
 * Where a tapped push notification should open, or null to just open the app.
 * Moderation alerts (`type: 'report'`) carry the reported thing's type and id; comment ids are `postId/commentId`.
 */
export function notificationTarget(data: Record<string, unknown> | undefined): Href | null {
  if (!data) return null;
  if (data.type === 'purchase') return '/orders' as Href;
  if (data.type === 'report' && typeof data.targetType === 'string' && typeof data.targetId === 'string') {
    if (data.targetType === 'post') return postHref(data.targetId);
    if (data.targetType === 'comment') return postHref(data.targetId.split('/')[0]);
    if (data.targetType === 'user') return userHref(data.targetId);
    return null;
  }
  if (typeof data.postId === 'string') return postHref(data.postId);
  if (typeof data.fromUid === 'string') return userHref(data.fromUid);
  return null;
}
