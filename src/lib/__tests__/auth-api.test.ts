import { friendlyError, validateEmail, validatePassword, validateUsername } from '../auth-api';

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

  it('only surfaces server messages from callable errors', () => {
    expect(friendlyError({ code: 'functions/already-exists', message: 'That username is taken.' })).toBe('That username is taken.');
    expect(friendlyError({ code: 'auth/network-request-failed' })).toMatch('connection');
    expect(friendlyError(new Error('stack trace secrets'))).toBe('Something went wrong. Please try again.');
  });
});
