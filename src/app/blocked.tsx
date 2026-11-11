import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, EmptyState, Screen, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { getProfile } from '@/lib/data/profiles';
import { unblock } from '@/lib/data/social';
import { useBlocked, useRefreshLists, useUid } from '@/lib/queries';

function BlockedRow({ uid: otherUid }: { uid: string }) {
  const toast = useToast();
  const me = useUid();
  const refresh = useRefreshLists();
  const profile = useQuery({ queryKey: ['profile', otherUid], queryFn: () => getProfile(otherUid) });
  const name = profile.data?.username ?? 'Unknown user';

  const undo = async () => {
    try {
      await unblock(me, otherUid);
      await refresh();
    } catch {
      toast('Could not unblock. Please try again.', 'error');
    }
  };

  return (
    <View style={styles.row}>
      <Avatar uri={profile.data?.photoURL} name={name} size={40} />
      <Text variant="label" style={styles.flex}>
        {name}
      </Text>
      <Button title="Unblock" variant="secondary" onPress={undo} />
    </View>
  );
}

export default function BlockedScreen() {
  const blocked = useBlocked();
  return (
    <Screen scroll>
      {(blocked.data ?? []).length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="No blocked users" message="People you block will appear here." />
      ) : (
        blocked.data!.map((uid) => <BlockedRow key={uid} uid={uid} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
