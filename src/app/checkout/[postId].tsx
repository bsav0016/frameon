import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, EmptyState, Screen, Text, TextField, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { friendlyError } from '@/lib/auth-api';
import { formatPrice, validateAddress, type Country } from '@/lib/format';
import { createPaymentIntent } from '@/lib/payments-api';
import { usePost, useRefreshLists } from '@/lib/queries';
import { payWithSheet } from '@/lib/stripe';

const EMPTY = { name: '', line1: '', line2: '', city: '', state: '', postalCode: '' };

export default function CheckoutScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const theme = useTheme();
  const toast = useToast();
  const refreshLists = useRefreshLists();
  const post = usePost(postId);
  const [form, setForm] = useState(EMPTY);
  const [country, setCountry] = useState<Country | ''>('US');
  const [paying, setPaying] = useState(false);
  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!post.data) return <EmptyState icon="image-outline" title="Post not found" />;
  const p = post.data;
  if (p.status === 'hidden' || p.priceCents <= 0 || p.quantity < 1) {
    return <EmptyState icon="pricetag-outline" title="No longer available" message="This piece is sold out or not for sale." />;
  }

  const pay = async () => {
    const problem = validateAddress({ ...form, country });
    if (problem || country === '') {
      toast(problem ?? 'Please select a country', 'error');
      return;
    }
    setPaying(true);
    try {
      const { clientSecret } = await createPaymentIntent(postId, { ...form, country });
      const result = await payWithSheet(clientSecret);
      if (result.status === 'paid') {
        await refreshLists();
        toast('Payment received. Thank you!', 'success');
        router.replace('/orders' as never);
        return;
      }
      if (result.status === 'unavailable') toast('Payments need the FrameOn development build, not Expo Go.', 'error');
      if (result.status === 'error') toast(result.message, 'error');
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setPaying(false);
  };

  return (
    <Screen scroll>
      <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image source={{ uri: p.imageURL }} style={styles.thumb} contentFit="cover" />
        <View style={styles.flex}>
          <Text variant="label">{p.ownerUsername}</Text>
          <Text numberOfLines={2} muted>
            {p.caption || 'Original artwork'}
          </Text>
        </View>
        <Text variant="heading">{formatPrice(p.priceCents)}</Text>
      </View>

      <Text variant="heading">Shipping address</Text>
      <TextField label="Full name" value={form.name} onChangeText={set('name')} autoComplete="name" />
      <TextField label="Address" value={form.line1} onChangeText={set('line1')} autoComplete="address-line1" />
      <TextField label="Apartment, suite (optional)" value={form.line2} onChangeText={set('line2')} autoComplete="address-line2" />
      <TextField label="City" value={form.city} onChangeText={set('city')} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField label="State / Province" value={form.state} onChangeText={set('state')} autoCapitalize="characters" maxLength={2} />
        </View>
        <View style={styles.flex}>
          <TextField label="ZIP / Postal code" value={form.postalCode} onChangeText={set('postalCode')} autoCapitalize="characters" maxLength={10} />
        </View>
      </View>
      <View style={styles.row}>
        {(['US', 'CA'] as const).map((c) => (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected: country === c }}
            accessibilityLabel={c === 'US' ? 'United States' : 'Canada'}
            onPress={() => setCountry(c)}
            style={[styles.chip, { borderColor: country === c ? theme.primary : theme.border, backgroundColor: country === c ? theme.accent : theme.surface }]}>
            <Text variant="label" style={country === c ? { color: '#3B2610' } : undefined}>
              {c === 'US' ? 'United States' : 'Canada'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text variant="caption" muted>
        You will pay {formatPrice(p.priceCents)}. Payment is handled securely by Stripe, and the seller ships to the address above.
      </Text>
      <Button title={`Pay ${formatPrice(p.priceCents)}`} onPress={pay} loading={paying} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  chip: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
});
