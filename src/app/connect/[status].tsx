import { Redirect } from 'expo-router';

// Stripe sends the user back to frameon://connect/return (or /refresh) after seller onboarding. The in-app browser
// closes on its own, so this route only has to land somewhere sensible: Settings, which re-checks the payout status on open.
export default function ConnectReturn() {
  return <Redirect href="/settings" />;
}
