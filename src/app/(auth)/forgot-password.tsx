import { useState } from 'react';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { friendlyError, requestPasswordReset, validateEmail } from '@/lib/auth-api';

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
        <Text>If an account exists for that email, a reset link is on its way.</Text>
      ) : (
        <>
          <Text muted>Enter the email you signed up with and we will send you a reset link.</Text>
          <TextField label="Email" value={email} onChangeText={setEmail} error={error} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
          <Button title="Send reset link" onPress={submit} loading={loading} />
        </>
      )}
    </Screen>
  );
}
