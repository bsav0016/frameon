import { isVisibleTo } from '../moderation';

describe('isVisibleTo', () => {
  it('shows active content to everyone', () => {
    expect(isVisibleTo({ status: 'active', ownerUid: 'a' }, 'b')).toBe(true);
    expect(isVisibleTo({ status: 'active', ownerUid: 'a' })).toBe(true);
  });

  it('hides removed posts from other people and signed-out viewers', () => {
    expect(isVisibleTo({ status: 'hidden', ownerUid: 'a' }, 'b')).toBe(false);
    expect(isVisibleTo({ status: 'hidden', ownerUid: 'a' })).toBe(false);
  });

  it('still shows a removed post or comment to the person who made it', () => {
    expect(isVisibleTo({ status: 'hidden', ownerUid: 'a' }, 'a')).toBe(true);
    expect(isVisibleTo({ status: 'hidden', authorUid: 'c' }, 'c')).toBe(true);
  });
});
