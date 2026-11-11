const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { deleteDoc, doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } = require('firebase/firestore');

let env;
const ALICE = 'alice-uid';
const BOB = 'bob-uid';

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const validPost = (over = {}) => ({
  ownerUid: ALICE,
  ownerUsername: 'alice',
  caption: 'A painting',
  imagePath: `posts/${ALICE}/p1.jpg`,
  imageURL: 'https://example.com/p1.jpg',
  priceCents: 0,
  quantity: 0,
  createdAt: serverTimestamp(),
  ratingSum: 0,
  ratingCount: 0,
  commentCount: 0,
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-frameon',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'profiles', ALICE), { username: 'alice', name: '', bio: '', photoURL: null, sellerRatingSum: 0, sellerRatingCount: 0 });
    await setDoc(doc(db, 'profiles', BOB), { username: 'bob', name: '', bio: '', photoURL: null, sellerRatingSum: 0, sellerRatingCount: 0 });
    await setDoc(doc(db, 'users', ALICE), { email: 'alice@example.com', chargesEnabled: false });
    await setDoc(doc(db, 'users', BOB), { email: 'bob@example.com', chargesEnabled: true });
    await setDoc(doc(db, 'posts', 'p1'), { ...validPost(), createdAt: new Date() });
  });
});

describe('profiles', () => {
  it('are unreadable when signed out and readable when signed in', async () => {
    await assertFails(getDoc(doc(anon(), 'profiles', ALICE)));
    await assertSucceeds(getDoc(doc(as(BOB), 'profiles', ALICE)));
  });

  it('let the owner edit name, bio and photo only', async () => {
    const ref = doc(as(ALICE), 'profiles', ALICE);
    await assertSucceeds(updateDoc(ref, { name: 'Alice', bio: 'Painter' }));
    await assertFails(updateDoc(ref, { username: 'someoneelse' }));
    await assertFails(updateDoc(ref, { sellerRatingSum: 500 }));
    await assertFails(updateDoc(ref, { bio: 'x'.repeat(241) }));
  });

  it('cannot be edited by someone else, created or deleted by clients', async () => {
    await assertFails(updateDoc(doc(as(BOB), 'profiles', ALICE), { name: 'hacked' }));
    await assertFails(setDoc(doc(as('new-uid'), 'profiles', 'new-uid'), { username: 'new' }));
    await assertFails(deleteDoc(doc(as(ALICE), 'profiles', ALICE)));
  });
});

describe('private user docs and server-only collections', () => {
  it('only show the private doc to its owner and never accept client writes', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'users', ALICE)));
    await assertFails(getDoc(doc(as(BOB), 'users', ALICE)));
    await assertFails(updateDoc(doc(as(ALICE), 'users', ALICE), { chargesEnabled: true }));
  });

  it('deny usernames and purchases entirely', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'usernames', 'alice')));
    await assertFails(setDoc(doc(as(ALICE), 'usernames', 'mine'), { uid: ALICE }));
    await assertFails(setDoc(doc(as(ALICE), 'purchases', `${BOB}_${ALICE}`), { ok: true }));
  });
});

describe('follows', () => {
  const follow = (follower, followee) => ({ follower, followee, createdAt: serverTimestamp() });

  it('can be created for yourself with the deterministic id', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'follows', `${ALICE}_${BOB}`), follow(ALICE, BOB)));
  });

  it('cannot follow as someone else, follow yourself, or use another id', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'follows', `${BOB}_${ALICE}`), follow(BOB, ALICE)));
    await assertFails(setDoc(doc(as(ALICE), 'follows', `${ALICE}_${ALICE}`), follow(ALICE, ALICE)));
    await assertFails(setDoc(doc(as(ALICE), 'follows', 'whatever'), follow(ALICE, BOB)));
  });

  it('cannot follow someone without a profile', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'follows', `${ALICE}_ghost`), follow(ALICE, 'ghost')));
  });

  it('can only be removed by the follower', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'follows', `${ALICE}_${BOB}`), { follower: ALICE, followee: BOB, createdAt: new Date() }));
    await assertFails(deleteDoc(doc(as(BOB), 'follows', `${ALICE}_${BOB}`)));
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'follows', `${ALICE}_${BOB}`)));
  });
});

