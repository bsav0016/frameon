import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { getStorage } from 'firebase-admin/storage';
import { defineString } from 'firebase-functions/params';

import { imageAction, parseImagePath, shouldAutoHide, targetPath, type ReportLike } from './moderationLogic';

const db = getFirestore();

// uid of the moderator's account. Their registered devices receive the alerts. Empty means log only.
const MODERATOR_UID = defineString('MODERATOR_UID', { default: '' });

async function alertModerator(title: string, body: string, data: Record<string, unknown>) {
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

/**
 * Triages every new report: marks it open, hides a post or comment once enough different people have reported it,
 * and alerts the moderator. Hiding is reversible with `functions/scripts/moderate.mjs unhide`.
 */
export const onReportCreated = onDocumentCreated({ region: 'us-central1', document: 'reports/{reportId}' }, async (event) => {
  const report = event.data?.data() as { reporterUid: string; targetType: string; targetId: string; reason: string; status?: string } | undefined;
  if (!report || !event.data) return;
  await event.data.ref.update({ status: report.status ?? 'open', triagedAt: FieldValue.serverTimestamp() });

  let hidden = false;
  const path = targetPath(report.targetType, report.targetId);
  if (path) {
    const target = await db.doc(path).get();
    const data = target.data() as { ownerUid?: string; authorUid?: string; status?: string } | undefined;
    if (data && data.status !== 'hidden') {
      const siblings = await db.collection('reports').where('targetType', '==', report.targetType).where('targetId', '==', report.targetId).get();
      const reports = siblings.docs.map((d) => d.data() as ReportLike);
      if (shouldAutoHide(reports, data.ownerUid ?? data.authorUid)) {
        await target.ref.update({ status: 'hidden', hiddenAt: FieldValue.serverTimestamp(), hiddenReason: 'reports' });
        hidden = true;
        logger.info('Auto-hid reported content', { path });
      }
    }
  }

  await alertModerator(
    hidden ? 'Content auto-hidden' : 'New report',
    `${report.targetType} reported for ${report.reason}${hidden ? ' (hidden after repeated reports)' : ''}`,
    { type: 'report', targetType: report.targetType, targetId: report.targetId },
  );
});

// ---- image screening ----

const vision = new ImageAnnotatorClient();

/** The photo is uploaded before its post document is written, so wait briefly for the post to exist. */
async function waitForPost(postId: string) {
  for (let i = 0; i < 10; i++) {
    const snap = await db.doc(`posts/${postId}`).get();
    if (snap.exists) return snap;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

/** Files a system report so the finding shows up in `moderate.mjs list` and alerts the moderator. */
async function fileAutoReport(targetType: 'post' | 'user', targetId: string, details: string) {
  await db.collection('reports').add({
    reporterUid: 'system',
    targetType,
    targetId,
    reason: 'inappropriate',
    details,
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Screens every uploaded post photo and avatar with SafeSearch. Very likely adult or violent images are hidden
 * (posts) or removed (avatars) at once; borderline ones are queued for review. Failures are logged, never fatal:
 * the upload has already succeeded and user reports remain the backstop.
 */
export const onImageUploaded = onObjectFinalized({ region: 'us-central1', memory: '512MiB', timeoutSeconds: 120 }, async (event) => {
  const { name, bucket } = event.data;
  const target = parseImagePath(name);
  if (!target) return;

  let action;
  let summary;
  try {
    const [result] = await vision.safeSearchDetection(`gs://${bucket}/${name}`);
    const ss = result.safeSearchAnnotation;
    if (!ss) return;
    action = imageAction(ss);
    summary = `auto: adult=${ss.adult} violence=${ss.violence} racy=${ss.racy}`;
  } catch (e) {
    logger.error('SafeSearch failed', { name, e });
    return;
  }
  if (action === 'ok') return;

  if (target.kind === 'post') {
    if (action === 'hide') {
      const post = await waitForPost(target.postId);
      if (post && post.data()?.ownerUid === target.uid) {
        await post.ref.update({ status: 'hidden', hiddenAt: FieldValue.serverTimestamp(), hiddenReason: 'image' });
      }
    }
    // Hidden or not, a human should look: this also alerts the moderator.
    await fileAutoReport('post', target.postId, summary);
    return;
  }

  // Avatar: remove it from the profile and storage when certain, otherwise queue for review.
  if (action === 'hide') {
    await db.doc(`profiles/${target.uid}`).update({ photoURL: null });
    await getStorage().bucket(bucket).file(name).delete({ ignoreNotFound: true });
  }
  await fileAutoReport('user', target.uid, summary);
});
