import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { friendlyError, isUsernameAvailable, register, validateEmail, validatePassword, validateUsername } from '@/lib/auth-api';

export default function SignUpScreen() {
  const toast = useToast();
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    const next = {
      username: validateUsername(form.username) ?? undefined,
      email: validateEmail(form.email) ?? undefined,
      password: validatePassword(form.password) ?? undefined,
      confirm: form.confirm === form.password ? undefined : 'Passwords do not match',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      if (!(await isUsernameAvailable(form.username))) {
        setErrors({ username: 'That username is taken' });
        setLoading(false);
        return;
      }
      await register(form);
    } catch (e) {
      toast(friendlyError(e), 'error');
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <Text variant="title">Create your account</Text>
      <TextField label="Username" value={form.username} onChangeText={set('username')} error={errors.username} autoCapitalize="none" autoCorrect={false} autoComplete="username-new" />
      <TextField label="Name (optional)" value={form.name} onChangeText={set('name')} autoComplete="name" />
      <TextField label="Email" value={form.email} onChangeText={set('email')} error={errors.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
      <TextField label="Password" value={form.password} onChangeText={set('password')} error={errors.password} secureTextEntry autoComplete="new-password" />
      <TextField label="Confirm password" value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} secureTextEntry autoComplete="new-password" />
      <Text variant="caption" muted>
        By creating an account you agree to the Terms of Use. Objectionable content is not tolerated.
      </Text>
      <Button title="Create account" onPress={submit} loading={loading} />
      <View style={styles.links}>
        <Link href="/sign-in" style={styles.link}>
          <Text variant="label">I already have an account</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  links: { alignItems: 'center', marginTop: 8 },
  link: { padding: 8 },
});
