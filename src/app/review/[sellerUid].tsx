import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { StarRating } from '@/components/star-rating';
import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { getMyReview, saveReview } from '@/lib/data/orders';
import { useProfile, useUid } from '@/lib/queries';

export default function ReviewSellerScreen() {
  const { sellerUid } = useLocalSearchParams<{ sellerUid: string }>();
  const toast = useToast();
  const qc = useQueryClient();
  const uid = useUid();
  const me = useProfile(uid);
  const seller = useProfile(sellerUid);
  const existing = useQuery({ queryKey: ['myReview', sellerUid, uid], queryFn: () => getMyReview(sellerUid, uid), enabled: !!uid });
  // null means "untouched": show the saved review until the user edits it.
  const [starsEdit, setStars] = useState<number | null>(null);
  const [commentEdit, setComment] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stars = starsEdit ?? existing.data?.stars ?? 0;
  const comment = commentEdit ?? existing.data?.comment ?? '';

  const submit = async () => {
    if (!me.data || stars < 1) {
      toast('Choose a star rating first', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveReview({ sellerUid, raterUid: uid, raterUsername: me.data.username, stars, comment, existing: !!existing.data });
      await Promise.all([qc.invalidateQueries({ queryKey: ['myReview'] }), qc.invalidateQueries({ queryKey: ['profile', sellerUid] })]);
      toast('Review saved', 'success');
      router.back();
    } catch {
      toast('Could not save your review.', 'error');
    }
    setSaving(false);
  };

  return (
    <Screen scroll>
      <Text variant="title">Review {seller.data?.username ?? 'seller'}</Text>
      <StarRating value={stars} size={36} onChange={setStars} />
      <TextField label="Comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={500} style={{ minHeight: 100, paddingTop: 12, textAlignVertical: 'top' }} />
      <Button title="Save review" onPress={submit} loading={saving} />
    </Screen>
  );
}
