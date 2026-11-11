import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar, EmptyState, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markAllRead } from '@/lib/data/notifications';
import { timeAgo } from '@/lib/format';
import type { AppNotification } from '@/lib/models';
import { useNotifications, useUid } from '@/lib/queries';
import { postHref, userHref } from '@/lib/routes';

function describe(n: AppNotification) {
  switch (n.type) {
    case 'rating':
      return `rated your post ${n.stars ?? ''} ${n.stars === 1 ? 'star' : 'stars'}`;
    case 'comment':
      return 'commented on your post';
    case 'follow':
      return 'started following you';
    case 'purchase':
      return 'bought your art';
  }
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const uid = useUid();
  const query = useNotifications();

  // Opening the tab clears the badge. The list keeps showing unread styling until the next refetch.
  useFocusEffect(
    useCallback(() => {
      query.refetch().then(() => markAllRead(uid).catch(() => undefined));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]),
  );

  const open = (n: AppNotification) => router.push(n.type === 'purchase' ? ('/orders' as never) : n.postId ? postHref(n.postId) : userHref(n.fromUid));

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1 }}
      data={query.data ?? []}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.primary} />}
      ListEmptyComponent={query.isLoading ? undefined : <EmptyState icon="notifications-outline" title="No activity yet" message="Ratings, comments and new followers show up here." />}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.row, !item.read && { backgroundColor: theme.surfaceMuted }]}
          accessibilityRole="button"
          accessibilityLabel={`${item.fromUsername} ${describe(item)}`}
          onPress={() => open(item)}>
          <Avatar uri={item.fromPhotoURL} name={item.fromUsername} size={44} />
          <View style={styles.flex}>
            <Text>
              <Text variant="label">{item.fromUsername} </Text>
              {describe(item)}
            </Text>
            <Text variant="caption" muted>
              {timeAgo(item.createdAt)}
            </Text>
          </View>
          {item.type === 'rating' ? <Ionicons name="star" size={18} color={theme.star} /> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1 },
});
