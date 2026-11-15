import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

/** Moderators only: the server checks the caller. Hiding also tells the owner and closes the item's reports. */
export async function moderateContent(args: { targetType: 'post' | 'comment'; targetId: string; action: 'hide' | 'unhide' }) {
  const res = await httpsCallable<typeof args, { status: 'hidden' | 'active' }>(functions, 'moderateContent')(args);
  return res.data.status;
}
