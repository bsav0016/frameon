// Fills the LOCAL Firebase emulators (never production) with a seller/buyer and a few orders in different
// states, so the order screens can be photographed. Orders are normally written by the Stripe webhook,
// which needs a real payment, so they are written here with the Admin SDK.
// Usage (emulators must be running; see store-assets/README.md):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node seed-orders-emulator.mjs <art-base-url>
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to run: both emulator host variables must be set so nothing reaches production.');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', '..', 'functions', 'package.json'));
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const art = process.argv[2] ?? 'http://127.0.0.1:8099/demo-art';
initializeApp({ projectId: 'demo-frameon' });
const auth = getAuth();
const db = getFirestore();

const PASSWORD = 'emulator-only-password';
const USERS = {
  elena: { username: 'elena.moreau', name: 'Elena Moreau', email: 'elena@example.test' },
  avery: { username: 'avery_lane', name: 'Avery Lane', email: 'avery@example.test' },
  marlow: { username: 'marlow.studio', name: 'Marlow Studio', email: 'marlow@example.test' },
};

for (const [uid, u] of Object.entries(USERS)) {
  await auth.createUser({ uid, email: u.email, password: PASSWORD, displayName: u.name });
  await db.doc(`profiles/${uid}`).set({ username: u.username, name: u.name, bio: '', photoURL: null, sellerRatingSum: 0, sellerRatingCount: 0 });
  await db.doc(`users/${uid}`).set({ email: u.email, chargesEnabled: true });
}

const days = (n) => Timestamp.fromMillis(Date.now() - n * 24 * 60 * 60 * 1000);
const address = (name, line1, city, state, postalCode) => ({ name, line1, line2: '', city, state, postalCode, country: 'US' });
const orders = [
  // Elena sells: a new paid order to ship, and one already on its way.
  { id: 'pi_demo_sale_new', postId: 'p1', img: 'ember-field', amountCents: 36000, buyerUid: 'avery', sellerUid: 'elena', status: 'paid', created: days(0.2), shippingAddress: address('Avery Lane', '412 Harbor Street', 'Duluth', 'MN', '55802') },
  { id: 'pi_demo_sale_shipped', postId: 'p2', img: 'dusk-ridge', amountCents: 28000, buyerUid: 'marlow', sellerUid: 'elena', status: 'shipped', created: days(4), carrier: 'USPS', trackingNumber: '9400 1118 9922 3197 4284 90', shippedAt: days(2), shippingAddress: address('Marlow Studio', '88 Quarry Road', 'Madison', 'WI', '53703') },
  // Elena buys: one on its way, one delivered.
  { id: 'pi_demo_buy_shipped', postId: 'p3', img: 'monstera', amountCents: 12000, buyerUid: 'elena', sellerUid: 'marlow', status: 'shipped', created: days(3), carrier: 'UPS', trackingNumber: '1Z999AA10123456784', shippedAt: days(1), shippingAddress: address('Elena Moreau', '17 Pine Lane', 'Duluth', 'MN', '55803') },
  { id: 'pi_demo_buy_delivered', postId: 'p4', img: 'birch-hollow', amountCents: 42000, buyerUid: 'elena', sellerUid: 'avery', status: 'delivered', created: days(20), carrier: 'FedEx', trackingNumber: '777700001234', shippedAt: days(18), deliveredAt: days(14), shippingAddress: address('Elena Moreau', '17 Pine Lane', 'Duluth', 'MN', '55803') },
];
for (const o of orders) {
  const buyer = USERS[o.buyerUid];
  await db.doc(`orders/${o.id}`).set({
    postId: o.postId,
    postImageURL: `${art}/${o.img}.jpg`,
    buyerUid: o.buyerUid,
    buyerUsername: buyer.username,
    sellerUid: o.sellerUid,
    amountCents: o.amountCents,
    status: o.status,
    shippingAddress: o.shippingAddress,
    carrier: o.carrier ?? null,
    trackingNumber: o.trackingNumber ?? null,
    shippedAt: o.shippedAt ?? null,
    deliveredAt: o.deliveredAt ?? null,
    createdAt: o.created,
  });
}
console.log('seeded', orders.length, 'orders; sign in as elena@example.test');
