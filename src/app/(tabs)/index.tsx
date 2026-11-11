import { EmptyState, Screen } from '@/components/ui';

export default function HomeScreen() {
  return (
    <Screen>
      <EmptyState icon="image-outline" title="Your feed" message="Follow artists to see their work here." />
    </Screen>
  );
}
