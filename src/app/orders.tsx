import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { OrderRow } from '@/components/order-row';
import { Button, EmptyState, Screen, Skeleton } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { listOrders } from '@/lib/data/orders';
import { useUid } from '@/lib/queries';

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
});