describe('blocks', () => {
  it('are private to the blocker', async () => {
    const data = { blocker: ALICE, blocked: BOB, createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as(ALICE), 'blocks', `${ALICE}_${BOB}`), data));
    await assertSucceeds(getDoc(doc(as(ALICE), 'blocks', `${ALICE}_${BOB}`)));
    await assertFails(getDoc(doc(as(BOB), 'blocks', `${ALICE}_${BOB}`)));
  });
});

describe('posts', () => {
  it('can be created by the owner when not for sale', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'posts', 'new'), validPost()));
  });

  it('cannot be created as someone else, with a spoofed username, or with a foreign image path', async () => {
    await assertFails(setDoc(doc(as(BOB), 'posts', 'new'), validPost()));
    await assertFails(setDoc(doc(as(ALICE), 'posts', 'new'), validPost({ ownerUsername: 'bob' })));
    await assertFails(setDoc(doc(as(ALICE), 'posts', 'new'), validPost({ imagePath: `posts/${BOB}/x.jpg` })));
  });

  it('cannot start with pre-filled counters', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'posts', 'new'), validPost({ ratingSum: 500, ratingCount: 100 })));
    await assertFails(setDoc(doc(as(ALICE), 'posts', 'new'), validPost({ commentCount: 3 })));
  });

  it('can only be listed for sale by a seller who finished Stripe onboarding', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'posts', 'sale'), validPost({ priceCents: 2500, quantity: 2 })));
    await assertSucceeds(setDoc(doc(as(BOB), 'posts', 'sale'), validPost({ ownerUid: BOB, ownerUsername: 'bob', imagePath: `posts/${BOB}/s.jpg`, priceCents: 2500, quantity: 2 })));
  });

  it('enforces sane prices and quantities', async () => {
    const bobPost = (over) => validPost({ ownerUid: BOB, ownerUsername: 'bob', imagePath: `posts/${BOB}/s.jpg`, ...over });
    await assertFails(setDoc(doc(as(BOB), 'posts', 's'), bobPost({ priceCents: 10, quantity: 1 })));
    await assertFails(setDoc(doc(as(BOB), 'posts', 's'), bobPost({ priceCents: 25.5, quantity: 1 })));
    await assertFails(setDoc(doc(as(BOB), 'posts', 's'), bobPost({ priceCents: 2500, quantity: 0 })));
    await assertFails(setDoc(doc(as(BOB), 'posts', 's'), bobPost({ priceCents: 0, quantity: 5 })));
  });

  it('can be edited by the owner but not their counters or ownership', async () => {
    const ref = doc(as(ALICE), 'posts', 'p1');
    await assertSucceeds(updateDoc(ref, { caption: 'Edited' }));
    await assertFails(updateDoc(ref, { ratingSum: 500, ratingCount: 100 }));
    await assertFails(updateDoc(ref, { ownerUid: BOB }));
    await assertFails(updateDoc(ref, { imageURL: 'https://evil.example/x.jpg' }));
  });

  it('cannot be edited or deleted by someone else', async () => {
    await assertFails(updateDoc(doc(as(BOB), 'posts', 'p1'), { caption: 'hacked' }));
    await assertFails(deleteDoc(doc(as(BOB), 'posts', 'p1')));
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'posts', 'p1')));
  });
});

describe('ratings', () => {
  const rating = (stars, username = 'bob') => ({ stars, username, updatedAt: serverTimestamp() });

  it('can be given to other people\'s posts', async () => {
    await assertSucceeds(setDoc(doc(as(BOB), 'posts', 'p1', 'ratings', BOB), rating(5)));
  });

  it('must be 1 to 5 whole stars, for yourself, and not on your own post', async () => {
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'ratings', BOB), rating(6)));
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'ratings', BOB), rating(0)));
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'ratings', BOB), rating(4.5)));
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'ratings', ALICE), rating(5)));
    await assertFails(setDoc(doc(as(ALICE), 'posts', 'p1', 'ratings', ALICE), rating(5, 'alice')));
  });

  it('can be changed afterwards by the same user only', async () => {
    await assertSucceeds(setDoc(doc(as(BOB), 'posts', 'p1', 'ratings', BOB), rating(2)));
    await assertSucceeds(updateDoc(doc(as(BOB), 'posts', 'p1', 'ratings', BOB), { stars: 4, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as(ALICE), 'posts', 'p1', 'ratings', BOB), { stars: 1, updatedAt: serverTimestamp() }));
  });
});

