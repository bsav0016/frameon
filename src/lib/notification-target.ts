import type { Href } from 'expo-router';

import { postHref, userHref } from './routes';

/**
 * Where a tapped push notification should open, or null to just open the app.
 * Moderation alerts (`type: 'report'`) carry the reported thing's type and id; comment ids are `postId/commentId`.
 */
export function notificationTarget(data: Record<string, unknown> | undefined): Href | null {
  if (!data) return null;
  if (data.type === 'purchase' || data.type === 'order_refunded' || data.type === 'order_disputed') return '/orders' as Href;
  // Removal notices come from the system, so there is no user to open; open the post when there is one.
  if (data.type === 'removal') return typeof data.postId === 'string' ? postHref(data.postId) : null;
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
