import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Order } from '@/lib/models';

import { OrderRow } from '../order-row';

const mockShip = jest.fn();
const mockConfirm = jest.fn();
const mockToast = jest.fn();
const mockInvalidate = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => new Proxy({}, { get: () => '#000' }) }));
jest.mock('@/lib/auth-api', () => ({ friendlyError: (e: { message?: string }) => e.message ?? 'error' }));
jest.mock('@/lib/payments-api', () => ({
  markOrderShipped: (...args: unknown[]) => mockShip(...args),
  confirmDelivery: (...args: unknown[]) => mockConfirm(...args),
}));
// The real UI barrel pulls in Reanimated, which needs native modules; plain components are enough here.
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Text: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    TextField: ({ label, value, onChangeText, error }: { label: string; value: string; onChangeText: (v: string) => void; error?: string | null }) => (
      <View>
        <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
    Button: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
    useToast: () => mockToast,
  };
});

const order = (over: Partial<Order> = {}): Order => ({
  id: 'o1',
  postId: 'p1',
  postImageURL: 'https://img/1.jpg',
  buyerUid: 'b',
  buyerUsername: 'pat',
  sellerUid: 's',
  amountCents: 4500,
  status: 'paid',
  shippingAddress: { name: 'Pat', line1: '1 Main St', line2: '', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  ...over,
});

describe('OrderRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets the seller ship a paid order with carrier and tracking, then refreshes the list', async () => {
    mockShip.mockResolvedValue(undefined);
    await render(<OrderRow order={order()} role="seller" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark shipped' }));
    await fireEvent.press(screen.getByRole('button', { name: 'UPS' }));
    await fireEvent.changeText(screen.getByLabelText('Tracking number'), ' 1Z999AA10123456784 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save and notify buyer' }));

    await waitFor(() => expect(mockShip).toHaveBeenCalledWith('o1', 'UPS', '1Z999AA10123456784'));
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('pat was notified'), 'success');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('asks for a tracking number before calling the server', async () => {
    await render(<OrderRow order={order()} role="seller" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark shipped' }));
    await fireEvent.changeText(screen.getByLabelText('Tracking number'), 'ab');
    await fireEvent.press(screen.getByRole('button', { name: 'Save and notify buyer' }));
    expect(await screen.findByText(/Enter the tracking number/)).toBeTruthy();
    expect(mockShip).not.toHaveBeenCalled();
  });

  it('shows an error and does not refresh when shipping fails', async () => {
    mockShip.mockRejectedValue({ code: 'functions/failed-precondition', message: 'This order was already marked shipped.' });
    await render(<OrderRow order={order()} role="seller" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark shipped' }));
    await fireEvent.changeText(screen.getByLabelText('Tracking number'), '1234 5678');
    await fireEvent.press(screen.getByRole('button', { name: 'Save and notify buyer' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('This order was already marked shipped.', 'error'));
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('shows tracking and Confirm delivery to the buyer of a shipped order', async () => {
    mockConfirm.mockResolvedValue(undefined);
    await render(<OrderRow order={order({ status: 'shipped', carrier: 'USPS', trackingNumber: '9400 1118 9922' })} role="buyer" />);
    expect(screen.getByText('Shipped')).toBeTruthy();
    expect(screen.getByText('9400 1118 9922')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Track package' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mark shipped' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirm delivery' }));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('o1'));
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it('offers no actions on delivered, refunded or disputed orders', async () => {
    for (const status of ['delivered', 'refunded', 'disputed'] as const) {
      const view = await render(<OrderRow order={order({ status })} role="seller" />);
      expect(screen.queryByRole('button', { name: 'Mark shipped' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Confirm delivery' })).toBeNull();
      await view.unmount();
    }
  });

  it('does not let the buyer ship or the seller confirm', async () => {
    const buyerView = await render(<OrderRow order={order({ status: 'paid' })} role="buyer" />);
    expect(screen.queryByRole('button', { name: 'Mark shipped' })).toBeNull();
    await buyerView.unmount();
    await render(<OrderRow order={order({ status: 'shipped' })} role="seller" />);
    expect(screen.queryByRole('button', { name: 'Confirm delivery' })).toBeNull();
  });
});
