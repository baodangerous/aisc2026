import { randomUUID } from 'node:crypto';
import type { TrainingSession, DailyAggregate, UserProfile, ScenarioThresholds, CommunityFacility, AuditLog, DeletionRequest, VolunteerApplication, VolunteerStatus, SessionEvent } from '../src/domain/schemas';
import { APPROVED_SCENARIOS } from '../src/content/approvedScenarios';
import { calculateSessionMetrics, calculateDelayFunnel } from '../src/domain/metrics/calculator';
import { COLLECTION_MODELS, TrainingSessionSchema, FacilitySchema } from '../src/domain/schemas/persistence';
import { supabaseAdmin } from './supabaseAuth';

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

function mergeEvents(previous: SessionEvent[], incoming: SessionEvent[]): SessionEvent[] {
  const events = new Map(previous.map((event) => [event.clientEventId, event]));
  for (const event of incoming) if (!events.has(event.clientEventId)) events.set(event.clientEventId, event);
  return [...events.values()].sort((a, b) => a.elapsedMs - b.elapsedMs);
}

export class SupabaseRepository {
  async init(): Promise<void> {}

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!supabaseAdmin) throw new RepositoryError();
    try { return await operation(); } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError();
    }
  }

  private async get<T>(collection: CollectionName, id: string): Promise<T | null> {
    return this.run(async () => {
      const { data, error } = await supabaseAdmin!.from('app_records').select('data').eq('collection', collection).eq('record_id', id).maybeSingle();
      if (error) throw error;
      return data ? validate<T>(collection, data.data) : null;
    });
  }

  private async list<T>(collection: CollectionName, ownerUid?: string): Promise<T[]> {
    return this.run(async () => {
      let query = supabaseAdmin!.from('app_records').select('data').eq('collection', collection).limit(500);
      if (ownerUid) query = query.eq('owner_uid', ownerUid);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => validate<T>(collection, row.data));
    });
  }

  async probe(timeoutMs = 3500): Promise<{ ok: boolean; database: 'supabase_postgres' | 'unavailable' }> {
    if (!supabaseAdmin) return { ok: false, database: 'unavailable' };
    try {
      const result = await Promise.race([
        supabaseAdmin.from('app_records').select('record_id').limit(1),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)),
      ]);
      return { ok: !result.error, database: result.error ? 'unavailable' : 'supabase_postgres' };
    } catch { return { ok: false, database: 'unavailable' }; }
  }

  getUser(uid: string) { return this.get<UserProfile>('users', uid); }

  async upsertUser(user: Partial<UserProfile> & { uid: string }): Promise<UserProfile> {
    const now = new Date().toISOString();
    const previous = await this.get<UserProfile>('users', user.uid);
    const updated = validate<UserProfile>('users', { displayName: 'Người dùng', role: 'citizen', preferredLanguage: 'vi', onboardingCompleted: false, createdAt: now, ...(previous ?? {}), ...user, updatedAt: now });
    await this.run(async () => {
      const { error } = await supabaseAdmin!.from('app_records').upsert({ collection: 'users', record_id: user.uid, owner_uid: user.uid, data: updated }, { onConflict: 'collection,record_id' });
      if (error) throw error;
    });
    return updated;
  }

  async deleteUser(_uid: string): Promise<void> { throw new RepositoryError('DELETION_WORKFLOW_REQUIRED', 409); }
  getScenarios() { return Promise.resolve(APPROVED_SCENARIOS); }
  getScenario(id: string) { return Promise.resolve(APPROVED_SCENARIOS.find((scenario) => scenario.id === id) || null); }

  async createTrainingSession(session: TrainingSession): Promise<TrainingSession> {
    const existing = await this.getTrainingSession(session.sessionId);
    if (existing) { if (existing.ownerUid !== session.ownerUid) throw new RepositoryError('SESSION_CONFLICT', 409); return existing; }
    await this.save('trainingSessions', session.sessionId, session, session.ownerUid);
    return session;
  }

  private async save(collection: CollectionName, id: string, data: unknown, ownerUid?: string) {
    return this.run(async () => {
      const { error } = await supabaseAdmin!.from('app_records').upsert({ collection, record_id: id, owner_uid: ownerUid ?? null, data }, { onConflict: 'collection,record_id' });
      if (error) throw error;
    });
  }

  private async mutateSession(id: string, update: (session: TrainingSession) => TrainingSession) {
    const current = await this.getTrainingSession(id);
    if (!current || current.status !== 'in_progress') return current;
    const next = update(current);
    await this.save('trainingSessions', id, next, next.ownerUid);
    return next;
  }

  appendSessionEvents(id: string, incoming: SessionEvent[]) { return this.mutateSession(id, (session) => ({ ...session, events: mergeEvents(session.events, incoming), updatedAt: new Date().toISOString() })); }

  completeTrainingSession(id: string, payload: { completedAt?: string; confidenceAfter?: number; finalEvents?: SessionEvent[]; thresholds?: ScenarioThresholds }) {
    return this.mutateSession(id, (session) => {
      const events = mergeEvents(session.events, payload.finalEvents || []);
      const scenario = APPROVED_SCENARIOS.find((item) => item.id === session.scenarioId);
      const version = scenario?.versions.find((item) => item.versionId === session.scenarioVersionId);
      if (!version) throw new RepositoryError('SCENARIO_NOT_FOUND', 409);
      const { delayBreakdown: _, ...metrics } = calculateSessionMetrics(events, version.thresholds, true);
      const confidenceAfter = payload.confidenceAfter ?? session.confidenceAfter;
      return { ...session, ...metrics, events, status: 'completed', confidenceAfter, confidenceDelta: confidenceAfter !== undefined && session.confidenceBefore !== undefined ? confidenceAfter - session.confidenceBefore : undefined, completedAt: payload.completedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    });
  }

  getTrainingSession(id: string) { return this.get<TrainingSession>('trainingSessions', id); }
  listTrainingSessions(ownerUid?: string) { return this.list<TrainingSession>('trainingSessions', ownerUid); }

  async getFacilities(): Promise<CommunityFacility[]> {
    const rows = await this.list<CommunityFacility>('facilities');
    return rows.flatMap((row) => { const parsed = FacilitySchema.safeParse(row); return parsed.success ? [parsed.data] : []; });
  }

  async createVolunteerApplication(data: VolunteerInput): Promise<VolunteerApplication> {
    const existing = await this.getVolunteerApplicationByUserId(data.userId);
    const now = new Date().toISOString();
    const application = validate<VolunteerApplication>('volunteerApplications', { ...data, id: existing?.id || data.userId, status: 'pending_review', statusHistory: [...(existing?.statusHistory || []), { status: 'pending_review', timestamp: now, actorRole: 'citizen' }], createdAt: existing?.createdAt || now, updatedAt: now });
    await this.save('volunteerApplications', application.id, application, data.userId);
    return application;
  }

  async getVolunteerApplicationByUserId(userId: string) { return (await this.list<VolunteerApplication>('volunteerApplications', userId))[0] || null; }
  getVolunteerApplicationById(id: string) { return this.get<VolunteerApplication>('volunteerApplications', id); }

  private async transitionVolunteer(id: string, status: VolunteerStatus, actorRole: string, reviewNote?: string, reviewerId?: string) {
    const current = await this.getVolunteerApplicationById(id); if (!current) return null;
    const now = new Date().toISOString();
    const updated = validate<VolunteerApplication>('volunteerApplications', { ...current, status, updatedAt: now, ...(reviewerId ? { reviewedBy: reviewerId, reviewedAt: now, reviewNote } : {}), statusHistory: [...current.statusHistory, { status, timestamp: now, actorRole, note: reviewNote }].slice(-100) });
    await this.save('volunteerApplications', id, updated, current.userId); return updated;
  }

  async updateVolunteerStatusByUser(userId: string, action: 'pause' | 'resume' | 'withdraw') { const application = await this.getVolunteerApplicationByUserId(userId); if (!application) return null; return this.transitionVolunteer(application.id, { pause: 'suspended', resume: 'pending_review', withdraw: 'withdrawn' }[action], 'citizen'); }
  async listVolunteerApplications(filters?: { status?: string; province?: string; cprTrained?: boolean; search?: string }) { const list = await this.list<VolunteerApplication>('volunteerApplications'); return list.filter((item) => (!filters?.status || filters.status === 'all' || item.status === filters.status) && (!filters?.province || filters.province === 'all' || item.province === filters.province) && (filters?.cprTrained === undefined || item.cprTrained === filters.cprTrained) && (!filters?.search || item.displayName.toLocaleLowerCase('vi').includes(filters.search.toLocaleLowerCase('vi')))); }
  reviewVolunteerApplication(id: string, reviewerId: string, _reviewerName: string, status: VolunteerStatus, reviewNote: string) { return this.transitionVolunteer(id, status, 'platform_admin', reviewNote, reviewerId); }

  async logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> { const record = { ...entry, id: randomUUID(), timestamp: new Date().toISOString() }; await this.save('auditLogs', record.id, record); }
  getAuditLogs() { return this.list<AuditLog>('auditLogs'); }
  async createDeletionRequest(input: Omit<DeletionRequest, 'id' | 'requestedAt'>): Promise<DeletionRequest> { const record = { ...input, id: input.uid, requestedAt: new Date().toISOString() } as DeletionRequest; await this.save('deletionRequests', record.id, record, input.uid); return record; }
  getDailyAggregates(scenarioId?: string) { return this.list<DailyAggregate>('aggregates').then((items) => scenarioId ? items.filter((item: any) => item.scenarioId === scenarioId) : items); }
  async getDelayFunnel(scenarioId?: string) { const sessions = await this.listTrainingSessions(); return calculateDelayFunnel(sessions.filter((session) => session.dataOrigin === 'training_user' && (!scenarioId || session.scenarioId === scenarioId))); }
}

export const dataRepository = new SupabaseRepository();
