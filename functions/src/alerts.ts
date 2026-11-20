import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';

const db = getFirestore();

// uid of the moderator's account. Their registered devices receive the alerts. Empty means log only.
const MODERATOR_UID = defineString('MODERATOR_UID', { default: '' });

/** Pushes an alert to the developer's devices (moderation findings, payment disputes). */
export async function alertModerator(title: string, body: string, data: Record<string, unknown>) {
  const uid = MODERATOR_UID.value();
  if (!uid) {
    logger.warn('MODERATOR_UID is not set; moderation alert not pushed', { title, body });
    return;
  }
  const devices = await db.collection(`users/${uid}/devices`).get();
  if (devices.empty) return;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(devices.docs.map((d) => ({ to: d.id, title, body, sound: 'default', data }))),
  });
  if (!res.ok) logger.error('Expo push request failed', { status: res.status });
}
