import * as Sentry from '@sentry/react-native';

type Reporting = typeof import('../reporting');

// The module keeps "is it on" in a variable, so each test loads a fresh copy.
function load(dev: boolean): Reporting {
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
  let mod!: Reporting;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../reporting');
  });
  return mod;
}

afterEach(() => {
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  jest.clearAllMocks();
});

describe('reporting switch', () => {
  it('stays off without a DSN, and in development', () => {
    const prod = load(false);
    expect(prod.initReporting('')).toBe(false);
    expect(prod.initReporting(undefined)).toBe(false);
    expect(load(true).initReporting('https://key@o1.ingest.sentry.io/1')).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('does nothing when reporting is off', () => {
    const r = load(false);
    r.reportError(new Error('boom'), 'checkout');
    r.setReportingUser('uid1');
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it('turns on once and then reports with where and the anonymous id', () => {
    const r = load(false);
    expect(r.initReporting('https://key@o1.ingest.sentry.io/1')).toBe(true);
    expect(r.initReporting('https://key@o1.ingest.sentry.io/1')).toBe(false);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect((Sentry.init as jest.Mock).mock.calls[0][0]).toMatchObject({ sendDefaultPii: false, tracesSampleRate: 0 });

    const error = new Error('boom');
    r.reportError(error, 'checkout');
    expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { where: 'checkout' } });
    r.setReportingUser('uid1');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'uid1' });
    r.setReportingUser(null);
    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });

  it('ignores the query failures that are part of normal use', () => {
    const r = load(false);
    r.initReporting('https://key@o1.ingest.sentry.io/1');
    r.onQueryError({ code: 'unavailable' });
    r.onQueryError({ code: 'permission-denied' });
    expect(Sentry.captureException).not.toHaveBeenCalled();
    r.onQueryError(new TypeError('x is undefined'));
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('scrubEvent', () => {
  it('keeps only the anonymous id and drops request details', () => {
    const { scrubEvent } = load(false);
    const event = scrubEvent({
      type: undefined,
      user: { id: 'uid1', email: 'a@b.co', username: 'pat', ip_address: '1.2.3.4' },
      request: { url: 'https://x', headers: { cookie: 'c' } },
      server_name: 'laptop',
    } as never) as Record<string, unknown>;
    expect(event.user).toEqual({ id: 'uid1' });
    expect(event.request).toBeUndefined();
    expect(event.server_name).toBeUndefined();
  });

  it('removes a user with no id and redacts email addresses in messages', () => {
    const { scrubEvent } = load(false);
    const event = scrubEvent({
      type: undefined,
      user: { email: 'a@b.co' },
      message: 'failed for pat@example.com',
      exception: { values: [{ value: 'no account for pat@example.com' }] },
      breadcrumbs: [{ message: 'sent to pat@example.com' }],
    } as never) as {
      user?: unknown;
      message: string;
      exception: { values: { value: string }[] };
      breadcrumbs: { message: string }[];
    };
    expect(event.user).toBeUndefined();
    expect(event.message).toBe('failed for [email]');
    expect(event.exception.values[0].value).toBe('no account for [email]');
    expect(event.breadcrumbs[0].message).toBe('sent to [email]');
  });
});
