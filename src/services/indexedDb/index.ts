import { TrainingSession, SessionEvent } from '../../domain/schemas';

const DB_NAME = 'golden_minutes_db_v2';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_EVENTS = 'events';
const STORE_SYNC_QUEUE = 'sync_queue';
const STORE_SETTINGS = 'settings';

export interface SyncQueueItem {
  id: string; // clientSessionId or clientEventId
  type: 'session' | 'event_batch';
  sessionId: string;
  data: unknown;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
}

let dbInstance: IDBDatabase | null = null;

export async function getIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'clientSessionId' });
        sessionStore.createIndex('ownerUid', 'ownerUid', { unique: false });
        sessionStore.createIndex('status', 'status', { unique: false });
        sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const eventStore = db.createObjectStore(STORE_EVENTS, { keyPath: 'clientEventId' });
        eventStore.createIndex('sessionId', 'sessionId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Local Session Operations
export async function saveLocalSession(session: TrainingSession): Promise<void> {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SESSIONS, STORE_SYNC_QUEUE], 'readwrite');
    const sessionStore = tx.objectStore(STORE_SESSIONS);
    const syncStore = tx.objectStore(STORE_SYNC_QUEUE);

    sessionStore.put(session);

    // Queue for sync if not already queued as synced
    const queueItem: SyncQueueItem = {
      id: session.clientSessionId,
      type: 'session',
      sessionId: session.clientSessionId,
      data: session,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    syncStore.put(queueItem);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalSessions(): Promise<TrainingSession[]> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SESSIONS], 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as TrainingSession[]) || [];
        // Sort descending by createdAt
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, returning empty', err);
    return [];
  }
}

export async function saveLocalEvent(event: SessionEvent): Promise<void> {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_EVENTS], 'readwrite');
    const store = tx.objectStore(STORE_EVENTS);
    store.put(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalEventsForSession(sessionId: string): Promise<SessionEvent[]> {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_EVENTS], 'readonly');
    const store = tx.objectStore(STORE_EVENTS);
    const index = store.index('sessionId');
    const req = index.getAll(sessionId);
    req.onsuccess = () => resolve(req.result as SessionEvent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await getIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SYNC_QUEUE], 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const index = store.index('status');
      const req = index.count('pending');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function markSyncItemStatus(
  id: string,
  status: SyncQueueItem['status'],
  errorMessage?: string
): Promise<void> {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result as SyncQueueItem;
      if (item) {
        item.status = status;
        item.lastAttemptAt = new Date().toISOString();
        if (status === 'failed') {
          item.retryCount = (item.retryCount || 0) + 1;
          item.errorMessage = errorMessage;
        }
        store.put(item);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
