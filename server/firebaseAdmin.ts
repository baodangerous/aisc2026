import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

export function isFirestoreAdminEnabled() { return process.env.ENABLE_FIRESTORE_ADMIN === 'true'; }

export function getAdminApp(): App {
  if (!isFirestoreAdminEnabled()) throw new Error('Firebase Admin is disabled.');
  if (cachedApp) return cachedApp;
  if (getApps().length) return (cachedApp = getApps()[0]);
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase Admin is disabled: configuration unavailable.');
  try {
    const account = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credential = account ? cert(JSON.parse(account)) : applicationDefault();
    cachedApp = initializeApp({ projectId, credential });
    return cachedApp;
  } catch { throw new Error('Firebase Admin is disabled: configuration unavailable.'); }
}

export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getAdminApp(), process.env.FIREBASE_DATABASE_ID || '(default)');
  cachedDb.settings({ ignoreUndefinedProperties: true });
  return cachedDb;
}
export function getAdminAuth(): Auth { return getAuth(getAdminApp()); }

// Lazy proxies avoid credential access when importing the public learning app or running a build.
export const adminDb = new Proxy({} as Firestore, {
  get(_target, property) { const db = getAdminDb(); const value = Reflect.get(db, property); return typeof value === 'function' ? value.bind(db) : value; },
});
export const adminAuth = new Proxy({} as Auth, {
  get(_target, property) { const auth = getAdminAuth(); const value = Reflect.get(auth, property); return typeof value === 'function' ? value.bind(auth) : value; },
});
