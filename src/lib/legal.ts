// Draft text for the in-app Terms of Use and Privacy Policy. Have a lawyer review it before release, and
// publish the same privacy policy at a public URL for the App Store listing.
export interface LegalSection {
  heading: string;
  body: string;
}

export const LEGAL_UPDATED = 'November 11, 2026';

export const TERMS: LegalSection[] = [
  {
    heading: 'Agreement',
    body: 'By creating an account or using FrameOn you agree to these Terms of Use. If you do not agree, do not use the app.',
  },
  {
    heading: 'Your content',
    body: 'You own the art and text you post. You give FrameOn permission to store and display it in the app so the service can work. Only post work you made or have the right to share.',
  },
  {
    heading: 'No objectionable content or abuse',
    body: 'There is no tolerance for objectionable content or abusive users. Do not post anything that is illegal, sexually explicit, hateful, violent, harassing, deceptive, or that infringes someone else\'s rights. Do not sell counterfeit or stolen work. Do not harass, threaten or impersonate other people.',
  },
  {
    heading: 'Reporting and blocking',
    body: 'You can report any post, comment or user from the app, and you can block any user so you no longer see their content. We review reports within 24 hours. We remove content that breaks these terms and may suspend or remove the accounts responsible.',
  },
  {
    heading: 'Buying and selling',
    body: 'Sellers must complete payout setup with Stripe before listing art. Payments are processed by Stripe. FrameOn keeps a 5% fee, which includes Stripe processing. Sellers are responsible for describing work accurately and shipping it to the buyer\'s address. Buyers should contact the seller about problems with an order. Prices are in US dollars.',
  },
  {
    heading: 'Your account',
    body: 'Keep your password private. You can delete your account at any time from Settings. Deleting it removes your profile, posts and comments. Order records are kept because the other party in a sale still needs them.',
  },
  {
    heading: 'Changes and contact',
    body: 'We may update these terms and will tell you in the app when they change materially. Questions or reports can be sent to the developer through the support address in the App Store listing.',
  },
];

export const PRIVACY: LegalSection[] = [
  {
    heading: 'What we collect',
    body: 'Your email address, username, optional name, bio and profile photo; the art, captions, ratings and comments you post; who you follow and block; and, if you sell or buy, your order details and shipping address.',
  },
  {
    heading: 'How it is used',
    body: 'To run the service: show your profile and posts to other signed-in users, deliver notifications, process orders, and keep the community safe. We do not sell your personal information and we do not use it for advertising.',
  },
  {
    heading: 'Who sees what',
    body: 'Your username, name, bio, photo and posts are visible to other signed-in users. Your email address is private. A shipping address is visible only to you and the seller of that order.',
  },
  {
    heading: 'Payments',
    body: 'Card and bank details are handled by Stripe and never reach FrameOn\'s servers. Stripe\'s privacy policy applies to that data.',
  },
  {
    heading: 'Service providers',
    body: 'FrameOn runs on Google Firebase (authentication, database, file storage and server functions) and Stripe (payments).',
  },
  {
    heading: 'Your choices',
    body: 'You can edit your profile in Settings and delete your account and content at any time. Order records are retained for the other party and for financial record keeping.',
  },
];
