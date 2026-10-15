import { randomUUID } from 'node:crypto';
import type { Query } from 'firebase-admin/firestore';
import type { TrainingSession, DailyAggregate, UserProfile, ScenarioThresholds, CommunityFacility, AuditLog, DeletionRequest, VolunteerApplication, VolunteerStatus, SessionEvent } from '../src/domain/schemas';
import { APPROVED_SCENARIOS } from '../src/content/approvedScenarios';
import { calculateSessionMetrics, calculateDelayFunnel } from '../src/domain/metrics/calculator';
import { COLLECTION_MODELS, TrainingSessionSchema, FacilitySchema } from '../src/domain/schemas/persistence';
import { adminDb, isFirestoreAdminEnabled } from './firebaseAdmin';

type CollectionName = keyof typeof COLLECTION_MODELS;
type VolunteerInput = Omit<VolunteerApplication, 'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'>;

export class RepositoryError extends Error {
  constructor(public code = 'STORAGE_UNAVAILABLE', public status = 503) {
    super('Không thể truy cập dữ liệu lúc này. Vui lòng thử lại.');
  }
}

function validate<T>(collection: CollectionName, data: unknown): T {
  return COLLECTION_MODELS[collection].schema.parse(data) as T;
}

function serializable<T>(collection: CollectionName, data: T): T {
  const parsed = validate<T>(collection, data);
  const json = JSON.stringify(parsed);
  if (Buffer.byteLength(json) > 750_000) throw new RepositoryError('DOCUMENT_TOO_LARGE', 413);
  return JSON.parse(json);
}

function mergeEvents(previous: SessionEvent[], incoming: SessionEvent[]): SessionEvent[] {
  const events = new Map(previous.map((event) => [event.clientEventId, event]));
  for (const event of incoming) if (!events.has(event.clientEventId)) events.set(event.clientEventId, event);
  return [...events.values()].sort((a, b) => a.elapsedMs - b.elapsedMs);
}

