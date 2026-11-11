import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signInWithCustomToken, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

import { auth, functions } from './firebase';

export const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;
export const MIN_PASSWORD = 8;

export function validateUsername(value: string): string | null {
  if (!USERNAME_PATTERN.test(value)) return 'Use 3-20 letters, numbers, dots or underscores';
  return null;
}

export function validateEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : 'Enter a valid email address';
}

export function validatePassword(value: string): string | null {
  return value.length >= MIN_PASSWORD ? null : `Password must be at least ${MIN_PASSWORD} characters`;
}

/** Callable errors carry a user-safe message from the server; anything else gets a generic one. */
export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err?.code?.startsWith('functions/') && err.message) return err.message;
  if (err?.code === 'auth/network-request-failed') return 'No connection. Check your internet and try again.';
  return 'Something went wrong. Please try again.';
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const res = await httpsCallable<{ username: string }, { available: boolean }>(functions, 'isUsernameAvailable')({ username });
  return res.data.available;
}

export async function signInWithUsername(username: string, password: string) {
  const res = await httpsCallable<{ username: string; password: string }, { token: string }>(functions, 'signInWithUsername')({
    username: username.trim(),
    password,
  });
  await signInWithCustomToken(auth, res.data.token);
}

/** Creates the account on the server, then signs in with the same credentials. */
export async function register(args: { username: string; email: string; password: string; name: string }) {
  await httpsCallable(functions, 'registerAccount')({ ...args, email: args.email.trim(), username: args.username.trim() });
  await signInWithUsername(args.username, args.password);
}

export async function requestPasswordReset(email: string) {
  // Firebase does not reveal whether the address exists, and neither do we.
  await sendPasswordResetEmail(auth, email.trim()).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });
}

export const logout = () => signOut(auth);

/** Deleting needs a fresh login (checked server-side too), so the user re-enters their password first. */
export async function deleteMyAccount(password: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not signed in');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await user.getIdToken(true);
  await httpsCallable(functions, 'deleteAccount')();
  await signOut(auth).catch(() => undefined);
}
