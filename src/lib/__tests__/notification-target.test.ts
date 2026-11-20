import { notificationTarget } from '../notification-target';

describe('notificationTarget', () => {
  it('opens the reported post, the post of a reported comment, or the reported user for moderation alerts', () => {
    expect(notificationTarget({ type: 'report', targetType: 'post', targetId: 'p1' })).toBe('/post/p1');
    expect(notificationTarget({ type: 'report', targetType: 'comment', targetId: 'p1/c9' })).toBe('/post/p1');
    expect(notificationTarget({ type: 'report', targetType: 'user', targetId: 'u1' })).toBe('/user/u1');
  });

  it('does not guess when a moderation alert is malformed', () => {
    expect(notificationTarget({ type: 'report', targetType: 'other', targetId: 'x' })).toBeNull();
    expect(notificationTarget({ type: 'report', targetType: 'post' })).toBeNull();
  });

  it('opens the post for a removal notice, and nothing when there is none', () => {
    expect(notificationTarget({ type: 'removal', postId: 'p1', fromUid: 'system' })).toBe('/post/p1');
    expect(notificationTarget({ type: 'removal', postId: null, fromUid: 'system' })).toBeNull();
  });

  it('keeps the existing behaviour for ordinary notifications', () => {
    expect(notificationTarget({ type: 'purchase' })).toBe('/orders');
    expect(notificationTarget({ type: 'order_refunded', postId: 'p1', fromUid: 'u1' })).toBe('/orders');
    expect(notificationTarget({ type: 'order_disputed', postId: 'p1', fromUid: 'u1' })).toBe('/orders');
    expect(notificationTarget({ type: 'order_shipped', postId: 'p1', fromUid: 'u1' })).toBe('/orders');
    expect(notificationTarget({ type: 'order_delivered', postId: 'p1', fromUid: 'u1' })).toBe('/orders');
    expect(notificationTarget({ type: 'rating', postId: 'p2', fromUid: 'u2' })).toBe('/post/p2');
    expect(notificationTarget({ type: 'follow', postId: null, fromUid: 'u3' })).toBe('/user/u3');
    expect(notificationTarget({})).toBeNull();
    expect(notificationTarget(undefined)).toBeNull();
  });
});
