import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

export interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

/** Profile picture with an initial as fallback while it loads or when none was uploaded. */
export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const theme = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name}'s profile picture`}
      style={[styles.box, box, { backgroundColor: theme.accent }]}>
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" transition={150} />
      ) : (
        <Text variant="label" style={{ color: '#5C3A1A', fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
