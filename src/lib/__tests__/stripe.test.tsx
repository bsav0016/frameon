import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import appJson from '../../../app.json';
import { payWithSheet, StripeGate } from '../stripe';

// FrameOn takes card payments through Stripe's payment sheet and does not offer Apple Pay. Apple's review
// (Guideline 2.1) asks about Apple Pay whenever the binary looks like it supports it, so the app must not
// declare an Apple Pay merchant. If Apple Pay is added on purpose, change these expectations with it.

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

describe('Stripe setup', () => {
  beforeEach(() => {
    providerProps.length = 0;
    mockInitPaymentSheet.mockReset().mockResolvedValue({});
    mockPresentPaymentSheet.mockReset().mockResolvedValue({});
  });

  it('declares no Apple Pay merchant in the app config', () => {
    const plugins = appJson.expo.plugins as (string | [string, Record<string, unknown>])[];
    const stripePlugin = plugins.find((p) => Array.isArray(p) && p[0] === '@stripe/stripe-react-native') as
      | [string, Record<string, unknown>]
      | undefined;
    expect(stripePlugin).toBeDefined();
    expect(stripePlugin![1]).not.toHaveProperty('merchantIdentifier');
  });

  it('does not give the Stripe provider a merchant identifier', async () => {
    await render(
      <StripeGate>
        <Text>child</Text>
      </StripeGate>,
    );
    expect(providerProps).toHaveLength(1);
    expect(providerProps[0]).toMatchObject({ publishableKey: 'pk_test_123', urlScheme: 'frameon' });
    expect(providerProps[0]).not.toHaveProperty('merchantIdentifier');
  });

  it('opens the payment sheet without Apple Pay', async () => {
    const result = await payWithSheet('pi_secret_123');

    expect(result).toEqual({ status: 'paid' });
    expect(mockInitPaymentSheet).toHaveBeenCalledTimes(1);
    const options = mockInitPaymentSheet.mock.calls[0][0];
    expect(options).toMatchObject({ merchantDisplayName: 'FrameOn', paymentIntentClientSecret: 'pi_secret_123' });
    expect(options).not.toHaveProperty('applePay');
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
