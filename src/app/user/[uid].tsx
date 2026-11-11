import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { ProfileView } from '@/components/profile-view';
import { useToast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { block } from '@/lib/data/social';
import { useProfile, useRefreshLists, useUid } from '@/lib/queries';

export default function UserScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const theme = useTheme();
  const toast = useToast();
  const me = useUid();
  const profile = useProfile(uid);
  const refreshLists = useRefreshLists();
  const name = profile.data?.username ?? 'this user';

  const confirmBlock = () =>
    Alert.alert(`Block ${name}?`, 'You will no longer see their posts or comments, and they cannot buy from you. You can unblock them in Settings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await block(me, uid);
            await refreshLists();
            toast(`Blocked ${name}`, 'success');
            router.back();
          } catch {
            toast('Could not block. Please try again.', 'error');
          }
        },
      },
    ]);

  const openMenu = () =>
    Alert.alert(name, undefined, [
      { text: 'Report user', onPress: () => router.push({ pathname: '/report', params: { type: 'user', id: uid } } as never) },
      { text: 'Block user', style: 'destructive', onPress: confirmBlock },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.data?.username ?? 'Profile',
          headerRight:
            uid === me
              ? undefined
              : () => (
                  <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="More options" onPress={openMenu}>
                    <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
                  </Pressable>
                ),
        }}
      />
      <ProfileView uid={uid} />
    </>
  );
}
