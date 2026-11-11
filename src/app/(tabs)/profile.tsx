import { EmptyState, Screen } from '@/components/ui';

export default function ProfileScreen() {
  return (
    <Screen>
      <EmptyState icon="person-circle-outline" title="Your profile" message="Your posts, followers and seller rating." />
    </Screen>
  );
}
