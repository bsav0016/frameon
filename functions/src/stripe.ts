import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

export const stripeKey = defineSecret('STRIPE_SECRET_KEY');
export const webhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
export const getStripe = () => new Stripe(stripeKey.value());
