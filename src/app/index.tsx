import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

// The app's root URL. Signed-in users go to the home tab, everyone else to sign-in. Without this, a signed-out cold start
// (which opens "/") would match only the protected home tab and show "Unmatched Route".
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/home' : '/sign-in'} />;
}