// No runtime seed data or RAM fallback: a successful mutation means Firestore acknowledged it.
export class FirestoreRepository {
  async init(): Promise<void> {}

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!isFirestoreAdminEnabled()) throw new RepositoryError();
    try { return await operation(); }
    catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError();
    }
  }

  private async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    return this.run(async () => {
      const snapshot = await adminDb.collection(collection).doc(id).get();
      return snapshot.exists ? validate<T>(collection, snapshot.data()) : null;
    });
  }

  private async list<T>(collection: CollectionName, configure?: (query: Query) => Query): Promise<T[]> {
    return this.run(async () => {
      const query = adminDb.collection(collection);
      const snapshot = await (configure ? configure(query) : query).limit(500).get();
      return snapshot.docs.map((document) => validate<T>(collection, document.data()));
    });
  }

  async probe(timeoutMs = 3500): Promise<{ ok: boolean; database: 'cloud_firestore' | 'unavailable' }> {
    if (!isFirestoreAdminEnabled()) return { ok: false, database: 'unavailable' };
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        adminDb.collection('users').limit(1).get(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs); }),
      ]);
      return { ok: true, database: 'cloud_firestore' };
    } catch { return { ok: false, database: 'unavailable' }; }
    finally { if (timer) clearTimeout(timer); }
  }

  getUser(uid: string) { return this.get<UserProfile>('users', uid); }

  async upsertUser(user: Partial<UserProfile> & { uid: string }): Promise<UserProfile> {
    return this.run(() => adminDb.runTransaction(async (transaction) => {
      const ref = adminDb.collection('users').doc(user.uid);
      const previous = await transaction.get(ref);
      const now = new Date().toISOString();
      const updated = serializable<UserProfile>('users', {
        displayName: 'Người dùng', role: 'citizen', preferredLanguage: 'vi',
        onboardingCompleted: false, createdAt: now,
        ...(previous.exists ? previous.data() : {}), ...user, updatedAt: now,
      } as UserProfile);
      transaction.set(ref, updated);
      return updated;
    }));
  }

  // Deletion is a tracked workflow, never a misleading profile-only deletion.
  async deleteUser(_uid: string): Promise<void> { throw new RepositoryError('DELETION_WORKFLOW_REQUIRED', 409); }

  async getScenarios() { return APPROVED_SCENARIOS; }
  async getScenario(id: string) { return APPROVED_SCENARIOS.find((scenario) => scenario.id === id) || null; }

  async createTrainingSession(session: TrainingSession): Promise<TrainingSession> {
    const record = serializable('trainingSessions', session);
    return this.run(() => adminDb.runTransaction(async (transaction) => {
      const ref = adminDb.collection('trainingSessions').doc(record.sessionId);
      const previous = await transaction.get(ref);
      if (previous.exists) {
        const existing = TrainingSessionSchema.parse(previous.data());
        if (existing.ownerUid !== record.ownerUid) throw new RepositoryError('SESSION_CONFLICT', 409);
        return existing;
      }
      transaction.create(ref, record);
      return record;
    }));
  }

  private async mutateSession(id: string, update: (session: TrainingSession) => TrainingSession) {
    return this.run(() => adminDb.runTransaction(async (transaction) => {
      const ref = adminDb.collection('trainingSessions').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const current = TrainingSessionSchema.parse(snapshot.data());
      if (current.status !== 'in_progress') return current;
      const next = serializable('trainingSessions', update(current));
      transaction.set(ref, next);
      return next;
    }));
  }

  appendSessionEvents(id: string, incoming: SessionEvent[]) {
    return this.mutateSession(id, (session) => ({
      ...session, events: mergeEvents(session.events, incoming), updatedAt: new Date().toISOString(),
    }));
  }

  completeTrainingSession(id: string, payload: {
    completedAt?: string; confidenceAfter?: number; finalEvents?: SessionEvent[]; thresholds?: ScenarioThresholds;
  }) {
    return this.mutateSession(id, (session) => {
      const events = mergeEvents(session.events, payload.finalEvents || []);
      const scenario = APPROVED_SCENARIOS.find((item) => item.id === session.scenarioId);
      const version = scenario?.versions.find((item) => item.versionId === session.scenarioVersionId);
      if (!version) throw new RepositoryError('SCENARIO_NOT_FOUND', 409);
      const { delayBreakdown: _, ...metrics } = calculateSessionMetrics(events, version.thresholds, true);
      const confidenceAfter = payload.confidenceAfter ?? session.confidenceAfter;
      return {
        ...session, ...metrics, events, status: 'completed', confidenceAfter,
        confidenceDelta: confidenceAfter !== undefined && session.confidenceBefore !== undefined
          ? confidenceAfter - session.confidenceBefore : undefined,
        completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
    });
  }

  getTrainingSession(id: string) { return this.get<TrainingSession>('trainingSessions', id); }
  listTrainingSessions(ownerUid?: string) {
    return this.list<TrainingSession>('trainingSessions', (query) => ownerUid ? query.where('ownerUid', '==', ownerUid) : query);
  }

  async getFacilities(): Promise<CommunityFacility[]> {
    if (!isFirestoreAdminEnabled()) return [];
    return this.run(async () => {
      const snapshot = await adminDb.collection('facilities').where('status', '==', 'verified').limit(500).get();
      return snapshot.docs.flatMap((doc) => {
        const parsed = FacilitySchema.safeParse(doc.data());
        return parsed.success ? [parsed.data] : [];
      });
    });
  }

  async createVolunteerApplication(data: VolunteerInput): Promise<VolunteerApplication> {
    return this.run(() => adminDb.runTransaction(async (transaction) => {
      const query = adminDb.collection('volunteerApplications').where('userId', '==', data.userId).limit(1);
      const previous = await transaction.get(query);
      const ref = previous.empty ? adminDb.collection('volunteerApplications').doc(data.userId) : previous.docs[0].ref;
      const existing = previous.empty ? null : validate<VolunteerApplication>('volunteerApplications', previous.docs[0].data());
      const now = new Date().toISOString();
      const application = serializable<VolunteerApplication>('volunteerApplications', {
        ...data, id: ref.id, status: 'pending_review',
        statusHistory: [...(existing?.statusHistory || []), { status: 'pending_review', timestamp: now, actorRole: 'citizen' }],
        createdAt: existing?.createdAt || now, updatedAt: now,
      });
      transaction.set(ref, application);
      return application;
    }));
  }

  async getVolunteerApplicationByUserId(userId: string) {
    return (await this.list<VolunteerApplication>('volunteerApplications', (query) => query.where('userId', '==', userId)))[0] || null;
  }
  getVolunteerApplicationById(id: string) { return this.get<VolunteerApplication>('volunteerApplications', id); }

  private async transitionVolunteer(id: string, status: VolunteerStatus, actorRole: string, reviewNote?: string, reviewerId?: string) {
    return this.run(() => adminDb.runTransaction(async (transaction) => {
      const ref = adminDb.collection('volunteerApplications').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const current = validate<VolunteerApplication>('volunteerApplications', snapshot.data());
      const now = new Date().toISOString();
      const updated = serializable<VolunteerApplication>('volunteerApplications', {
        ...current, status, updatedAt: now,
        ...(reviewerId ? { reviewedBy: reviewerId, reviewedAt: now, reviewNote } : {}),
        statusHistory: [...current.statusHistory, { status, timestamp: now, actorRole, note: reviewNote }].slice(-100),
      });
      transaction.set(ref, updated);
      return updated;
    }));
  }

  async updateVolunteerStatusByUser(userId: string, action: 'pause' | 'resume' | 'withdraw') {
    const application = await this.getVolunteerApplicationByUserId(userId);
    if (!application) return null;
    const status = { pause: 'suspended', resume: 'pending_review', withdraw: 'withdrawn' } as const;
    return this.transitionVolunteer(application.id, status[action], 'citizen');
  }

  async listVolunteerApplications(filters?: { status?: string; province?: string; cprTrained?: boolean; search?: string }) {
    const list = await this.list<VolunteerApplication>('volunteerApplications');
    return list.filter((item) =>
      (!filters?.status || filters.status === 'all' || item.status === filters.status) &&
      (!filters?.province || filters.province === 'all' || item.province === filters.province) &&
      (filters?.cprTrained === undefined || item.cprTrained === filters.cprTrained) &&
      (!filters?.search || item.displayName.toLocaleLowerCase('vi').includes(filters.search.toLocaleLowerCase('vi'))));
  }

  reviewVolunteerApplication(id: string, reviewerId: string, _reviewerName: string, status: VolunteerStatus, reviewNote: string) {
    return this.transitionVolunteer(id, status, 'platform_admin', reviewNote, reviewerId);
  }

  async logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const record = serializable<AuditLog>('auditLogs', { ...entry, details: Object.fromEntries(Object.entries(entry.details).filter(([, value]) => value !== undefined)), id: randomUUID(), timestamp: new Date().toISOString() });
    await this.run(() => adminDb.collection('auditLogs').doc(record.id).create(record));
  }
  getAuditLogs() { return this.list<AuditLog>('auditLogs', (query) => query.orderBy('timestamp', 'desc')); }

  async createDeletionRequest(input: Omit<DeletionRequest, 'id' | 'requestedAt'>): Promise<DeletionRequest> {
    return this.run(() => adminDb.runTransaction(async (transaction) => {
      const ref = adminDb.collection('deletionRequests').doc(input.uid);
      const existing = await transaction.get(ref);
      if (existing.exists) return validate<DeletionRequest>('deletionRequests', existing.data());
      const record = serializable<DeletionRequest>('deletionRequests', {
        ...input, id: input.uid, requestedAt: new Date().toISOString(),
      });
      transaction.create(ref, record);
      transaction.update(adminDb.collection('users').doc(input.uid), { deletionRequestedAt: record.requestedAt });
      return record;
    }));
  }

  getDailyAggregates(scenarioId?: string) {
    return this.list<DailyAggregate>('aggregates', (query) => scenarioId ? query.where('scenarioId', '==', scenarioId) : query);
  }

  async getDelayFunnel(scenarioId?: string) {
    const sessions = await this.list<TrainingSession>('trainingSessions', (query) => scenarioId ? query.where('scenarioId', '==', scenarioId) : query);
    return calculateDelayFunnel(sessions.filter((session) => session.dataOrigin === 'training_user'));
  }
}

export const dataRepository = new FirestoreRepository();
