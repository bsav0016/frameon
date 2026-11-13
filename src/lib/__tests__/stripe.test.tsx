import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import appJson from '../../../app.json';
import { payWithSheet, StripeGate } from '../stripe';

// Checkout offers Apple Pay through Stripe's payment sheet. Apple's review (Guideline 2.1) asks where Apple Pay
// is when the binary contains PassKit, so what the app declares and what the sheet is given have to agree:
// the same merchant in the app config and on the provider, and Apple Pay turned on in the sheet.

const MERCHANT = 'merchant.BrianSavidge.FrameOnNew';
const mockInitPaymentSheet = jest.fn();
const mockPresentPaymentSheet = jest.fn();
const providerProps: Record<string, unknown>[] = [];

jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: (props: { children: React.ReactNode } & Record<string, unknown>) => {
    const { children, ...rest } = props;
    providerProps.push(rest);
    return children;
  },
  initPaymentSheet: (...args: unknown[]) => mockInitPaymentSheet(...args),
  presentPaymentSheet: () => mockPresentPaymentSheet(),
}));
jest.mock('../env', () => ({ readEnv: () => ({ stripePublishableKey: 'pk_test_123' }) }));

describe('Stripe and Apple Pay setup', () => {
  beforeEach(() => {
    providerProps.length = 0;
    mockInitPaymentSheet.mockReset().mockResolvedValue({});
    mockPresentPaymentSheet.mockReset().mockResolvedValue({});
  });

  it('declares the Apple Pay merchant in the app config', () => {
    const plugins = appJson.expo.plugins as (string | [string, Record<string, unknown>])[];
    const stripePlugin = plugins.find((p) => Array.isArray(p) && p[0] === '@stripe/stripe-react-native') as
      | [string, Record<string, unknown>]
      | undefined;
    expect(stripePlugin).toBeDefined();
    expect(stripePlugin![1]).toMatchObject({ merchantIdentifier: MERCHANT });
  });

  it('gives the Stripe provider the same merchant', async () => {
    await render(
      <StripeGate>
        <Text>child</Text>
      </StripeGate>,
    );
    expect(providerProps).toHaveLength(1);
    expect(providerProps[0]).toMatchObject({ publishableKey: 'pk_test_123', merchantIdentifier: MERCHANT, urlScheme: 'frameon' });
  });

  it('opens the payment sheet with Apple Pay turned on for a US merchant', async () => {
    const result = await payWithSheet('pi_secret_123');

    expect(result).toEqual({ status: 'paid' });
    expect(mockInitPaymentSheet).toHaveBeenCalledTimes(1);
    expect(mockInitPaymentSheet.mock.calls[0][0]).toMatchObject({
      merchantDisplayName: 'FrameOn',
      paymentIntentClientSecret: 'pi_secret_123',
      applePay: { merchantCountryCode: 'US' },
    });
  });

  it('reports a cancelled payment and an error from the sheet', async () => {
    mockPresentPaymentSheet.mockResolvedValueOnce({ error: { code: 'Canceled', message: 'x' } });
    expect(await payWithSheet('pi_secret_123')).toEqual({ status: 'canceled' });

    mockPresentPaymentSheet.mockResolvedValueOnce({ error: { code: 'Failed', message: 'Card declined' } });
    expect(await payWithSheet('pi_secret_123')).toEqual({ status: 'error', message: 'Card declined' });
  });

  it('reports a sheet that could not be set up', async () => {
    mockInitPaymentSheet.mockResolvedValueOnce({ error: { message: 'bad secret' } });
    expect(await payWithSheet('nope')).toEqual({ status: 'error', message: 'bad secret' });
    expect(mockPresentPaymentSheet).not.toHaveBeenCalled();
  });
});
