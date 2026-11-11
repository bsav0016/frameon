import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen, Text } from '@/components/ui';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '@/lib/legal';

// Reachable signed out (from sign-up) and signed in (from Settings), so it lives outside both route groups.
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const isPrivacy = doc === 'privacy';
  const sections = isPrivacy ? PRIVACY : TERMS;
  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: true, title: isPrivacy ? 'Privacy Policy' : 'Terms of Use' }} />
      <Text variant="caption" muted>
        Last updated {LEGAL_UPDATED}
      </Text>
      {sections.map((s) => (
        <Text key={s.heading}>
          <Text variant="label">{s.heading + '\n'}</Text>
          {s.body}
        </Text>
      ))}
    </Screen>
  );
}
