import type { ReactNode } from 'react';

import { readEnv } from './env';

// The Stripe native module is only present in a development build. Expo Go (and tests) fall back to a
// "payments unavailable" state instead of crashing at import time.
type StripeModule = typeof import('@stripe/stripe-react-native');

function load(): StripeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@stripe/stripe-react-native') as StripeModule;
  } catch {
    return null;
  }
}

const stripe = load();

export function StripeGate({ children }: { children: ReactNode }) {
  if (!stripe) return <>{children}</>;
  const { StripeProvider } = stripe;
  return (
    <StripeProvider publishableKey={readEnv().stripePublishableKey} merchantIdentifier="merchant.BrianSavidge.FrameOnNew" urlScheme="frameon">
      <>{children}</>
    </StripeProvider>
  );
}

export type PayResult = { status: 'paid' } | { status: 'canceled' } | { status: 'unavailable' } | { status: 'error'; message: string };

/** Shows Stripe's payment sheet for a PaymentIntent the server created. */
export async function payWithSheet(clientSecret: string): Promise<PayResult> {
  if (!stripe) return { status: 'unavailable' };
  try {
    const init = await stripe.initPaymentSheet({
      merchantDisplayName: 'FrameOn',
      paymentIntentClientSecret: clientSecret,
      // Apple Pay shows in the sheet on an iPhone with a card in Wallet. The platform account (the one that
      // takes the charge and pays sellers out) is in the US, so that is the merchant country.
      applePay: { merchantCountryCode: 'US' },
      returnURL: 'frameon://stripe-redirect',
    });
    if (init.error) return { status: 'error', message: init.error.message };
    const result = await stripe.presentPaymentSheet();
    if (!result.error) return { status: 'paid' };
    return result.error.code === 'Canceled' ? { status: 'canceled' } : { status: 'error', message: result.error.message };
  } catch {
    return { status: 'unavailable' };
  }
}
