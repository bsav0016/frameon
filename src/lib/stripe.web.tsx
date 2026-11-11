import type { ReactNode } from 'react';

// Stripe's native payment sheet does not exist on web, so the web build (used for store screenshots and
// previews) gets a stub with the same exports as stripe.tsx.
export function StripeGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export type PayResult = { status: 'paid' } | { status: 'canceled' } | { status: 'unavailable' } | { status: 'error'; message: string };

export async function payWithSheet(_clientSecret: string): Promise<PayResult> {
  return { status: 'unavailable' };
}
