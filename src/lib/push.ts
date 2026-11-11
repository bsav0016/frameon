import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from './firebase';
import { postHref, userHref } from './routes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let registered: { uid: string; token: string } | null = null;

/**
 * Asks for permission and stores this device's Expo push token under the user. Returns quietly when push
 * cannot work (simulator, permission denied, or the EAS project id has not been configured yet).
 */
export async function registerForPush(uid: string): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Activity', importance: 3 /* AndroidImportance.DEFAULT */ });
    }
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!status.granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await setDoc(doc(db, 'users', uid, 'devices', token), { platform: Platform.OS === 'ios' ? 'ios' : 'android', createdAt: serverTimestamp() });
    registered = { uid, token };
  } catch (e) {
    console.warn('Push registration skipped', e);
  }
}

/** Stops this device receiving the user's notifications. Call before signing out. */
export async function unregisterPush(): Promise<void> {
  if (!registered) return;
  const { uid, token } = registered;
  registered = null;
  await deleteDoc(doc(db, 'users', uid, 'devices', token)).catch(() => undefined);
}

/** Opens the relevant screen when a notification is tapped. */
export function handleNotificationTap(data: Record<string, unknown> | undefined) {
  if (!data) return;
  if (data.type === 'purchase') router.push('/orders');
  else if (typeof data.postId === 'string') router.push(postHref(data.postId));
  else if (typeof data.fromUid === 'string') router.push(userHref(data.fromUid));
}
