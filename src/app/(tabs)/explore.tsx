import { EmptyState, Screen } from '@/components/ui';

export default function ExploreScreen() {
  return (
    <Screen>
      <EmptyState icon="search-outline" title="Discover" message="Search artists and browse new work." />
    </Screen>
  );
}
