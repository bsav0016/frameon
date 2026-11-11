import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Button, Screen, Text, TextField, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { report } from '@/lib/data/social';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@/lib/models';
import { useUid } from '@/lib/queries';

const LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  inappropriate: 'Inappropriate or offensive',
  counterfeit: 'Counterfeit or stolen artwork',
  harassment: 'Harassment or bullying',
  other: 'Something else',
};

export default function ReportScreen() {
  const { type, id } = useLocalSearchParams<{ type: ReportTarget; id: string }>();
  const theme = useTheme();
  const toast = useToast();
  const uid = useUid();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await report({ reporterUid: uid, targetType: type, targetId: id, reason, details });
      toast('Thanks. We review reports within 24 hours.', 'success');
      router.back();
    } catch {
      toast('Could not send your report. Please try again.', 'error');
      setSending(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="title">Report {type}</Text>
      <Text muted>Why are you reporting this? The person is not told who reported them.</Text>
      {REPORT_REASONS.map((r) => (
        <Pressable
          key={r}
          accessibilityRole="radio"
          accessibilityState={{ selected: reason === r }}
          onPress={() => setReason(r)}
          style={[styles.option, { borderColor: reason === r ? theme.primary : theme.border, backgroundColor: reason === r ? theme.accent : theme.surface }]}>
          <Text variant="label" style={reason === r ? { color: '#3B2610' } : undefined}>
            {LABELS[r]}
          </Text>
        </Pressable>
      ))}
      <TextField label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={500} style={styles.details} />
      <Button title="Send report" onPress={submit} loading={sending} disabled={!reason} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  details: { minHeight: 90, paddingTop: spacing.md, textAlignVertical: 'top' },
});
