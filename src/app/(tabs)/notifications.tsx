import { EmptyState, Screen } from '@/components/ui';

export default function NotificationsScreen() {
  return (
    <Screen>
      <EmptyState icon="notifications-outline" title="No activity yet" message="Ratings, comments, follows and sales show up here." />
    </Screen>
  );
}
