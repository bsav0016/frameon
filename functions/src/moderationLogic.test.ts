import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AUTO_HIDE_REPORTS, distinctReporters, shouldAutoHide, targetPath } from './moderationLogic';

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
