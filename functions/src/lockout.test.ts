import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatWait } from './lockout';

describe('formatWait', () => {
  it('uses seconds under a minute', () => {
    assert.equal(formatWait(1000), '1 second');
    assert.equal(formatWait(45_000), '45 seconds');
  });

  it('uses minutes, and minutes with seconds', () => {
    assert.equal(formatWait(15 * 60_000), '15 minutes');
    assert.equal(formatWait(60_000), '1 minute');
    assert.equal(formatWait(14 * 60_000 + 32_000), '14 minutes 32 seconds');
    assert.equal(formatWait(61_000), '1 minute 1 second');
  });

  it('rounds partial seconds up and never says zero', () => {
    assert.equal(formatWait(1), '1 second');
    assert.equal(formatWait(0), '1 second');
    assert.equal(formatWait(59_001), '1 minute');
  });
});
