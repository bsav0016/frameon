import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '../firebase';
import { profileSchema, type Profile } from '../models';
import { parseSnap, parseSnaps } from './parse';

export async function getProfile(uid: string): Promise<Profile | null> {
  return parseSnap(profileSchema, await getDoc(doc(db, 'profiles', uid)), 'uid');
}

export async function updateProfile(uid: string, fields: { name?: string; bio?: string; photoURL?: string | null }) {
  await updateDoc(doc(db, 'profiles', uid), fields);
}

/** Prefix search on the lowercase username. Usernames are stored lowercase in `usernameLower` by registerAccount. */
export async function searchProfiles(text: string, max = 20): Promise<Profile[]> {
  const prefix = text.trim().toLowerCase();
  if (prefix.length === 0) return [];
  const snap = await getDocs(
    query(collection(db, 'profiles'), orderBy('usernameLower'), where('usernameLower', '>=', prefix), where('usernameLower', '<=', `${prefix}`), limit(max)),
  );
  return parseSnaps(profileSchema, snap.docs, 'uid');
}

/** Uploads under a unique name so the CDN never serves a stale avatar, then points the profile at it. */
export async function uploadAvatar(uid: string, localUri: string) {
  const blob = await (await fetch(localUri)).blob();
  const imageRef = ref(storage, `avatars/${uid}/${Date.now()}.jpg`);
  await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
  await updateProfile(uid, { photoURL: await getDownloadURL(imageRef) });
}

export async function getProfileStats(uid: string) {
  const [posts, followers, following] = await Promise.all([
    getCountFromServer(query(collection(db, 'posts'), where('ownerUid', '==', uid))),
    getCountFromServer(query(collection(db, 'follows'), where('followee', '==', uid))),
    getCountFromServer(query(collection(db, 'follows'), where('follower', '==', uid))),
  ]);
  return { posts: posts.data().count, followers: followers.data().count, following: following.data().count };
}
