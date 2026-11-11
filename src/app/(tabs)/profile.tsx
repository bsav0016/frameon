import { ProfileView } from '@/components/profile-view';
import { useUid } from '@/lib/queries';

export default function ProfileScreen() {
  return <ProfileView uid={useUid()} />;
}
