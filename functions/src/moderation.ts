import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineString } from 'firebase-functions/params';

import { shouldAutoHide, targetPath, type ReportLike } from './moderationLogic';

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
  const report = event.data?.data() as { reporterUid: string; targetType: string; targetId: string; reason: string } | undefined;
  if (!report || !event.data) return;
  await event.data.ref.update({ status: 'open', triagedAt: FieldValue.serverTimestamp() });

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
