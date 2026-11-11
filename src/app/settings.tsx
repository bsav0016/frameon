import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { updateProfile, uploadAvatar } from '@/lib/data/profiles';
import { deleteMyAccount, friendlyError, logout } from '@/lib/auth-api';
import { pickImage, prepareImage } from '@/lib/images';
import { refreshPayoutStatus, setUpPayouts } from '@/lib/payments-api';
import { useCanSell, useProfile, useUid } from '@/lib/queries';

export default function SettingsScreen() {
  const toast = useToast();
  const uid = useUid();
  const qc = useQueryClient();
  const profile = useProfile(uid);
  // null means "untouched": show the saved value until the user edits the field.
  const [nameEdit, setName] = useState<string | null>(null);
  const [bioEdit, setBio] = useState<string | null>(null);
  const name = nameEdit ?? profile.data?.name ?? '';
  const bio = bioEdit ?? profile.data?.bio ?? '';
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const canSell = useCanSell();

  // Stripe verification can finish after the user leaves the app, so re-check the status whenever Settings opens.
  useEffect(() => {
    refreshPayoutStatus()
      .then(() => qc.invalidateQueries({ queryKey: ['canSell'] }))
      .catch(() => undefined);
  }, [qc]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['profile', uid] });

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(uid, { name: name.trim(), bio: bio.trim() });
      await refresh();
      setName(null);
      setBio(null);
      toast('Profile saved', 'success');
    } catch {
      toast('Could not save. Please try again.', 'error');
    }
    setSaving(false);
  };

  const changeAvatar = async () => {
    try {
      const picked = await pickImage('library', [1, 1]);
      if (!picked) return;
      setAvatarBusy(true);
      await uploadAvatar(uid, await prepareImage(picked, 512));
      await refresh();
    } catch (e) {
      toast(e instanceof Error && e.message.includes('access') ? e.message : 'Could not update your photo.', 'error');
    }
    setAvatarBusy(false);
  };

  const payouts = async () => {
    setPayoutBusy(true);
    try {
      const enabled = await setUpPayouts();
      await qc.invalidateQueries({ queryKey: ['canSell'] });
      toast(enabled ? 'Payouts are ready' : 'Setup is not finished yet. Tap again to continue.', enabled ? 'success' : 'info');
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    setPayoutBusy(false);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount(password);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'Incorrect password' : friendlyError(e), 'error');
      setDeleting(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert('Delete account?', 'This permanently deletes your profile, posts and comments. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);

  return (
    <Screen scroll>
      <View style={styles.avatar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={changeAvatar} disabled={avatarBusy}>
          <Avatar uri={profile.data?.photoURL} name={profile.data?.username ?? '?'} size={96} />
        </Pressable>
        <Button title={avatarBusy ? 'Uploading…' : 'Change photo'} variant="ghost" onPress={changeAvatar} disabled={avatarBusy} />
      </View>

      <Text variant="caption" muted>
        Username: {profile.data?.username}
      </Text>
      <TextField label="Name" value={name} onChangeText={setName} maxLength={50} />
      <TextField label="Bio" value={bio} onChangeText={setBio} maxLength={240} multiline style={styles.bio} />
      <Button title="Save" onPress={save} loading={saving} />

      <View style={styles.divider} />
      <Text variant="heading">Selling</Text>
      <Text variant="caption" muted>
        {canSell.data ? 'Payouts are set up. You can list art for sale when you post.' : 'Connect a payout account with Stripe to list art for sale. FrameOn keeps a 5% fee, which includes Stripe processing.'}
      </Text>
      {canSell.data ? null : <Button title="Set up payouts" onPress={payouts} loading={payoutBusy} />}
      <Button title="Orders" variant="secondary" onPress={() => router.push('/orders' as never)} />

      <View style={styles.divider} />
      <Text variant="heading">Safety and legal</Text>
      <Button title="Blocked users" variant="secondary" onPress={() => router.push('/blocked' as never)} />
      <Button title="Terms of Use" variant="secondary" onPress={() => router.push('/legal/terms' as never)} />
      <Button title="Privacy Policy" variant="secondary" onPress={() => router.push('/legal/privacy' as never)} />

      <View style={styles.divider} />
      <Button title="Sign out" variant="secondary" onPress={() => logout()} />
      {confirming ? (
        <>
          <TextField label="Confirm your password" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title="Permanently delete account" variant="danger" onPress={confirmDelete} loading={deleting} disabled={!password} />
        </>
      ) : (
        <Button title="Delete account" variant="ghost" onPress={() => setConfirming(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', gap: spacing.xs },
  bio: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' },
  divider: { height: spacing.lg },
});
