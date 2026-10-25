import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_WEB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.databaseURL,
);

export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const database = firebaseApp ? getDatabase(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let persistencePromise: Promise<void> | null = null;

export async function ensureFirebasePersistence() {
  if (!auth) {
    throw new Error("Firebase Authentication is not configured.");
  }
  persistencePromise ??= setPersistence(auth, browserLocalPersistence);
  await persistencePromise;
}

export async function prepareFirebaseAuth() {
  if (!auth || !database) {
    throw new Error("Firebase is not configured. Add the public Firebase variables in Vercel.");
  }
  await ensureFirebasePersistence();
  return { auth, database };
}
