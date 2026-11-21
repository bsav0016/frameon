// Points the app at the local Firebase emulators. Only loaded when EXPO_PUBLIC_FIREBASE_EMULATOR=1, which is
// how the store screenshots of order screens are rendered without touching the production project
// (see store-assets/README.md). Production builds never set it, so this code is not in them.
import { connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

import { auth, db } from './firebase';

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

// The real sign-in goes through a Cloud Function that is not running here, so the capture script signs in directly.
(globalThis as { __emulatorSignIn?: (email: string, password: string) => Promise<unknown> }).__emulatorSignIn = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