describe('comments', () => {
  const comment = (over = {}) => ({ authorUid: BOB, username: 'bob', text: 'Lovely', createdAt: serverTimestamp(), ...over });

  it('can be posted as yourself', async () => {
    await assertSucceeds(setDoc(doc(as(BOB), 'posts', 'p1', 'comments', 'c1'), comment()));
  });

  it('cannot be empty, too long, or posted as someone else', async () => {
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'comments', 'c1'), comment({ text: '' })));
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'comments', 'c1'), comment({ text: 'x'.repeat(501) })));
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'comments', 'c1'), comment({ authorUid: ALICE, username: 'alice' })));
    await assertFails(setDoc(doc(as(BOB), 'posts', 'p1', 'comments', 'c1'), comment({ username: 'alice' })));
  });

  it('can be deleted by the author or the post owner, not by strangers', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'posts', 'p1', 'comments', 'c1'), { ...comment(), createdAt: new Date() }));
    await assertFails(deleteDoc(doc(as('stranger'), 'posts', 'p1', 'comments', 'c1')));
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'posts', 'p1', 'comments', 'c1')));
  });
});

describe('seller reviews', () => {
  const review = () => ({ sellerUid: ALICE, raterUid: BOB, raterUsername: 'bob', stars: 5, comment: 'Great', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

  it('are rejected without a purchase', async () => {
    await assertFails(setDoc(doc(as(BOB), 'sellerReviews', `${ALICE}_${BOB}`), review()));
  });

  it('are allowed after a purchase', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'purchases', `${ALICE}_${BOB}`), { at: new Date() }));
    await assertSucceeds(setDoc(doc(as(BOB), 'sellerReviews', `${ALICE}_${BOB}`), review()));
  });
});

describe('orders', () => {
  beforeEach(() =>
    env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'orders', 'o1'), { buyerUid: BOB, sellerUid: ALICE, shippingAddress: { line1: '1 Main St' } }),
    ),
  );

  it('are readable by the buyer and seller only', async () => {
    await assertSucceeds(getDoc(doc(as(BOB), 'orders', 'o1')));
    await assertSucceeds(getDoc(doc(as(ALICE), 'orders', 'o1')));
    await assertFails(getDoc(doc(as('stranger'), 'orders', 'o1')));
  });

  it('can never be written by clients', async () => {
    await assertFails(updateDoc(doc(as(BOB), 'orders', 'o1'), { status: 'refunded' }));
    await assertFails(setDoc(doc(as(BOB), 'orders', 'o2'), { buyerUid: BOB, sellerUid: ALICE }));
  });
});

describe('notifications', () => {
  beforeEach(() =>
    env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'notifications', ALICE, 'items', 'n1'), { type: 'follow', read: false })),
  );

  it('are private, can be marked read, and cannot be forged', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'notifications', ALICE, 'items', 'n1')));
    await assertFails(getDoc(doc(as(BOB), 'notifications', ALICE, 'items', 'n1')));
    await assertSucceeds(updateDoc(doc(as(ALICE), 'notifications', ALICE, 'items', 'n1'), { read: true }));
    await assertFails(updateDoc(doc(as(ALICE), 'notifications', ALICE, 'items', 'n1'), { type: 'buy' }));
    await assertFails(setDoc(doc(as(BOB), 'notifications', ALICE, 'items', 'fake'), { type: 'buy', read: false }));
  });
});

describe('reports', () => {
  const report = (over = {}) => ({ reporterUid: BOB, targetType: 'post', targetId: 'p1', reason: 'spam', details: '', createdAt: serverTimestamp(), ...over });

  it('can be filed but not read back', async () => {
    await assertSucceeds(setDoc(doc(as(BOB), 'reports', 'r1'), report()));
    await assertFails(getDoc(doc(as(BOB), 'reports', 'r1')));
  });

  it('must be filed as yourself with a known reason', async () => {
    await assertFails(setDoc(doc(as(BOB), 'reports', 'r1'), report({ reporterUid: ALICE })));
    await assertFails(setDoc(doc(as(BOB), 'reports', 'r1'), report({ reason: 'because' })));
  });
});

describe('anything else', () => {
  it('is denied', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'whatever', 'x'), { a: 1 }));
    await assertFails(updateDoc(doc(as(ALICE), 'posts', 'p1'), { ratingCount: increment(1) }));
  });
});
