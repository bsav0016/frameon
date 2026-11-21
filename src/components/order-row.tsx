import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text, TextField, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { friendlyError } from '@/lib/auth-api';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/lib/models';
import { CARRIERS, ORDER_STATUS_LABEL, orderAction, trackingProblem, trackingUrl } from '@/lib/orders';
import { confirmDelivery, markOrderShipped } from '@/lib/payments-api';
import { postHref } from '@/lib/routes';

export function OrderRow({ order, role }: { order: Order; role: 'buyer' | 'seller' }) {
  const theme = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const a = order.shippingAddress;
  const action = orderAction(order, role);

  const [shipping, setShipping] = useState(false);
  const [carrier, setCarrier] = useState<string>(CARRIERS[0]);
  const [tracking, setTracking] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['orders'] });

  const submitShipment = async () => {
    const issue = trackingProblem(tracking);
    setProblem(issue);
    if (issue) return;
    setBusy(true);
    try {
      await markOrderShipped(order.id, carrier, tracking.trim());
      toast(`Marked shipped. ${order.buyerUsername} was notified.`, 'success');
      setShipping(false);
      await refresh();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmDelivery(order.id);
      toast('Thanks for confirming.', 'success');
      await refresh();
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const link = trackingUrl(order.carrier, order.trackingNumber);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable style={styles.top} accessibilityRole="button" accessibilityLabel="Open post" onPress={() => router.push(postHref(order.postId))}>
        <Image source={{ uri: order.postImageURL }} style={styles.thumb} contentFit="cover" />
        <View style={styles.flex}>
          <Text variant="label">{formatPrice(order.amountCents)}</Text>
          <Text variant="caption" muted>
            {formatDate(order.createdAt)}
          </Text>
          <Text variant="caption" style={{ color: order.status === 'refunded' || order.status === 'disputed' ? theme.danger : theme.success }}>
            {ORDER_STATUS_LABEL[order.status]}
          </Text>
        </View>
      </Pressable>

      {order.trackingNumber ? (
        <View>
          <Text variant="caption" muted>
            {order.carrier ? `${order.carrier} tracking` : 'Tracking'}
            {order.shippedAt ? `, shipped ${formatDate(order.shippedAt)}` : ''}
          </Text>
          <Text selectable>{order.trackingNumber}</Text>
          {link ? <Button title="Track package" variant="ghost" onPress={() => void Linking.openURL(link)} /> : null}
        </View>
      ) : null}

      {role === 'seller' && (order.status === 'paid' || order.status === 'shipped') ? (
        <View>
          <Text variant="caption" muted>
            Ship to {order.buyerUsername}
          </Text>
          <Text>{a.name}</Text>
          <Text>
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ''}
          </Text>
          <Text>
            {a.city}, {a.state} {a.postalCode} {a.country}
          </Text>
        </View>
      ) : null}

      {action === 'ship' && !shipping ? <Button title="Mark shipped" onPress={() => setShipping(true)} /> : null}
      {action === 'ship' && shipping ? (
        <View style={styles.form}>
          <Text variant="label" muted>
            Carrier
          </Text>
          <View style={styles.chips}>
            {CARRIERS.map((c) => (
              <Button key={c} title={c} variant={carrier === c ? 'primary' : 'secondary'} onPress={() => setCarrier(c)} />
            ))}
          </View>
          <TextField label="Tracking number" value={tracking} onChangeText={setTracking} error={problem} autoCapitalize="characters" autoCorrect={false} />
          <Button title="Save and notify buyer" loading={busy} onPress={() => void submitShipment()} />
          <Button title="Cancel" variant="ghost" disabled={busy} onPress={() => setShipping(false)} />
        </View>
      ) : null}

      {action === 'confirmDelivery' ? <Button title="Confirm delivery" loading={busy} onPress={() => void confirm()} /> : null}

      {role === 'buyer' && order.status !== 'refunded' ? (
        <Button title="Review seller" variant="secondary" onPress={() => router.push(`/review/${order.sellerUid}` as never)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  form: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
