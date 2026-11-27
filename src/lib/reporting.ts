import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

// Crash and error reporting. It is off unless EXPO_PUBLIC_SENTRY_DSN is set at build time, off on web,
// and off in development, so a build without the setting behaves exactly as before.
// Only an anonymous account id is attached to a report: no email, name, address or IP.

let active = false;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const redact = (text: string | undefined) => text?.replace(EMAIL, '[email]');

/** Removes anything personal from an event before it leaves the device. */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  delete event.request;
  delete event.server_name;
  if (event.message) event.message = redact(event.message);
  for (const ex of event.exception?.values ?? []) ex.value = redact(ex.value);
  for (const crumb of event.breadcrumbs ?? []) crumb.message = redact(crumb.message);
  return event;
}

export function initReporting(dsn = process.env.EXPO_PUBLIC_SENTRY_DSN): boolean {
  if (active || !dsn || Platform.OS === 'web' || __DEV__) return false;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    beforeSend: scrubEvent,
  });
  active = true;
  return true;
}

// Losing the network or being blocked from a document is normal; anything else a query hits is worth knowing about.
const EXPECTED_QUERY_ERRORS = new Set(['permission-denied', 'unavailable', 'cancelled', 'deadline-exceeded']);
export function onQueryError(error: unknown) {
  if (!EXPECTED_QUERY_ERRORS.has((error as { code?: string })?.code ?? '')) reportError(error, 'query');
}

/** Tie reports to the signed-in account by its anonymous id, or clear it on sign-out. */
export function setReportingUser(uid: string | null) {
  if (active) Sentry.setUser(uid ? { id: uid } : null);
}

/** Report an unexpected error. `where` says what the app was doing, e.g. "checkout". */
export function reportError(error: unknown, where: string) {
  if (!active) return;
  Sentry.captureException(error, { tags: { where } });
}
