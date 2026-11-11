import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

const db = getFirestore();

interface Item {
  type: 'rating' | 'comment' | 'follow' | 'purchase';
  fromUid: string;
  fromUsername: string;
  postId: string | null;
  stars: number | null;
}

function message(n: Item): { title: string; body: string } {
  switch (n.type) {
    case 'rating':
      return { title: 'New rating', body: `${n.fromUsername} rated your post ${n.stars ?? ''} ${n.stars === 1 ? 'star' : 'stars'}` };
    case 'comment':
      return { title: 'New comment', body: `${n.fromUsername} commented on your post` };
    case 'follow':
      return { title: 'New follower', body: `${n.fromUsername} started following you` };
    case 'purchase':
      return { title: 'You made a sale', body: `${n.fromUsername} bought your art` };
  }
}

/** Sends the in-app notification as a push to every device the recipient registered, via Expo's push service. */
export const sendPush = onDocumentCreated({ region: 'us-central1', document: 'notifications/{uid}/items/{id}' }, async (event) => {
  const item = event.data?.data() as Item | undefined;
  if (!item) return;
  const devices = await db.collection(`users/${event.params.uid}/devices`).get();
  if (devices.empty) return;

  const { title, body } = message(item);
  const tokens = devices.docs.map((d) => d.id);
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: 'default', data: { type: item.type, postId: item.postId, fromUid: item.fromUid } }))),
  });
  if (!res.ok) {
    logger.error('Expo push request failed', { status: res.status });
    return;
  }
  // Drop tokens Expo says are no longer valid (app uninstalled, permission revoked).
  const { data } = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
  await Promise.all(
    (data ?? []).map((ticket, i) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? devices.docs[i].ref.delete() : Promise.resolve(),
    ),
  );
});
