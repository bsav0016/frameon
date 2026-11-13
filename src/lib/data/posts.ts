import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '../firebase';
import { commentSchema, postSchema, ratingSchema, type Comment, type Post, type Rating } from '../models';
import { isVisibleTo } from '../moderation';
import { chunk, parseSnap, parseSnaps } from './parse';

const PAGE = 20;
// Firestore allows at most 30 values in an `in` filter, so feeds query followees in chunks and merge.
const IN_LIMIT = 30;

export type Page<T> = { items: T[]; cursor: DocumentSnapshot | null };

export async function getPost(id: string): Promise<Post | null> {
  return parseSnap(postSchema, await getDoc(doc(db, 'posts', id)), 'id');
}

/** Owners still see their own hidden posts (flagged in the UI); everyone else does not. */
export async function listUserPosts(ownerUid: string, after?: DocumentSnapshot | null, viewerUid?: string): Promise<Page<Post>> {
  const q = query(
    collection(db, 'posts'),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc'),
    ...(after ? [startAfter(after)] : []),
    limit(PAGE),
  );
  const snap = await getDocs(q);
  return {
    items: parseSnaps(postSchema, snap.docs, 'id').filter((p) => isVisibleTo(p, viewerUid)),
    cursor: snap.docs.length === PAGE ? snap.docs[snap.docs.length - 1] : null,
  };
}

/** Newest posts from the given owners (people the user follows plus themselves), minus blocked users. */
export async function listFeed(ownerUids: string[], blocked: string[] = [], before?: Date, viewerUid?: string): Promise<Post[]> {
  const visible = ownerUids.filter((u) => !blocked.includes(u));
  const results = await Promise.all(
    chunk(visible, IN_LIMIT).map((uids) =>
      getDocs(
        query(
          collection(db, 'posts'),
          where('ownerUid', 'in', uids),
          orderBy('createdAt', 'desc'),
          ...(before ? [where('createdAt', '<', before)] : []),
          limit(PAGE),
        ),
      ),
    ),
  );
  return results
    .flatMap((s) => parseSnaps(postSchema, s.docs, 'id'))
    .filter((p) => isVisibleTo(p, viewerUid))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, PAGE);
}

export async function listExplore(blocked: string[] = [], after?: DocumentSnapshot | null, viewerUid?: string): Promise<Page<Post>> {
  const snap = await getDocs(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'), ...(after ? [startAfter(after)] : []), limit(PAGE)),
  );
  return {
    items: parseSnaps(postSchema, snap.docs, 'id').filter((p) => !blocked.includes(p.ownerUid) && isVisibleTo(p, viewerUid)),
    cursor: snap.docs.length === PAGE ? snap.docs[snap.docs.length - 1] : null,
  };
}

/** Uploads the picked photo, then creates the post document that points at it. */
export async function createPost(args: {
  uid: string;
  username: string;
  localUri: string;
  caption: string;
  priceCents: number;
  quantity: number;
}): Promise<string> {
  const postRef = doc(collection(db, 'posts'));
  const imagePath = `posts/${args.uid}/${postRef.id}.jpg`;
  const blob = await (await fetch(args.localUri)).blob();
  const imageRef = ref(storage, imagePath);
  await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
  const imageURL = await getDownloadURL(imageRef);
  await setDoc(postRef, {
    ownerUid: args.uid,
    ownerUsername: args.username,
    caption: args.caption.trim(),
    imagePath,
    imageURL,
    priceCents: args.priceCents,
    quantity: args.quantity,
    createdAt: serverTimestamp(),
    ratingSum: 0,
    ratingCount: 0,
    commentCount: 0,
  });
  return postRef.id;
}

export async function updatePost(id: string, fields: { caption: string; priceCents: number; quantity: number }) {
  await updateDoc(doc(db, 'posts', id), { ...fields, caption: fields.caption.trim() });
}

/** The onPostDeleted function removes ratings, comments and the photo. */
export async function deletePost(id: string) {
  await deleteDoc(doc(db, 'posts', id));
}

// ---- ratings ----
export async function getMyRating(postId: string, uid: string): Promise<Rating | null> {
  return parseSnap(ratingSchema, await getDoc(doc(db, 'posts', postId, 'ratings', uid)), 'uid');
}

export async function setRating(postId: string, uid: string, username: string, stars: number, hadRating: boolean) {
  const r = doc(db, 'posts', postId, 'ratings', uid);
  if (hadRating) await updateDoc(r, { stars, updatedAt: serverTimestamp() });
  else await setDoc(r, { stars, username, updatedAt: serverTimestamp() });
}

export async function removeRating(postId: string, uid: string) {
  await deleteDoc(doc(db, 'posts', postId, 'ratings', uid));
}

// ---- comments ----
export async function listComments(postId: string, blocked: string[] = [], viewerUid?: string): Promise<Comment[]> {
  const snap = await getDocs(query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(200)));
  return parseSnaps(commentSchema, snap.docs, 'id').filter((c) => !blocked.includes(c.authorUid) && isVisibleTo(c, viewerUid));
}

export async function addComment(postId: string, uid: string, username: string, text: string) {
  await setDoc(doc(collection(db, 'posts', postId, 'comments')), {
    authorUid: uid,
    username,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function deleteComment(postId: string, commentId: string) {
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
}
