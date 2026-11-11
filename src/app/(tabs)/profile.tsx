import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { deleteMyAccount, friendlyError, logout } from '@/lib/auth-api';

// Temporary home for account actions until the full profile and settings screens land in stage 4.
export default function ProfileScreen() {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMyAccount(password);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'Incorrect password' : friendlyError(e), 'error');
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete account?', 'This permanently deletes your profile, posts and comments. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);

  return (
    <Screen scroll>
      <Text variant="title">Account</Text>
      <Button title="Sign out" variant="secondary" onPress={() => logout()} />
      {confirming ? (
        <>
          <TextField label="Confirm your password" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title="Permanently delete account" variant="danger" onPress={confirmDelete} loading={busy} disabled={!password} />
        </>
      ) : (
        <Button title="Delete account" variant="ghost" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}
