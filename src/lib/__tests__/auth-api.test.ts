import { friendlyError, retryAfterSeconds, validateEmail, validatePassword, validateUsername } from '../auth-api';

jest.mock('../firebase', () => ({ auth: {}, functions: {} }));
jest.mock('../push', () => ({ unregisterPush: jest.fn() }));
jest.mock('firebase/auth', () => ({}));
jest.mock('firebase/functions', () => ({}));


describe('auth validation', () => {
  it('validates usernames', () => {
    expect(validateUsername('brian_s.1')).toBeNull();
    expect(validateUsername('ab')).not.toBeNull();
    expect(validateUsername('has space')).not.toBeNull();
    expect(validateUsername('x'.repeat(21))).not.toBeNull();
  });

  it('validates emails and passwords', () => {
    expect(validateEmail('a@b.co')).toBeNull();
    expect(validateEmail('nope')).not.toBeNull();
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('12345678')).toBeNull();
  });

  it('reads how long a lockout lasts from the error details', () => {
    expect(retryAfterSeconds({ code: 'functions/resource-exhausted', details: { retryAfterSeconds: 872 } })).toBe(872);
    expect(retryAfterSeconds({ details: { retryAfterSeconds: 0 } })).toBeNull();
    expect(retryAfterSeconds({ details: { retryAfterSeconds: 'soon' } })).toBeNull();
    expect(retryAfterSeconds(new Error('x'))).toBeNull();
    expect(retryAfterSeconds(null)).toBeNull();
  });

  it('only surfaces server messages from callable errors', () => {
    expect(friendlyError({ code: 'functions/already-exists', message: 'That username is taken.' })).toBe('That username is taken.');
    expect(friendlyError({ code: 'functions/unauthenticated', message: 'Invalid username or password. [401]' })).toBe('Invalid username or password.');
    expect(friendlyError({ code: 'functions/resource-exhausted', message: 'Try again in 15 minutes. [429]' })).toBe('Try again in 15 minutes.');
    expect(friendlyError({ code: 'auth/network-request-failed' })).toMatch('connection');
    expect(friendlyError(new Error('stack trace secrets'))).toBe('Something went wrong. Please try again.');
  });
});
