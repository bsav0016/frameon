import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AUTO_HIDE_REPORTS, distinctReporters, imageAction, parseImagePath, shouldAutoHide, targetPath } from './moderationLogic';

describe('targetPath', () => {
  it('maps posts and comments to their documents', () => {
    assert.equal(targetPath('post', 'p1'), 'posts/p1');
    assert.equal(targetPath('comment', 'p1/c1'), 'posts/p1/comments/c1');
  });

  it('refuses users, malformed ids and path tricks', () => {
    assert.equal(targetPath('user', 'u1'), null);
    assert.equal(targetPath('post', 'p1/c1'), null);
    assert.equal(targetPath('comment', 'p1'), null);
    assert.equal(targetPath('comment', 'p1//c1'), null);
    assert.equal(targetPath('post', '..'), null);
    assert.equal(targetPath('other', 'p1'), null);
  });
});

describe('auto hide', () => {
  const r = (reporterUid: string, status?: string) => ({ reporterUid, status });

  it('counts each reporter once', () => {
    assert.equal(distinctReporters([r('a'), r('a'), r('b')], 'owner'), 2);
  });

  it('ignores resolved reports and the owner reporting themselves', () => {
    assert.equal(distinctReporters([r('a'), r('b', 'dismissed'), r('c', 'actioned'), r('owner')], 'owner'), 1);
  });

  it('hides only at the threshold of distinct reporters', () => {
    assert.equal(AUTO_HIDE_REPORTS, 3);
    assert.equal(shouldAutoHide([r('a'), r('b')], 'owner'), false);
    assert.equal(shouldAutoHide([r('a'), r('a'), r('a')], 'owner'), false);
    assert.equal(shouldAutoHide([r('a'), r('b'), r('c')], 'owner'), true);
  });
});

describe('imageAction', () => {
  it('hides only very likely adult or violent images', () => {
    assert.equal(imageAction({ adult: 'VERY_LIKELY' }), 'hide');
    assert.equal(imageAction({ violence: 'VERY_LIKELY' }), 'hide');
  });

  it('queues borderline images for a human instead of hiding them', () => {
    assert.equal(imageAction({ adult: 'LIKELY' }), 'review');
    assert.equal(imageAction({ violence: 'LIKELY' }), 'review');
    assert.equal(imageAction({ racy: 'VERY_LIKELY' }), 'review');
  });

  it('lets ordinary and merely racy art through', () => {
    assert.equal(imageAction({ adult: 'POSSIBLE', violence: 'UNLIKELY', racy: 'LIKELY' }), 'ok');
    assert.equal(imageAction({}), 'ok');
  });

  it('accepts numeric enum values and ignores unknown ones', () => {
    assert.equal(imageAction({ adult: 5 }), 'hide');
    assert.equal(imageAction({ adult: 4 }), 'review');
    assert.equal(imageAction({ adult: 'nonsense', violence: 99 }), 'ok');
  });
});

describe('parseImagePath', () => {
  it('recognises post photos and avatars', () => {
    assert.deepEqual(parseImagePath('posts/u1/p1.jpg'), { kind: 'post', uid: 'u1', postId: 'p1' });
    assert.deepEqual(parseImagePath('avatars/u1/avatar.jpg'), { kind: 'avatar', uid: 'u1' });
  });

  it('ignores everything else', () => {
    assert.equal(parseImagePath('posts/u1/nested/p1.jpg'), null);
    assert.equal(parseImagePath('other/u1/p1.jpg'), null);
  });
});
