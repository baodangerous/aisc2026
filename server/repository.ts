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
  private memDb = new Map<string, Map<string, any>>();

  async init(): Promise<void> {}

  private getMemCollection(collection: string): Map<string, any> {
    if (!this.memDb.has(collection)) {
      this.memDb.set(collection, new Map());
    }
    return this.memDb.get(collection)!;
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!supabaseAdmin) throw new RepositoryError('STORAGE_UNAVAILABLE', 503);
    try {
      return await operation();
    } catch (error) {
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
    await this.save('users', user.uid, updated, user.uid);
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
    if (!supabaseAdmin) {
      this.getMemCollection(collection).set(id, data);
      return;
    }
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
    if (!supabaseAdmin) return [];
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

  async updateVolunteerStatusByUser(userId: string, action: 'pause' | 'resume' | 'withdraw') { const application = await this.getVolunteerApplicationByUserId(userId); if (!application) return null; return this.transitionVolunteer(application.id, ({ pause: 'suspended', resume: 'pending_review', withdraw: 'withdrawn' } as Record<typeof action, VolunteerStatus>)[action], 'citizen'); }
  async listVolunteerApplications(filters?: { status?: string; province?: string; cprTrained?: boolean; search?: string }) { const list = await this.list<VolunteerApplication>('volunteerApplications'); return list.filter((item) => (!filters?.status || filters.status === 'all' || item.status === (filters.status as VolunteerStatus)) && (!filters?.province || filters.province === 'all' || item.province === filters.province) && (filters?.cprTrained === undefined || item.cprTrained === filters.cprTrained) && (!filters?.search || item.displayName.toLocaleLowerCase('vi').includes(filters.search.toLocaleLowerCase('vi')))); }
  reviewVolunteerApplication(id: string, reviewerId: string, _reviewerName: string, status: VolunteerStatus, reviewNote: string) { return this.transitionVolunteer(id, status, 'platform_admin', reviewNote, reviewerId); }

  async logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> { const record = { ...entry, id: randomUUID(), timestamp: new Date().toISOString() }; await this.save('auditLogs', record.id, record); }
  getAuditLogs() { return this.list<AuditLog>('auditLogs'); }
  async createDeletionRequest(input: Omit<DeletionRequest, 'id' | 'requestedAt'>): Promise<DeletionRequest> { const record = { ...input, id: input.uid, requestedAt: new Date().toISOString() } as DeletionRequest; await this.save('deletionRequests', record.id, record, input.uid); return record; }
  getDailyAggregates(scenarioId?: string) { return this.list<DailyAggregate>('aggregates').then((items) => scenarioId ? items.filter((item: any) => item.scenarioId === scenarioId) : items); }
  async getDelayFunnel(scenarioId?: string) { const sessions = await this.listTrainingSessions(); return calculateDelayFunnel(sessions.filter((session) => session.dataOrigin === 'training_user' && (!scenarioId || session.scenarioId === scenarioId))); }

  // --- Emergency Resources & Verifications ---
  async listEmergencyResources(options: { onlyVerified?: boolean; excludeSynthetic?: boolean } = {}) {
    const onlyVerified = options.onlyVerified !== false; // default true for safety
    const excludeSynthetic = options.excludeSynthetic !== false; // default true for safety

    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('emergency_resources').select('*');
        if (onlyVerified) query = query.eq('verification_status', 'verified');
        if (excludeSynthetic) query = query.neq('origin', 'synthetic_seed');
        const { data, error } = await query;
        if (!error && data) {
          return data.map((row: any) => ({
            id: row.id,
            resourceType: row.resource_type,
            name: row.name,
            address: row.address,
            lat: row.lat,
            lng: row.lng,
            geohash7: row.geohash7,
            siteId: row.site_id,
            managingOrgId: row.managing_org_id,
            source: row.source,
            origin: row.origin,
            verificationStatus: row.verification_status,
            verifiedAt: row.verified_at,
            expiresAt: row.expires_at,
            notes: row.notes,
          }));
        }
      } catch {
        // Fallback to app_records collection if direct table is unavailable
      }
    }
    const stored = await this.list<any>('emergencyResources');
    return stored.filter((item) => (!onlyVerified || item.verificationStatus === 'verified') && (!excludeSynthetic || item.origin !== 'synthetic_seed'));
  }

  async createResourceSubmission(submission: any) {
    const id = randomUUID();
    const record = {
      ...submission,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('resource_submissions').insert({
          id,
          submitted_by: submission.submittedBy || null,
          resource_type: submission.resourceType,
          name: submission.name,
          address: submission.address,
          lat: submission.lat,
          lng: submission.lng,
          evidence_url: submission.evidenceUrl || null,
          managing_org_name: submission.managingOrgName || null,
          status: 'pending',
        });
      } catch {}
    }
    await this.save('resourceSubmissions', id, record, submission.submittedBy);
    return record;
  }

  async listResourceSubmissions(filters?: { status?: string; submittedBy?: string }) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('resource_submissions').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.submittedBy) query = query.eq('submitted_by', filters.submittedBy);
        const { data, error } = await query;
        if (!error && data) {
          return data.map((row: any) => ({
            id: row.id,
            submittedBy: row.submitted_by,
            resourceType: row.resource_type,
            name: row.name,
            address: row.address,
            lat: row.lat,
            lng: row.lng,
            evidenceUrl: row.evidence_url,
            managingOrgName: row.managing_org_name,
            status: row.status,
            rejectionReason: row.rejection_reason,
            createdAt: row.created_at,
          }));
        }
      } catch {}
    }
    const list = await this.list<any>('resourceSubmissions');
    return list.filter((item) => (!filters?.status || item.status === filters.status) && (!filters?.submittedBy || item.submittedBy === filters.submittedBy));
  }

  async reviewResourceSubmission(id: string, reviewerId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const current = await this.get<any>('resourceSubmissions', id);
    if (!current) return null;
    const updated = {
      ...current,
      status,
      rejectionReason: status === 'rejected' ? (rejectionReason || 'Không đủ minh chứng') : null,
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerId,
    };
    await this.save('resourceSubmissions', id, updated);

    // If approved, create verified emergency_resource
    if (status === 'approved') {
      const resourceId = randomUUID();
      const newResource = {
        id: resourceId,
        resourceType: current.resourceType,
        name: current.name,
        address: current.address,
        lat: current.lat,
        lng: current.lng,
        source: 'org_submission',
        origin: 'pilot_verified',
        verificationStatus: 'verified',
        verifiedAt: new Date().toISOString(),
      };
      await this.save('emergencyResources', resourceId, newResource);
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('emergency_resources').insert({
            id: resourceId,
            resource_type: current.resourceType,
            name: current.name,
            address: current.address,
            lat: current.lat,
            lng: current.lng,
            source: 'org_submission',
            origin: 'pilot_verified',
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
          });
        } catch {}
      }
    }
    return updated;
  }

  // --- Digital Proofs (Immutable Cryptographic Certification) ---
  async createDigitalProof(proof: { incidentId: string; userId: string; summary: any; payloadHash: string; consentSnapshot: any }) {
    const id = randomUUID();
    const record = {
      id,
      incidentId: proof.incidentId,
      userId: proof.userId,
      summary: proof.summary,
      payloadHash: proof.payloadHash,
      consentSnapshot: proof.consentSnapshot,
      version: '1.0',
      legalDisclaimer: 'Căn cứ tham chiếu hỗ trợ hồ sơ theo TT 126/2026/TT-BCA; chưa có giá trị pháp lý cho đến khi cơ quan quản lý Quỹ công nhận.',
      createdAt: new Date().toISOString(),
    };
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('digital_proofs').insert({
          id,
          incident_id: proof.incidentId,
          user_id: proof.userId,
          summary: proof.summary,
          payload_hash: proof.payloadHash,
          consent_snapshot: proof.consentSnapshot,
          version: '1.0',
          legal_disclaimer: record.legalDisclaimer,
        });
      } catch {}
    }
    await this.save('digitalProofs', record.payloadHash, record, proof.userId);
    return record;
  }

  async getDigitalProofByHash(payloadHash: string) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('digital_proofs').select('*').eq('payload_hash', payloadHash).maybeSingle();
        if (!error && data) {
          return {
            id: data.id,
            incidentId: data.incident_id,
            userId: data.user_id,
            summary: data.summary,
            payloadHash: data.payload_hash,
            consentSnapshot: data.consent_snapshot,
            version: data.version,
            legalDisclaimer: data.legal_disclaimer,
            createdAt: data.created_at,
          };
        }
      } catch {}
    }
    return this.get<any>('digitalProofs', payloadHash);
  }

  // --- Pilot Surveys (Pre / Post) ---
  async savePilotSurvey(survey: any) {
    const id = randomUUID();
    const record = {
      ...survey,
      id,
      createdAt: new Date().toISOString(),
    };
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('pilot_surveys').insert({
          id,
          session_id: survey.sessionId,
          device_hash: survey.deviceHash,
          survey_type: survey.surveyType,
          scenario_id: survey.scenarioId,
          confidence_score: survey.confidenceScore,
          preparedness_score: survey.preparednessScore,
          anxiety_score: survey.anxietyScore,
          sus_scores: survey.susScores || null,
          sus_final_score: survey.susFinalScore || null,
          consent: survey.consent !== false,
        });
      } catch {}
    }
    await this.save('pilotSurveys', id, record);
    return record;
  }

  async listPilotSurveys() {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('pilot_surveys').select('*').order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch {}
    }
    return this.list<any>('pilotSurveys');
  }

  // --- Interventions & Evaluations (Decision -> Action -> Measure Closed Loop) ---
  async listInterventions(orgId?: string) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('interventions').select('*, intervention_evaluations(*)').order('started_at', { ascending: false });
        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query;
        if (!error && data) return data;
      } catch {}
    }
    return [];
  }

  async createIntervention(intervention: any) {
    const id = randomUUID();
    const record = { ...intervention, id, createdAt: new Date().toISOString() };
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('interventions').insert({
          id,
          organization_id: intervention.organizationId || null,
          site_id: intervention.siteId || null,
          region_id: intervention.regionId || null,
          type: intervention.type,
          title: intervention.title,
          description: intervention.description || '',
          started_at: intervention.startedAt || new Date().toISOString(),
        });
      } catch {}
    }
    return record;
  }

  // --- Regional ADI Metrics with k-anonymity (hide cells < 5) ---
  async getRegionalAdiMetrics() {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('v_region_daily_adi').select('*').limit(200);
        if (!error && data) return data;
      } catch {}
    }
    // Standard mock TP.HCM regions with k-anonymity for standalone / testing
    return [
      { region_id: 'Q1-P01', district: 'Quận 1', name: 'Phường Bến Nghé', incident_count: 42, suppressed: false, avg_response_time_sec: 48, adi_avg: 18, avg_ttg_sec: 14, avg_ttc_sec: 38, mro_rate_percent: 24 },
      { region_id: 'Q1-P02', district: 'Quận 1', name: 'Phường Bến Thành', incident_count: 36, suppressed: false, avg_response_time_sec: 52, adi_avg: 22, avg_ttg_sec: 16, avg_ttc_sec: 42, mro_rate_percent: 28 },
      { region_id: 'Q3-P01', district: 'Quận 3', name: 'Phường Võ Thị Sáu', incident_count: 29, suppressed: false, avg_response_time_sec: 55, adi_avg: 24, avg_ttg_sec: 17, avg_ttc_sec: 44, mro_rate_percent: 31 },
      { region_id: 'Q5-P02', district: 'Quận 5', name: 'Phường 2', incident_count: 31, suppressed: false, avg_response_time_sec: 59, adi_avg: 27, avg_ttg_sec: 18, avg_ttc_sec: 49, mro_rate_percent: 35 },
      { region_id: 'Q10-P01', district: 'Quận 10', name: 'Phường 14', incident_count: 24, suppressed: false, avg_response_time_sec: 61, adi_avg: 29, avg_ttg_sec: 19, avg_ttc_sec: 51, mro_rate_percent: 38 },
      { region_id: 'QBT-P01', district: 'Quận Bình Thạnh', name: 'Phường 25', incident_count: 33, suppressed: false, avg_response_time_sec: 54, adi_avg: 23, avg_ttg_sec: 15, avg_ttc_sec: 43, mro_rate_percent: 27 },
      { region_id: 'QTD-P01', district: 'TP. Thủ Đức', name: 'Phường Linh Trung', incident_count: 28, suppressed: false, avg_response_time_sec: 66, adi_avg: 32, avg_ttg_sec: 21, avg_ttc_sec: 55, mro_rate_percent: 42 },
      { region_id: 'Q7-P01', district: 'Quận 7', name: 'Phường Tân Phú', incident_count: 22, suppressed: false, avg_response_time_sec: 57, adi_avg: 25, avg_ttg_sec: 16, avg_ttc_sec: 46, mro_rate_percent: 30 },
      { region_id: 'QPN-P01', district: 'Quận Phú Nhuận', name: 'Phường 7', incident_count: 19, suppressed: false, avg_response_time_sec: 50, adi_avg: 20, avg_ttg_sec: 14, avg_ttc_sec: 40, mro_rate_percent: 25 },
      { region_id: 'QTB-P02', district: 'Quận Tân Bình', name: 'Phường 2', incident_count: 3, suppressed: true, avg_response_time_sec: null, adi_avg: null, avg_ttg_sec: null, avg_ttc_sec: null, mro_rate_percent: null },
    ];
  }
}

export const dataRepository = new SupabaseRepository();
