import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorFallback } from '../error-fallback';

const mockReport = jest.fn();
jest.mock('@/lib/reporting', () => ({ reportError: (...a: unknown[]) => mockReport(...a) }));

describe('ErrorFallback', () => {
  it('reports the crash once and lets the person try again', async () => {
    const retry = jest.fn();
    const error = new Error('render failed');
    await render(<ErrorFallback error={error} retry={retry} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith(error, 'screen crash');
    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
