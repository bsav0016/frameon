import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export interface StarRatingProps {
  value: number;
  size?: number;
  /** When omitted the stars are display-only. */
  onChange?: (stars: number) => void;
}

export function StarRating({ value, size = 18, onChange }: StarRatingProps) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityRole={onChange ? 'adjustable' : 'text'} accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name = value >= n - 0.25 ? 'star' : value >= n - 0.75 ? 'star-half' : 'star-outline';
        const star = <Ionicons name={name} size={size} color={theme.star} />;
        return onChange ? (
          <Pressable
            key={n}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} ${n === 1 ? 'star' : 'stars'}`}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(n);
            }}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
