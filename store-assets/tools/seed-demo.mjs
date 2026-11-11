// Fills the Firebase project with a small believable community so store screenshots have something to show.
// Usage: node seed-demo.mjs seed | node seed-demo.mjs cleanup   (run from anywhere; needs gcloud logged in for `seed`)
// Everything goes through the same callables and security rules as the real app, except the demo artists'
// `chargesEnabled` seller flag, which normally comes from Stripe onboarding and is set here with gcloud credentials.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..') + '/';
const require = createRequire(root + 'package.json');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken, signOut } = require('firebase/auth');
const { getFirestore, doc, collection, setDoc, serverTimestamp } = require('firebase/firestore');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const env = Object.fromEntries(
  readFileSync(root + '.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app, 'us-central1');
const storage = getStorage(app);
const call = (name, data) => httpsCallable(fns, name)(data).then((r) => r.data);

const STATE = join(here, 'demo-state.json');
// A fresh random password per seeding run, kept only in the gitignored state file (never committed).
const saved = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const PASSWORD = saved.password ?? `Demo-${randomBytes(9).toString('base64url')}-1!`;
const ART = join(here, 'demo-art');

const USERS = {
  elena: { username: 'elena.moreau', name: 'Elena Moreau', bio: 'Landscape painter. Oil and gouache, mostly on panel. Based in Minnesota.' },
  kai: { username: 'kai_nakamura', name: 'Kai Nakamura', bio: 'Abstract color studies. Originals and small-run prints.' },
  marlow: { username: 'marlow.studio', name: 'Marlow Studio', bio: 'Botanical and geometric work in ink, gouache and paper.' },
  avery: { username: 'avery_lane', name: 'Avery Lane', bio: 'Collector and weekend watercolorist.' },
};

// [owner, art file, caption, priceCents, quantity]
const POSTS = [
  ['elena', 'dusk-ridge', 'Dusk over the ridge. Gouache on panel, 24 x 30 in.', 28000, 1],
  ['kai', 'ember-field', 'Ember Field No. 3. Acrylic on canvas, 36 x 48 in.', 36000, 1],
  ['marlow', 'monstera', 'Monstera study. Ink and gouache on paper, 18 x 24 in.', 12000, 3],
  ['avery', 'tidal', 'Morning swim, Lake Superior. Watercolor on paper.', 0, 0],
  ['elena', 'birch-hollow', 'Birch Hollow. Oil on canvas, 30 x 40 in.', 42000, 1],
  ['kai', 'composition', 'Composition IV. Cut paper collage, limited run of 5 prints.', 9500, 5],
  ['marlow', 'dune-light', 'Dune Light. Giclee print, edition of 25.', 6500, 25],
  ['elena', 'moonlit', 'Moonlit lake, first snow coming.', 0, 0],
];

// [rater, post art, stars]
const RATINGS = [
  ['kai', 'dusk-ridge', 5], ['marlow', 'dusk-ridge', 5], ['avery', 'dusk-ridge', 5],
  ['kai', 'birch-hollow', 4], ['marlow', 'birch-hollow', 5], ['avery', 'birch-hollow', 5],
  ['marlow', 'moonlit', 4], ['avery', 'moonlit', 5],
  ['elena', 'ember-field', 5], ['marlow', 'ember-field', 4], ['avery', 'ember-field', 5],
  ['elena', 'composition', 4], ['avery', 'composition', 5],
  ['elena', 'monstera', 5], ['kai', 'monstera', 5], ['avery', 'monstera', 4],
  ['elena', 'dune-light', 4], ['kai', 'dune-light', 5],
  ['elena', 'tidal', 5], ['kai', 'tidal', 4], ['marlow', 'tidal', 5],
];

// [author, post art, text]
const COMMENTS = [
  ['avery', 'dusk-ridge', 'That glow at the horizon is perfect.'],
  ['kai', 'dusk-ridge', 'The layered ridges feel so quiet.'],
  ['elena', 'ember-field', 'Those soft edges. How many glazes?'],
  ['avery', 'ember-field', 'This would be stunning in my hallway.'],
  ['marlow', 'birch-hollow', 'Love the depth you got here.'],
  ['avery', 'monstera', 'The leaf shapes are so fresh.'],
  ['elena', 'tidal', 'The teal bands are gorgeous, Avery!'],
  ['marlow', 'tidal', 'Makes me want to jump in.'],
];

// [follower, followee]
const FOLLOWS = [
  ['avery', 'elena'], ['avery', 'kai'], ['avery', 'marlow'],
  ['elena', 'avery'], ['kai', 'avery'], ['marlow', 'avery'], ['kai', 'elena'], ['marlow', 'elena'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function signInAs(key) {
  const { token } = await call('signInWithUsername', { username: USERS[key].username, password: PASSWORD });
  return (await signInWithCustomToken(auth, token)).user.uid;
}

function setSellerFlag(uid) {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const url = `https://firestore.googleapis.com/v1/projects/${env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=chargesEnabled`;
  const res = execSync(`curl -s -X PATCH -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d "{\\"fields\\":{\\"chargesEnabled\\":{\\"booleanValue\\":true}}}" "${url}"`, { encoding: 'utf8' });
  if (res.includes('"error"')) throw new Error(res);
}

async function seed() {
  const state = { password: PASSWORD, uids: {}, posts: {} };
  for (const [key, u] of Object.entries(USERS)) {
    await call('registerAccount', { username: u.username, email: `demo+${key}@example.com`, password: PASSWORD, name: u.name, acceptedTerms: true });
    state.uids[key] = await signInAs(key);
    await setDoc(doc(db, 'profiles', state.uids[key]), { name: u.name, bio: u.bio, photoURL: null }, { merge: true }).catch(() => {});
    console.log('registered', u.username);
  }
  writeFileSync(STATE, JSON.stringify(state, null, 2));

  for (const key of ['elena', 'kai', 'marlow']) setSellerFlag(state.uids[key]);
  console.log('seller flags set');

  for (const [owner, art, caption, priceCents, quantity] of POSTS) {
    const uid = await signInAs(owner);
    const postRef = doc(collection(db, 'posts'));
    const imagePath = `posts/${uid}/${postRef.id}.jpg`;
    const imageRef = ref(storage, imagePath);
    await uploadBytes(imageRef, readFileSync(join(ART, `${art}.jpg`)), { contentType: 'image/jpeg' });
    await setDoc(postRef, {
      ownerUid: uid, ownerUsername: USERS[owner].username, caption, imagePath, imageURL: await getDownloadURL(imageRef),
      priceCents, quantity, createdAt: serverTimestamp(), ratingSum: 0, ratingCount: 0, commentCount: 0,
    });
    state.posts[art] = postRef.id;
    console.log('posted', art);
    await sleep(1200);
  }
  writeFileSync(STATE, JSON.stringify(state, null, 2));

  const byUser = (rows, who) => rows.filter((r) => r[0] === who);
  for (const key of Object.keys(USERS)) {
    const uid = await signInAs(key);
    for (const [, followee] of byUser(FOLLOWS, key)) await setDoc(doc(db, 'follows', `${uid}_${state.uids[followee]}`), { follower: uid, followee: state.uids[followee], createdAt: serverTimestamp() });
    for (const [, art, stars] of byUser(RATINGS, key)) await setDoc(doc(db, 'posts', state.posts[art], 'ratings', uid), { stars, username: USERS[key].username, updatedAt: serverTimestamp() });
    for (const [, art, text] of byUser(COMMENTS, key)) {
      await setDoc(doc(collection(db, 'posts', state.posts[art], 'comments')), { authorUid: uid, username: USERS[key].username, text, createdAt: serverTimestamp() });
      await sleep(600);
    }
    console.log('interacted', key);
  }
  await signOut(auth);
  console.log('seeded. Sign in as', USERS.avery.username, '(password is in demo-state.json)');
}

async function cleanup() {
  for (const key of Object.keys(USERS)) {
    try {
      await signInAs(key);
      await call('deleteAccount', {});
      console.log('deleted', USERS[key].username);
    } catch (e) {
      console.log('skip', USERS[key].username, e.code ?? e.message);
    }
  }
  if (existsSync(STATE)) writeFileSync(STATE, '{}'); // forget the password along with the accounts
  process.exit(0);
}

async function avatars() {
  const { updateDoc } = require('firebase/firestore');
  for (const key of Object.keys(USERS)) {
    const uid = await signInAs(key);
    const imageRef = ref(storage, `avatars/${uid}/${Date.now()}.jpg`);
    await uploadBytes(imageRef, readFileSync(join(ART, `avatar-${key}.jpg`)), { contentType: 'image/jpeg' });
    await updateDoc(doc(db, 'profiles', uid), { photoURL: await getDownloadURL(imageRef) });
    console.log('avatar', USERS[key].username);
  }
  process.exit(0);
}

const mode = process.argv[2];
if (mode === 'seed') seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
else if (mode === 'cleanup') cleanup();
else if (mode === 'avatars') avatars();
else console.log('usage: node seed-demo.mjs seed|avatars|cleanup');
