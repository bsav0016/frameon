import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { reportError } from '@/lib/reporting';

/** Shown instead of a white screen when a screen crashes. Expo Router passes the error and a retry. */
export function ErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const theme = useTheme();
  useEffect(() => reportError(error, 'screen crash'), [error]);
  return (
    <View style={[styles.box, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>
        This screen hit a problem. Trying again usually fixes it; if it keeps happening, close and reopen FrameOn.
      </Text>
      <Button title="Try again" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  message: { fontSize: 15, textAlign: 'center', marginBottom: 8 },
});
