import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { auth } from './firebase';

interface AuthState {
  /** `undefined` until Firebase has restored the persisted session. */
  user: FirebaseUser | null | undefined;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({ user: undefined, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const value = useMemo(() => ({ user, isLoading: user === undefined }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
