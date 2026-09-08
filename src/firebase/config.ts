import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - initializeAuth/getReactNativePersistence live under firebase/auth but
// their RN-specific types lag the JS SDK; this is the documented RN setup.
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// All values come from EXPO_PUBLIC_* env vars so nothing secret is hardcoded
// or committed. Copy .env.example to .env and fill in your Firebase project's
// config (Firebase console → Project settings → General → Your apps).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// React Native needs an AsyncStorage-backed persistence layer for auth state;
// the web target (Expo web) falls back to the default browser persistence.
export const auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : (() => {
        try {
          return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
        } catch {
          // initializeAuth throws if it's already been called (e.g. Fast Refresh) — reuse it.
          return getAuth(app);
        }
      })();

export const db = (() => {
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: Platform.OS !== 'web' });
  } catch {
    return getFirestore(app);
  }
})();

export const storage = getStorage(app);
