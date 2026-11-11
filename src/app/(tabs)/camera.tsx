import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPost } from '@/lib/data/posts';
import { parseSaleFields } from '@/lib/format';
import { pickImage, prepareImage, type ImageSource } from '@/lib/images';
import { useCanSell, useProfile, useRefreshLists, useUid } from '@/lib/queries';

export default function PostScreen() {
  const theme = useTheme();
  const toast = useToast();
  const uid = useUid();
  const profile = useProfile(uid);
  const canSell = useCanSell();
  const refreshLists = useRefreshLists();

  const [uri, setUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [posting, setPosting] = useState(false);

  const pick = async (source: ImageSource) => {
    try {
      const picked = await pickImage(source);
      if (picked) setUri(picked);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const reset = () => {
    setUri(null);
    setCaption('');
    setPrice('');
    setQuantity('');
  };

  const submit = async () => {
    if (!uri || !profile.data) return;
    const sale = canSell.data ? parseSaleFields(price, quantity) : { priceCents: 0, quantity: 0 };
    if ('error' in sale) {
      toast(sale.error.message, 'error');
      return;
    }
    setPosting(true);
    try {
      const resized = await prepareImage(uri, 1600);
      await createPost({ uid, username: profile.data.username, localUri: resized, caption, ...sale });
      await refreshLists();
      reset();
      toast('Posted', 'success');
      router.navigate('/');
    } catch {
      toast('Could not post. Please try again.', 'error');
    }
    setPosting(false);
  };

  if (!uri) {
    return (
      <Screen scroll>
        <View style={[styles.hero, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
          <Text variant="heading">Share your art</Text>
          <Text muted style={styles.center}>
            Take a photo of your piece or choose one from your library.
          </Text>
        </View>
        <Button title="Take a photo" onPress={() => pick('camera')} />
        <Button title="Choose from library" variant="secondary" onPress={() => pick('library')} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Image source={{ uri }} style={[styles.preview, { backgroundColor: theme.surfaceMuted }]} contentFit="contain" />
      <TextField label="Caption" value={caption} onChangeText={setCaption} multiline maxLength={2200} style={styles.multiline} placeholder="Tell people about this piece" />
      {canSell.data ? (
        <>
          <Text variant="caption" muted>
            Leave price and quantity blank if this piece is not for sale.
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField label="Price (USD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
            <View style={styles.flex}>
              <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="1" />
            </View>
          </View>
        </>
      ) : (
        <Text variant="caption" muted>
          To sell art, set up payouts under the Settings screen on your Profile tab.
        </Text>
      )}
      <Button title="Post" onPress={submit} loading={posting} />
      <Button title="Choose a different photo" variant="ghost" onPress={reset} disabled={posting} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  preview: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.lg },
  multiline: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
