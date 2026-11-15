#!/usr/bin/env node
// Moderator tooling. Runs locally with your own Google credentials (Admin SDK), so it needs no deploy and no admin UI.
//
//   gcloud auth application-default login          (once)
//   node functions/scripts/moderate.mjs list
//   node functions/scripts/moderate.mjs hide post <postId>
//   node functions/scripts/moderate.mjs hide comment <postId>/<commentId>
//   node functions/scripts/moderate.mjs unhide post|comment <id>   (also dismisses its reports, so they cannot re-hide it)
//   node functions/scripts/moderate.mjs delete-post <postId>      (the onPostDeleted function removes the photo, ratings, comments)
//   node functions/scripts/moderate.mjs suspend <uid>             (disables sign-in; `unsuspend <uid>` reverses it)
//   node functions/scripts/moderate.mjs make-moderator <uid>      (shows the Hide post button in the app; `remove-moderator <uid>` reverses it)
//   node functions/scripts/moderate.mjs dismiss <reportId>        (also: `actioned <reportId>`)
//
// Set FIREBASE_PROJECT to target another project; the default is frameonnew.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const project = process.env.FIREBASE_PROJECT ?? 'frameonnew';
initializeApp({ credential: applicationDefault(), projectId: project });
const db = getFirestore();

const [cmd, a, b] = process.argv.slice(2);

function pathFor(type, id) {
  const parts = (id ?? '').split('/');
  if (type === 'post' && parts.length === 1 && parts[0]) return `posts/${parts[0]}`;
  if (type === 'comment' && parts.length === 2 && parts.every(Boolean)) return `posts/${parts[0]}/comments/${parts[1]}`;
  throw new Error('Usage: <post|comment> <postId> or <postId>/<commentId>');
}

async function setStatus(type, id, status) {
  const ref = db.doc(pathFor(type, id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`${ref.path} does not exist`);
  const data = snap.data();
  if (status === 'hidden' && data.status !== 'hidden') {
    // Same notice the functions send, so the owner is told however the item was hidden.
    const owner = data.ownerUid ?? data.authorUid;
    if (owner) {
      await db.collection(`notifications/${owner}/items`).add({
        type: 'removal', targetType: type, fromUid: 'system', fromUsername: 'FrameOn', fromPhotoURL: null,
        postId: type === 'post' ? snap.id : ref.parent.parent.id, postImageURL: type === 'post' ? (data.imageURL ?? null) : null,
        stars: null, orderId: null, read: false, createdAt: FieldValue.serverTimestamp(),
      });
    }
  }
  await ref.update(
    status === 'hidden'
      ? { status, hiddenAt: FieldValue.serverTimestamp(), hiddenReason: 'moderator' }
      : { status, hiddenAt: FieldValue.delete(), hiddenReason: FieldValue.delete() },
  );
  console.log(`${ref.path} is now ${status}`);
}

async function resolveReports(type, id, status) {
  const snap = await db.collection('reports').where('targetType', '==', type).where('targetId', '==', id).get();
  await Promise.all(snap.docs.map((d) => d.ref.update({ status, resolvedAt: FieldValue.serverTimestamp() })));
}

switch (cmd) {
  case 'list': {
    const snap = await db.collection('reports').get();
    const open = snap.docs.filter((d) => ['open', undefined].includes(d.data().status));
    if (open.length === 0) console.log('No open reports.');
    for (const d of open.sort((x, y) => (x.data().createdAt?.toMillis() ?? 0) - (y.data().createdAt?.toMillis() ?? 0))) {
      const r = d.data();
      console.log(`${d.id}  ${r.createdAt?.toDate().toISOString() ?? '?'}  ${r.targetType} ${r.targetId}  ${r.reason}  by ${r.reporterUid}${r.details ? `  "${r.details}"` : ''}`);
    }
    break;
  }
  case 'hide':
  case 'unhide':
    await setStatus(a, b, cmd === 'hide' ? 'hidden' : 'active');
    await resolveReports(a, b, cmd === 'hide' ? 'actioned' : 'dismissed');
    break;
  case 'delete-post':
    await db.doc(pathFor('post', a)).delete();
    await resolveReports('post', a, 'actioned');
    console.log(`Deleted posts/${a}; the onPostDeleted function cleans up the photo, ratings and comments.`);
    break;
  case 'suspend':
  case 'unsuspend':
    await getAuth().updateUser(a, { disabled: cmd === 'suspend' });
    console.log(`${a} is now ${cmd === 'suspend' ? 'suspended' : 'active'}`);
    break;
  case 'make-moderator':
  case 'remove-moderator':
    await db.doc(`users/${a}`).set({ moderator: cmd === 'make-moderator' }, { merge: true });
    console.log(`${a} is ${cmd === 'make-moderator' ? 'now' : 'no longer'} a moderator`);
    break;
  case 'dismiss':
  case 'actioned':
    await db.doc(`reports/${a}`).update({ status: cmd === 'dismiss' ? 'dismissed' : 'actioned', resolvedAt: FieldValue.serverTimestamp() });
    console.log(`Report ${a} marked ${cmd === 'dismiss' ? 'dismissed' : 'actioned'}`);
    break;
  default:
    console.error('Commands: list | hide|unhide post|comment <id> | delete-post <postId> | suspend|unsuspend <uid> | make-moderator|remove-moderator <uid> | dismiss|actioned <reportId>');
    process.exit(1);
}
