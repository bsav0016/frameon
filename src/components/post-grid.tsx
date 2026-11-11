import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, Pressable, RefreshControl, useWindowDimensions } from 'react-native';

import { EmptyState } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Post } from '@/lib/models';
import { postHref } from '@/lib/routes';

const COLUMNS = 3;
const GAP = 2;

export interface PostGridProps {
  posts: Post[];
  header?: ReactElement;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

/** Square thumbnail grid used by profiles and explore. */
export function PostGrid({ posts, header, onEndReached, refreshing = false, onRefresh, emptyTitle = 'No posts yet', emptyMessage }: PostGridProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <FlatList
      data={posts}
      numColumns={COLUMNS}
      keyExtractor={(p) => p.id}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP }}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState icon="images-outline" title={emptyTitle} message={emptyMessage} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} /> : undefined}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={item.caption || 'Post'} onPress={() => router.push(postHref(item.id))}>
          <Image source={{ uri: item.imageURL }} style={{ width: size, height: size, backgroundColor: theme.surfaceMuted }} contentFit="cover" transition={150} />
        </Pressable>
      )}
    />
  );
}
