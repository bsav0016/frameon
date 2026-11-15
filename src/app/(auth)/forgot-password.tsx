import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { friendlyError, requestPasswordReset, validateEmail } from '@/lib/auth-api';

// The auth screens have no header, so each one needs its own way out.
const backToSignIn = () => (router.canGoBack() ? router.back() : router.replace('/sign-in'));

export default function ForgotPasswordScreen() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const problem = validateEmail(email);
    setError(problem);
    if (problem) return;
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setLoading(false);
  };

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']}>
      <Text variant="title">Reset password</Text>
      {sent ? (
        <>
          <Text>If an account exists for that email, a reset link is on its way. It can take a few minutes, so check your spam folder too.</Text>
          <Button title="Back to sign in" onPress={backToSignIn} />
        </>
      ) : (
        <>
          <Text muted>Enter the email you signed up with and we will send you a reset link.</Text>
          <TextField label="Email" value={email} onChangeText={setEmail} error={error} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
          <Button title="Send reset link" onPress={submit} loading={loading} />
          <Button title="Back to sign in" variant="ghost" onPress={backToSignIn} />
        </>
      )}
    </Screen>
  );
}
