import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

import { readEnv } from './env';

const env = readEnv();
const alreadyInitialized = getApps().length > 0;

export const app = alreadyInitialized
  ? getApp()
  : initializeApp({
      apiKey: env.firebaseApiKey,
      authDomain: env.firebaseAuthDomain,
      projectId: env.firebaseProjectId,
      storageBucket: env.firebaseStorageBucket,
      messagingSenderId: env.firebaseMessagingSenderId,
      appId: env.firebaseAppId,
    });

// initializeAuth throws when called twice (fast refresh), so reuse the existing instance then.
// On web the default browser persistence is used instead of AsyncStorage.
export const auth =
  alreadyInitialized || Platform.OS === 'web' ? getAuth(app) : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
