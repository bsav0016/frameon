import type { Persistence } from 'firebase/auth';

// Metro resolves firebase/auth to its React Native build, which exports getReactNativePersistence,
// but TypeScript matches the generic "types" export condition first and never sees it.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
