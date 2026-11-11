import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listOrders } from '@/lib/data/orders';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/lib/models';
import { useUid } from '@/lib/queries';
import { postHref } from '@/lib/routes';

function OrderRow({ order, role }: { order: Order; role: 'buyer' | 'seller' }) {
  const theme = useTheme();
  const a = order.shippingAddress;
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable style={styles.top} accessibilityRole="button" accessibilityLabel="Open post" onPress={() => router.push(postHref(order.postId))}>
        <Image source={{ uri: order.postImageURL }} style={styles.thumb} contentFit="cover" />
        <View style={styles.flex}>
          <Text variant="label">{formatPrice(order.amountCents)}</Text>
          <Text variant="caption" muted>
            {formatDate(order.createdAt)}
          </Text>
          <Text variant="caption" style={{ color: order.status === 'paid' ? theme.success : theme.danger }}>
            {order.status === 'paid' ? 'Paid' : 'Refunded'}
          </Text>
        </View>
      </Pressable>
      {role === 'seller' && order.status === 'paid' ? (
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
      {role === 'buyer' && order.status === 'paid' ? (
        <Button title="Review seller" variant="secondary" onPress={() => router.push(`/review/${order.sellerUid}` as never)} />
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  const uid = useUid();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const orders = useQuery({ queryKey: ['orders', role, uid], queryFn: () => listOrders(role, uid), enabled: !!uid });

  return (
    <Screen>
      <View style={styles.tabs}>
        <Button title="Purchases" variant={role === 'buyer' ? 'primary' : 'secondary'} onPress={() => setRole('buyer')} style={styles.flex} />
        <Button title="Sales" variant={role === 'seller' ? 'primary' : 'secondary'} onPress={() => setRole('seller')} style={styles.flex} />
      </View>
      {orders.isLoading ? (
        <Skeleton height={120} />
      ) : (orders.data ?? []).length === 0 ? (
        <EmptyState icon="receipt-outline" title={role === 'buyer' ? 'No purchases yet' : 'No sales yet'} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {orders.data!.map((o) => (
            <OrderRow key={o.id} order={o} role={role} />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: { padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
});
