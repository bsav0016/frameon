import { EmptyState, Screen } from '@/components/ui';

export default function CameraScreen() {
  return (
    <Screen>
      <EmptyState icon="add-circle-outline" title="Share your art" message="Post a photo and optionally put it up for sale." />
    </Screen>
  );
}
