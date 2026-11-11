import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { friendlyError, signInWithUsername } from '@/lib/auth-api';

export default function SignInScreen() {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      toast('Enter your username and password', 'error');
      return;
    }
    setLoading(true);
    try {
      await signInWithUsername(username, password);
    } catch (e) {
      toast(friendlyError(e), 'error');
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
      <Button title="Sign in" onPress={submit} loading={loading} />
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
