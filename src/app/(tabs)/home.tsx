import { FlatList, RefreshControl, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { EmptyState, Skeleton } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useFeed } from '@/lib/queries';

export default function HomeScreen() {
  const theme = useTheme();
  const feed = useFeed();
  const posts = feed.data?.pages.flat() ?? [];

  if (feed.isLoading || (!feed.data && !feed.isError)) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: 16, gap: 16 }}>
        <Skeleton height={420} />
        <Skeleton height={420} />
      </View>
    );
  }

  if (feed.isError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState icon="cloud-offline-outline" title="Couldn't load your feed" message="Check your connection and try again." actionLabel="Try again" onAction={() => feed.refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: 16, flexGrow: 1 }}
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => void feed.refetch()} tintColor={theme.primary} />}
      ListEmptyComponent={
        <EmptyState icon="image-outline" title="Your feed is empty" message="Follow artists from the Search tab, or post your own work." />
      }
    />
  );
}
