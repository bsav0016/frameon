import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '../firebase';
import { notificationSchema, type AppNotification } from '../models';
import { parseSnaps } from './parse';

const items = (uid: string) => collection(db, 'notifications', uid, 'items');

export async function listNotifications(uid: string): Promise<AppNotification[]> {
  const snap = await getDocs(query(items(uid), orderBy('createdAt', 'desc'), limit(50)));
  return parseSnaps(notificationSchema, snap.docs, 'id');
}

/** Live unread count for the tab badge. Returns an unsubscribe function. */
export function watchUnreadCount(uid: string, onCount: (n: number) => void) {
  return onSnapshot(
    query(items(uid), where('read', '==', false), limit(100)),
    (snap) => onCount(snap.size),
    () => onCount(0),
  );
}

export async function markAllRead(uid: string) {
  const snap = await getDocs(query(items(uid), where('read', '==', false), limit(100)));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function markRead(uid: string, id: string) {
  await updateDoc(doc(items(uid), id), { read: true });
}

export async function dismiss(uid: string, id: string) {
  await deleteDoc(doc(items(uid), id));
}
