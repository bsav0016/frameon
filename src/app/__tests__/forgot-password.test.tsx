import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from 'expo-router';

import ForgotPasswordScreen from '../(auth)/forgot-password';

jest.mock('expo-router', () => ({ router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() } }));
const mockRequestReset = jest.fn();
jest.mock('@/lib/auth-api', () => ({
  friendlyError: () => 'error',
  validateEmail: () => null,
  requestPasswordReset: (email: string) => mockRequestReset(email),
}));
// The real UI barrel pulls in Reanimated, which needs native modules; plain components are enough for this test.
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Text: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    TextField: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) => (
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />
    ),
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
    useToast: () => jest.fn(),
  };
});

const mockRouter = jest.mocked(router);

describe('ForgotPasswordScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('can always get back to sign in, before and after sending', async () => {
    mockRequestReset.mockResolvedValue(undefined);
    mockRouter.canGoBack.mockReturnValue(true);
    await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
    await fireEvent.press(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/reset link is on its way/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(mockRouter.back).toHaveBeenCalledTimes(2);
  });

  it('goes to the sign-in screen when there is nothing to go back to', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/sign-in');
  });
});
