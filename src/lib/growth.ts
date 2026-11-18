/**
 * Store links tagged so each place that sends people to the store can be told apart in App Store Connect (App Analytics,
 * Campaigns), plus the text people share from the app. No tracker or script is involved: the store counts the installs
 * itself. Campaigns in use are listed in docs/growth.md. Pure functions, covered by unit tests.
 */
export const WEBSITE_URL = 'https://bsav0016.github.io/frameon/';
export const APP_STORE_URL = 'https://apps.apple.com/us/app/frame-on/id1602931798';

/** Set once the Android app has a live Google Play listing; until then Android shares link to the website. */
export const PLAY_STORE_URL: string | null = null;

/**
 * The App Store only reports a campaign link that also carries the account's provider token ("pt"), shown in App Store
 * Connect when you build a campaign link there. It is public (it is in every campaign link) and not a secret, and it is the
 * same for every app on the account. Leave it empty until it is known: links then carry the campaign name but the App
 * Store will not report on it.
 */
export const APP_STORE_PROVIDER_TOKEN = '';

const CAMPAIGN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function assertCampaign(campaign: string) {
  if (!CAMPAIGN.test(campaign) || campaign.length > 40) {
    throw new Error(`Campaign must be lower-case words and dashes, 40 characters at most: ${campaign}`);
  }
}

/** The App Store listing with a campaign added. */
export function appStoreLink(campaign: string): string {
  assertCampaign(campaign);
  const token = APP_STORE_PROVIDER_TOKEN ? `pt=${APP_STORE_PROVIDER_TOKEN}&` : '';
  return `${APP_STORE_URL}?${token}ct=${campaign}&mt=8`;
}

/** The Google Play listing with a campaign (install referrer with UTM values), or null while there is no listing. */
export function playStoreLink(campaign: string, medium = 'organic'): string | null {
  assertCampaign(campaign);
  if (!PLAY_STORE_URL) return null;
  const referrer = encodeURIComponent(`utm_source=${campaign}&utm_medium=${medium}&utm_campaign=${campaign}`);
  return `${PLAY_STORE_URL}&referrer=${referrer}`;
}

/** Where a shared message sends people: the App Store on iPhone, the store (or the website, until Play is live) on Android. */
export function shareLink(os: string, campaign: string): string {
  if (os === 'ios') return appStoreLink(`${campaign}-ios`);
  return playStoreLink(`${campaign}-android`, 'share') ?? WEBSITE_URL;
}

const MAX_CAPTION = 80;

function shortCaption(caption: string): string {
  const oneLine = caption.replace(/\s+/g, ' ').trim();
  return oneLine.length > MAX_CAPTION ? `${oneLine.slice(0, MAX_CAPTION - 1).trimEnd()}…` : oneLine;
}

/** The text shared for one post. Only what anyone can already see on the post: the artist's username, the caption and any price. */
export function postShareMessage(post: { ownerUsername: string; caption: string; priceCents: number }, os: string): string {
  const caption = shortCaption(post.caption);
  const first = caption ? `"${caption}" by @${post.ownerUsername} on FrameOn.` : `A piece by @${post.ownerUsername} on FrameOn.`;
  const price = post.priceCents > 0 ? ` For sale for $${(post.priceCents / 100).toFixed(2)}.` : '';
  return `${first}${price}\nFrameOn is a free app for sharing and buying original art: ${shareLink(os, 'share-post')}`;
}

/** The text shared for an artist's profile. */
export function profileShareMessage(username: string, os: string): string {
  return `Follow @${username} on FrameOn, a free app for sharing and buying original art: ${shareLink(os, 'share-profile')}`;
}
