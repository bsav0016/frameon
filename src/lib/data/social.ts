import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { db } from '../firebase';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '../models';

export const followId = (follower: string, followee: string) => `${follower}_${followee}`;

export async function isFollowing(me: string, other: string) {
  return (await getDoc(doc(db, 'follows', followId(me, other)))).exists();
}

export async function follow(me: string, other: string) {
  await setDoc(doc(db, 'follows', followId(me, other)), { follower: me, followee: other, createdAt: serverTimestamp() });
}

export async function unfollow(me: string, other: string) {
  await deleteDoc(doc(db, 'follows', followId(me, other)));
}

/** Uids the user follows. */
export async function listFollowing(me: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'follows'), where('follower', '==', me)));
  return snap.docs.map((d) => d.data().followee as string);
}

export async function listFollowers(uid: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'follows'), where('followee', '==', uid)));
  return snap.docs.map((d) => d.data().follower as string);
}

export async function listBlocked(me: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'blocks'), where('blocker', '==', me)));
  return snap.docs.map((d) => d.data().blocked as string);
}

export async function block(me: string, other: string) {
  await setDoc(doc(db, 'blocks', `${me}_${other}`), { blocker: me, blocked: other, createdAt: serverTimestamp() });
  // Blocking also removes the follow in the direction we control.
  await deleteDoc(doc(db, 'follows', followId(me, other)));
}

export async function unblock(me: string, other: string) {
  await deleteDoc(doc(db, 'blocks', `${me}_${other}`));
}

export async function report(args: { reporterUid: string; targetType: ReportTarget; targetId: string; reason: ReportReason; details: string }) {
  if (!REPORT_REASONS.includes(args.reason)) throw new Error('Invalid report reason');
  await setDoc(doc(collection(db, 'reports')), { ...args, details: args.details.trim().slice(0, 500), createdAt: serverTimestamp() });
}
