import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';


// 1. Read environment variables
const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const envStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
const envMessagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const envAppId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
const envDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined;

const jsonConfig: Record<string, string> = {};

const resolvedConfig = {
  apiKey: envApiKey || jsonConfig.apiKey || '',
  authDomain: envAuthDomain || jsonConfig.authDomain || '',
  projectId: envProjectId || jsonConfig.projectId || '',
  storageBucket: envStorageBucket || jsonConfig.storageBucket || '',
  messagingSenderId: envMessagingSenderId || jsonConfig.messagingSenderId || '',
  appId: envAppId || jsonConfig.appId || '',
  firestoreDatabaseId: envDatabaseId || jsonConfig.firestoreDatabaseId || undefined,
};

// Defensive check for config presence
export const isFirebaseConfigured = Boolean(
  resolvedConfig.apiKey &&
  resolvedConfig.authDomain &&
  resolvedConfig.appId &&
  resolvedConfig.projectId &&
  resolvedConfig.projectId !== 'demo-project' &&
  !resolvedConfig.projectId.includes('placeholder')
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(resolvedConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, resolvedConfig.firestoreDatabaseId || undefined);
  } catch (err) {
    console.warn('[Firebase Client] Initialization note:', err);
  }
}

export {
  app,
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
};
export type { FirebaseUser };


