import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { friendlyError, retryAfterSeconds, signInWithUsername } from '@/lib/auth-api';
import { formatCountdown } from '@/lib/format';

export default function SignInScreen() {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // The message stays on screen (a toast fades and can sit under the keyboard) until the next attempt.
  const [error, setError] = useState<string | null>(null);
  // When the server has locked sign-in, the time it unlocks and a clock that ticks while we wait.
  const [unlockAt, setUnlockAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (unlockAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= unlockAt) {
        setUnlockAt(null);
        setError(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [unlockAt]);

  const secondsLeft = unlockAt === null ? 0 : Math.max(0, (unlockAt - now) / 1000);
  const lockedOut = secondsLeft > 0;

  const submit = async () => {
    if (lockedOut) return;
    if (!username.trim() || !password) {
      setError('Enter your username and password');
      toast('Enter your username and password', 'error');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithUsername(username, password);
    } catch (e) {
      const message = friendlyError(e);
      const wait = retryAfterSeconds(e);
      if (wait !== null) {
        setNow(Date.now());
        setUnlockAt(Date.now() + wait * 1000);
      }
      setError(message);
      toast(message, 'error');
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.logoWrap}>
        <Image source={require('@/../assets/images/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="FrameOn logo" />
        <Text variant="title">Welcome back</Text>
      </View>
      <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
        onSubmitEditing={submit}
      />
      {error ? (
        <Text variant="label" danger accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button title={lockedOut ? `Try again in ${formatCountdown(secondsLeft)}` : 'Sign in'} onPress={submit} loading={loading} disabled={lockedOut} />
      <View style={styles.links}>
        <Link href="/forgot-password" style={styles.link}>
          <Text variant="label">Forgot password?</Text>
        </Link>
        <Link href="/sign-up" style={styles.link}>
          <Text variant="label">Create an account</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  logo: { width: 120, height: 120 },
  links: { alignItems: 'center', gap: 12, marginTop: 8 },
  link: { padding: 8 },
});
