import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

export function isFirestoreAdminEnabled(): boolean {
  return process.env.ENABLE_FIRESTORE_ADMIN === 'true';
}

export function getAdminApp(): App {
  if (!isFirestoreAdminEnabled()) {
    throw new Error('Firebase Admin is disabled. Set ENABLE_FIRESTORE_ADMIN=true to enable.');
  }
  if (cachedApp) return cachedApp;
  if (!getApps().length) {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {
        // ignore malformed local config
      }
    }

    const projectId = config.projectId || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0997555390';
    cachedApp = initializeApp({
      projectId,
    });
  } else {
    cachedApp = getApps()[0];
  }
  return cachedApp;
}

export function getAdminDb(): Firestore {
  if (!isFirestoreAdminEnabled()) {
    throw new Error('Firebase Admin Firestore is disabled. Set ENABLE_FIRESTORE_ADMIN=true to enable.');
  }
  if (cachedDb) return cachedDb;
  const app = getAdminApp();
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  let config: any = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      // ignore
    }
  }

  const firestoreDatabaseId = config.firestoreDatabaseId;
  if (firestoreDatabaseId) {
    cachedDb = getFirestore(app, firestoreDatabaseId);
  } else {
    cachedDb = getFirestore(app);
  }

  try {
    cachedDb.settings({ ignoreUndefinedProperties: true });
  } catch {
    // ignore
  }

  return cachedDb;
}

export function getAdminAuth(): Auth {
  if (!isFirestoreAdminEnabled()) {
    throw new Error('Firebase Admin Auth is disabled. Set ENABLE_FIRESTORE_ADMIN=true to enable.');
  }
  if (cachedAuth) return cachedAuth;
  const app = getAdminApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
}

// Proxies so existing imports (adminDb, adminAuth, adminApp) work seamlessly with lazy initialization
export const adminApp = new Proxy({} as App, {
  get(_target, prop) {
    const app = getAdminApp();
    const val = (app as any)[prop];
    return typeof val === 'function' ? val.bind(app) : val;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getAdminDb();
    const val = (db as any)[prop];
    return typeof val === 'function' ? val.bind(db) : val;
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth();
    const val = (auth as any)[prop];
    return typeof val === 'function' ? val.bind(auth) : val;
  },
});
