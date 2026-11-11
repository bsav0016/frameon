import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { StarRating } from '@/components/star-rating';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCount, formatPrice, timeAgo } from '@/lib/format';
import type { Post } from '@/lib/models';
import { useProfile } from '@/lib/queries';
import { postHref, userHref } from '@/lib/routes';

export function PostCard({ post }: { post: Post }) {
  const theme = useTheme();
  const owner = useProfile(post.ownerUid);
  const rating = post.ratingCount === 0 ? 0 : post.ratingSum / post.ratingCount;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`View ${post.ownerUsername}'s profile`}
        onPress={() => router.push(userHref(post.ownerUid))}>
        <Avatar uri={owner.data?.photoURL} name={post.ownerUsername} size={36} />
        <View style={styles.flex}>
          <Text variant="label">{post.ownerUsername}</Text>
          <Text variant="caption" muted>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
        {post.priceCents > 0 && post.quantity > 0 ? (
          <View style={[styles.price, { backgroundColor: theme.accent }]}>
            <Text variant="label" style={{ color: '#3B2610' }}>
              {formatPrice(post.priceCents)}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable accessibilityRole="imagebutton" accessibilityLabel="Open post" onPress={() => router.push(postHref(post.id))}>
        <Image source={{ uri: post.imageURL }} style={[styles.image, { backgroundColor: theme.surfaceMuted }]} contentFit="contain" transition={200} />
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.row}>
          <StarRating value={rating} />
          <Text variant="caption" muted>
            {formatCount(post.ratingCount, 'Rating')}
          </Text>
          <View style={styles.flex} />
          <Ionicons name="chatbubble-outline" size={16} color={theme.textMuted} />
          <Text variant="caption" muted>
            {post.commentCount}
          </Text>
        </View>
        {post.caption ? (
          <Text numberOfLines={2}>
            <Text variant="label">{post.ownerUsername} </Text>
            {post.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: 'hidden', marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  flex: { flex: 1 },
  image: { width: '100%', aspectRatio: 4 / 5 },
  footer: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
});
