import { Stack, useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/profile-view';
import { useProfile } from '@/lib/queries';

export default function UserScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const profile = useProfile(uid);
  return (
    <>
      <Stack.Screen options={{ title: profile.data?.username ?? 'Profile' }} />
      <ProfileView uid={uid} />
    </>
  );
}
