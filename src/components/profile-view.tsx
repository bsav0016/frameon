import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostGrid } from '@/components/post-grid';
import { StarRating } from '@/components/star-rating';
import { Avatar, Button, EmptyState, Skeleton, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { follow, unfollow } from '@/lib/data/social';
import { formatCount } from '@/lib/format';
import { useIsFollowing, useProfile, useProfileStats, useRefreshLists, useUid, useUserPosts } from '@/lib/queries';
import { settingsHref } from '@/lib/routes';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

export function ProfileView({ uid }: { uid: string }) {
  const theme = useTheme();
  const toast = useToast();
  const me = useUid();
  const own = uid === me;
  const profile = useProfile(uid);
  const stats = useProfileStats(uid);
  const posts = useUserPosts(uid);
  const following = useIsFollowing(own ? '' : uid);
  const refreshLists = useRefreshLists();
  const [busy, setBusy] = useState(false);

  const toggleFollow = async () => {
    setBusy(true);
    try {
      if (following.data) await unfollow(me, uid);
      else await follow(me, uid);
      await refreshLists();
    } catch {
      toast('Could not update. Please try again.', 'error');
    }
    setBusy(false);
  };

  if (profile.isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background, padding: spacing.lg, gap: spacing.md }]}>
        <Skeleton height={80} />
        <Skeleton height={200} />
      </View>
    );
  }
  if (!profile.data) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <EmptyState icon="person-outline" title="Profile not found" message="This account may have been deleted." />
      </View>
    );
  }

  const p = profile.data;
  const sellerAverage = p.sellerRatingCount > 0 ? p.sellerRatingSum / p.sellerRatingCount : 0;

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Avatar uri={p.photoURL} name={p.username} size={84} />
        <View style={styles.stats}>
          <Stat value={stats.data?.posts ?? 0} label="Posts" />
          <Stat value={stats.data?.followers ?? 0} label="Followers" />
          <Stat value={stats.data?.following ?? 0} label="Following" />
        </View>
      </View>
      <View>
        <Text variant="heading">{p.username}</Text>
        {p.name ? <Text variant="label">{p.name}</Text> : null}
        {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
      </View>
      {p.sellerRatingCount > 0 ? (
        <View style={styles.seller}>
          <StarRating value={sellerAverage} size={16} />
          <Text variant="caption" muted>
            {formatCount(p.sellerRatingCount, 'Seller review')}
          </Text>
        </View>
      ) : null}
      {own ? (
        <Button title="Edit profile" variant="secondary" onPress={() => router.push(settingsHref)} />
      ) : (
        <Button
          title={following.data ? 'Following' : 'Follow'}
          variant={following.data ? 'secondary' : 'primary'}
          onPress={toggleFollow}
          loading={busy}
          disabled={following.isLoading}
        />
      )}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <PostGrid
        posts={posts.data?.pages.flatMap((pg) => pg.items) ?? []}
        header={header}
        refreshing={posts.isRefetching}
        onRefresh={() => {
          posts.refetch();
          stats.refetch();
          profile.refetch();
        }}
        onEndReached={() => posts.hasNextPage && !posts.isFetchingNextPage && posts.fetchNextPage()}
        emptyMessage={own ? 'Tap Post to share your first piece.' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  bio: { marginTop: spacing.xs },
  seller: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
