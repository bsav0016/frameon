import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';

export default function SignInScreen() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.logoWrap}>
        <Image source={require('@/../assets/images/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="FrameOn logo" />
      </View>
      <EmptyState icon="lock-closed-outline" title="Sign in" message="Account sign-in is coming in the next stage." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: 'center', paddingTop: 24 },
  logo: { width: 140, height: 140 },
});
