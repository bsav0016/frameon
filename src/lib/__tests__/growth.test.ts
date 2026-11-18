import { appStoreLink, playStoreLink, postShareMessage, profileShareMessage, shareLink, WEBSITE_URL } from '../growth';

describe('tagged links', () => {
  it('adds a campaign to the App Store link', () => {
    expect(appStoreLink('web-home')).toMatch(/^https:\/\/apps\.apple\.com\/us\/app\/frame-on\/id1602931798\?.*ct=web-home/);
  });

  it('refuses a campaign name the store would mangle', () => {
    expect(() => appStoreLink('Bad Name')).toThrow();
    expect(() => appStoreLink('a'.repeat(41))).toThrow();
    expect(() => appStoreLink('')).toThrow();
    expect(() => playStoreLink('Bad Name')).toThrow();
  });

  it('has no Play link until there is a Play listing, and Android shares the website meanwhile', () => {
    expect(playStoreLink('web-home')).toBeNull();
    expect(shareLink('android', 'share-post')).toBe(WEBSITE_URL);
  });

  it('tags iPhone shares by what was shared', () => {
    expect(shareLink('ios', 'share-post')).toContain('ct=share-post-ios');
    expect(shareLink('ios', 'share-profile')).toContain('ct=share-profile-ios');
  });
});

describe('share messages', () => {
  it('shares a post with its caption, artist and price', () => {
    const message = postShareMessage({ ownerUsername: 'mara', caption: 'Harbour at dusk', priceCents: 12500 }, 'ios');
    expect(message).toContain('"Harbour at dusk" by @mara on FrameOn.');
    expect(message).toContain('For sale for $125.00.');
    expect(message).toContain('ct=share-post-ios');
  });

  it('leaves out the price when the piece is not for sale, and the caption when there is none', () => {
    const message = postShareMessage({ ownerUsername: 'mara', caption: '   ', priceCents: 0 }, 'ios');
    expect(message).toContain('A piece by @mara on FrameOn.');
    expect(message).not.toContain('For sale');
  });

  it('shortens a long caption to one line', () => {
    const message = postShareMessage({ ownerUsername: 'mara', caption: `first line\nsecond ${'x'.repeat(200)}`, priceCents: 0 }, 'ios');
    const quoted = message.split('"')[1];
    expect(quoted.length).toBeLessThanOrEqual(80);
    expect(quoted).not.toContain('\n');
    expect(quoted.endsWith('…')).toBe(true);
  });

  it('shares a profile', () => {
    expect(profileShareMessage('mara', 'ios')).toContain('Follow @mara on FrameOn');
    expect(profileShareMessage('mara', 'android')).toContain(WEBSITE_URL);
  });

  it('holds nothing beyond what the post and profile show', () => {
    const post = { ownerUsername: 'mara', caption: 'x', priceCents: 0, ownerUid: 'abc123', imageURL: 'https://img.test/a.jpg' };
    expect(postShareMessage(post, 'ios')).not.toMatch(/abc123|img\.test/);
  });
});
