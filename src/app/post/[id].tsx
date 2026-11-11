import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { StarRating } from '@/components/star-rating';
import { Avatar, Button, EmptyState, Screen, Skeleton, Text, TextField, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addComment, deleteComment, deletePost, removeRating, setRating, updatePost } from '@/lib/data/posts';
import { formatCount, formatPrice, parseSaleFields, timeAgo } from '@/lib/format';
import { useCanSell, useComments, useMyRating, usePost, useProfile, useRefreshLists, useUid } from '@/lib/queries';
import { userHref } from '@/lib/routes';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const toast = useToast();
  const uid = useUid();
  const qc = useQueryClient();
  const refreshLists = useRefreshLists();

  const post = usePost(id);
  const owner = useProfile(post.data?.ownerUid);
  const me = useProfile(uid);
  const comments = useComments(id);
  const myRating = useMyRating(id);
  const canSell = useCanSell();

  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  if (post.isLoading) {
    return (
      <Screen>
        <Skeleton height={400} />
      </Screen>
    );
  }
  if (!post.data) {
    return <EmptyState icon="image-outline" title="Post not found" message="It may have been deleted." />;
  }

  const p = post.data;
  const isOwner = p.ownerUid === uid;
  const average = p.ratingCount === 0 ? 0 : p.ratingSum / p.ratingCount;
  const forSale = p.priceCents > 0 && p.quantity > 0;

  // Rating aggregates are updated by a Cloud Function a moment after the write.
  const refetchPostSoon = () => setTimeout(() => qc.invalidateQueries({ queryKey: ['post', id] }), 1500);

  const rate = async (stars: number) => {
    if (!me.data) return;
    try {
      await setRating(id, uid, me.data.username, stars, !!myRating.data);
      await myRating.refetch();
      refetchPostSoon();
    } catch {
      toast('Could not save your rating.', 'error');
    }
  };

  const clearRating = async () => {
    try {
      await removeRating(id, uid);
      await myRating.refetch();
      refetchPostSoon();
    } catch {
      toast('Could not remove your rating.', 'error');
    }
  };

  const send = async () => {
    if (!me.data || !comment.trim()) return;
    setSending(true);
    try {
      await addComment(id, uid, me.data.username, comment);
      setComment('');
      await comments.refetch();
      refetchPostSoon();
    } catch {
      toast('Could not post your comment.', 'error');
    }
    setSending(false);
  };

  const removeComment = (commentId: string) =>
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteComment(id, commentId).catch(() => toast('Could not delete the comment.', 'error'));
          await comments.refetch();
          refetchPostSoon();
        },
      },
    ]);

  const startEdit = () => {
    setCaption(p.caption);
    setPrice(forSale ? (p.priceCents / 100).toFixed(2) : '');
    setQuantity(forSale ? String(p.quantity) : '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const sale = canSell.data || forSale ? parseSaleFields(price, quantity) : { priceCents: 0, quantity: 0 };
    if ('error' in sale) {
      toast(sale.error.message, 'error');
      return;
    }
    setSaving(true);
    try {
      await updatePost(id, { caption, ...sale });
      await Promise.all([post.refetch(), refreshLists()]);
      setEditing(false);
    } catch {
      toast('Could not save changes.', 'error');
    }
    setSaving(false);
  };

  const confirmDelete = () =>
    Alert.alert('Delete post?', 'This also removes its ratings and comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(id);
            await refreshLists();
            router.back();
          } catch {
            toast('Could not delete the post.', 'error');
          }
        },
      },
    ]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Post' }} />
      <Pressable style={styles.owner} accessibilityRole="button" accessibilityLabel={`View ${p.ownerUsername}'s profile`} onPress={() => router.push(userHref(p.ownerUid))}>
        <Avatar uri={owner.data?.photoURL} name={p.ownerUsername} size={40} />
        <View style={styles.flex}>
          <Text variant="label">{p.ownerUsername}</Text>
          <Text variant="caption" muted>
            {timeAgo(p.createdAt)}
          </Text>
        </View>
      </Pressable>

      <Image source={{ uri: p.imageURL }} style={[styles.image, { backgroundColor: theme.surfaceMuted }]} contentFit="contain" transition={200} />

      <View style={styles.row}>
        <StarRating value={average} size={22} />
        <Text variant="caption" muted>
          {p.ratingCount > 0 ? `${average.toFixed(1)} · ` : ''}
          {formatCount(p.ratingCount, 'Rating')}
        </Text>
      </View>

      {forSale && !editing ? (
        <View style={[styles.sale, { backgroundColor: theme.accent }]}>
          <Text variant="heading" style={{ color: '#3B2610' }}>
            {formatPrice(p.priceCents)}
          </Text>
          <Text variant="caption" style={{ color: '#3B2610' }}>
            {p.quantity} available
          </Text>
        </View>
      ) : null}

      {editing ? (
        <>
          <TextField label="Caption" value={caption} onChangeText={setCaption} multiline maxLength={2200} style={styles.multiline} />
          {canSell.data || forSale ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="Price (USD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              </View>
              <View style={styles.flex}>
                <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
              </View>
            </View>
          ) : null}
          <Button title="Save changes" onPress={saveEdit} loading={saving} />
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} disabled={saving} />
        </>
      ) : (
        <>
          {p.caption ? <Text>{p.caption}</Text> : null}
          {isOwner ? (
            <View style={styles.row}>
              <Button title="Edit" variant="secondary" onPress={startEdit} style={styles.flex} />
              <Button title="Delete" variant="danger" onPress={confirmDelete} style={styles.flex} />
            </View>
          ) : (
            <View style={styles.rate}>
              <Text variant="label">{myRating.data ? 'Your rating' : 'Rate this piece'}</Text>
              <StarRating value={myRating.data?.stars ?? 0} size={30} onChange={rate} />
              {myRating.data ? <Button title="Remove rating" variant="ghost" onPress={clearRating} /> : null}
            </View>
          )}
        </>
      )}

      <Text variant="heading">{formatCount(p.commentCount, 'Comment')}</Text>
      {(comments.data ?? []).map((c) => (
        <View key={c.id} style={styles.comment}>
          <View style={styles.flex}>
            <Text>
              <Text variant="label">{c.username} </Text>
              {c.text}
            </Text>
            <Text variant="caption" muted>
              {timeAgo(c.createdAt)}
            </Text>
          </View>
          {c.authorUid === uid || isOwner ? (
            <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete comment" onPress={() => removeComment(c.id)}>
              <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField placeholder="Add a comment" value={comment} onChangeText={setComment} maxLength={500} />
        </View>
        <Button title="Send" onPress={send} loading={sending} disabled={!comment.trim()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  owner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  image: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sale: { padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rate: { gap: spacing.sm, alignItems: 'flex-start' },
  multiline: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' },
  comment: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
