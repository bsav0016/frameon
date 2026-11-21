import * as WebBrowser from 'expo-web-browser';
import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';
import type { Address } from './models';

export async function createPaymentIntent(postId: string, shipping: Address) {
  const res = await httpsCallable<{ postId: string; shipping: Address }, { clientSecret: string; amountCents: number }>(functions, 'createPaymentIntent')({
    postId,
    shipping,
  });
  return res.data;
}

/** Opens Stripe's hosted onboarding, then asks the server for the resulting account status. */
export async function setUpPayouts(): Promise<boolean> {
  const { data } = await httpsCallable<unknown, { url: string }>(functions, 'startSellerOnboarding')();
  await WebBrowser.openAuthSessionAsync(data.url, 'frameon://connect');
  const status = await httpsCallable<unknown, { chargesEnabled: boolean }>(functions, 'syncSellerStatus')();
  return status.data.chargesEnabled;
}

export async function refreshPayoutStatus(): Promise<boolean> {
  const status = await httpsCallable<unknown, { chargesEnabled: boolean }>(functions, 'syncSellerStatus')();
  return status.data.chargesEnabled;
}

/** Seller: the piece is on its way. The buyer is notified. */
export async function markOrderShipped(orderId: string, carrier: string, trackingNumber: string) {
  await httpsCallable<{ orderId: string; carrier: string; trackingNumber: string }, { ok: true }>(functions, 'markOrderShipped')({ orderId, carrier, trackingNumber });
}

/** Buyer: the piece arrived. The seller is notified. */
export async function confirmDelivery(orderId: string) {
  await httpsCallable<{ orderId: string }, { ok: true }>(functions, 'confirmDelivery')({ orderId });
}
