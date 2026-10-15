import {
  TrainingSession,
  DailyAggregate,
  UserProfile,
  Scenario,
  ScenarioThresholds,
  CommunityFacility,
  AuditLog,
  DeletionRequest,
  VolunteerApplication,
  VolunteerStatus,
  SessionEvent,
} from '../src/domain/schemas';
import { APPROVED_SCENARIOS } from '../src/content/approvedScenarios';
import { calculateSessionMetrics, calculateDelayFunnel } from '../src/domain/metrics/calculator';
import { adminDb, isFirestoreAdminEnabled } from './firebaseAdmin';
import { serverStore, ServerDataStore } from './store';
import { Query } from 'firebase-admin/firestore';

export interface IDataRepository {
  init(): Promise<void>;
  probe(timeoutMs?: number): Promise<{ ok: boolean; database: 'cloud_firestore' | 'memory_fallback'; degraded?: boolean }>;
  getUser(uid: string): Promise<UserProfile | null>;
  upsertUser(user: Partial<UserProfile> & { uid: string }): Promise<UserProfile>;
  deleteUser(uid: string): Promise<void>;

  getScenarios(): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | null>;

  createTrainingSession(session: TrainingSession): Promise<TrainingSession>;
  appendSessionEvents(sessionId: string, newEvents: SessionEvent[]): Promise<TrainingSession | null>;
  completeTrainingSession(
    sessionId: string,
    payload: {
      completedAt?: string;
      confidenceAfter?: number;
      finalEvents?: SessionEvent[];
      thresholds?: ScenarioThresholds;
    }
  ): Promise<TrainingSession | null>;
  getTrainingSession(id: string): Promise<TrainingSession | null>;
  listTrainingSessions(ownerUid?: string): Promise<TrainingSession[]>;

  getFacilities(): Promise<CommunityFacility[]>;

  createVolunteerApplication(data: Omit<VolunteerApplication, 'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'>): Promise<VolunteerApplication>;
  getVolunteerApplicationByUserId(userId: string): Promise<VolunteerApplication | null>;
  getVolunteerApplicationById(id: string): Promise<VolunteerApplication | null>;
  updateVolunteerStatusByUser(userId: string, action: 'pause' | 'resume' | 'withdraw'): Promise<VolunteerApplication | null>;
  listVolunteerApplications(filters?: { status?: string; province?: string; cprTrained?: boolean; search?: string }): Promise<VolunteerApplication[]>;
  reviewVolunteerApplication(id: string, reviewerId: string, reviewerName: string, status: VolunteerStatus, reviewNote: string): Promise<VolunteerApplication | null>;

  logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  getAuditLogs(): Promise<AuditLog[]>;

  createDeletionRequest(req: Omit<DeletionRequest, 'id' | 'requestedAt'>): Promise<DeletionRequest>;

  getDailyAggregates(scenarioId?: string): Promise<DailyAggregate[]>;
  getDelayFunnel(scenarioId?: string): Promise<any>;
}

export const DEFAULT_FACILITIES: CommunityFacility[] = [
  {
    id: 'fac_station_115_hcm',
    name: 'Trung Tâm Cấp Cứu 115 TP. Hồ Chí Minh',
    type: 'emergency_station',
    address: '524 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 10',
    lat: 10.7733,
    lng: 106.6603,
    regionCell: 'hcm_q10',
    isPublicAccess: true,
    operatingHours: '24/7',
    status: 'verified',
    disclaimer: 'Cơ sở cấp cứu 115 chính thức trực thuộc Sở Y Tế TP.HCM.',
  },
  {
    id: 'fac_hosp_nd115',
    name: 'Bệnh viện Nhân Dân 115 (Khoa Cấp cứu & Đột quỵ)',
    type: 'hospital',
    address: '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 10',
    lat: 10.7725,
    lng: 106.6612,
    regionCell: 'hcm_q10',
    isPublicAccess: true,
    operatingHours: '24/7',
    status: 'verified',
    disclaimer: 'Bệnh viện tuyến cuối đa khoa có đơn vị cấp cứu đột quỵ.',
  },
  {
    id: 'fac_hosp_01',
    name: 'Bệnh viện Đa khoa Sài Gòn',
    type: 'hospital',
    address: '125 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    lat: 10.7725,
    lng: 106.6985,
    regionCell: 'hcm_q1_central',
    isPublicAccess: true,
    operatingHours: '24/7',
    status: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_hosp_02',
    name: 'Bệnh viện Nhân dân Gia Định',
    type: 'hospital',
    address: '01 Nơ Trang Long, Phường 7, Bình Thạnh, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Bình Thạnh',
    lat: 10.8035,
    lng: 106.6953,
    regionCell: 'hcm_binhthanh_core',
    isPublicAccess: true,
    operatingHours: '24/7',
    status: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_01',
    name: 'Điểm AED Minh Họa — Công viên 23/9',
    type: 'aed',
    address: 'Đường Lê Lai, Phường Bến Thành, Quận 1, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    lat: 10.7702,
    lng: 106.6934,
    regionCell: 'hcm_q1_central',
    isPublicAccess: true,
    operatingHours: '24/7',
    status: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_02',
    name: 'Điểm AED Minh Họa — Nhà thi đấu Nguyễn Du',
    type: 'aed',
    address: '116 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    lat: 10.7745,
    lng: 106.6922,
    regionCell: 'hcm_q1_central',
    isPublicAccess: true,
    operatingHours: '06:00 - 22:00',
    status: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_03',
    name: 'Điểm AED Minh Họa — Co.opmart Cống Quỳnh',
    type: 'aed',
    address: '189C Cống Quỳnh, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    lat: 10.7656,
    lng: 106.6872,
    regionCell: 'hcm_q1_west',
    isPublicAccess: true,
    operatingHours: '08:00 - 22:00',
    status: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },
];

export class FirestoreRepository implements IDataRepository {
  private initialized = false;
  private firestoreActive = false;
  private fallbackStore: ServerDataStore = serverStore;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (!isFirestoreAdminEnabled()) {
      this.initialized = true;
      this.firestoreActive = false;
      console.log('[FirestoreRepository] Firestore Admin disabled (ENABLE_FIRESTORE_ADMIN!=true); memory resilience store active.');
      return;
    }

    try {
      // Attempt idempotent seeding on Firestore
      for (const sc of APPROVED_SCENARIOS) {
        const scRef = adminDb.collection('scenarios').doc(sc.id);
        const doc = await scRef.get().catch(() => null);
        if (doc && !doc.exists) {
          await scRef.set(sc).catch(() => {});
        }
      }

      for (const fac of DEFAULT_FACILITIES) {
        const fRef = adminDb.collection('facilities').doc(fac.id);
        const doc = await fRef.get().catch(() => null);
        if (doc && !doc.exists) {
          await fRef.set(fac).catch(() => {});
        }
      }

      this.firestoreActive = true;
      this.initialized = true;
      console.log('[FirestoreRepository] Initialized successfully with Cloud Firestore.');
    } catch (err: any) {
      this.firestoreActive = false;
      this.initialized = true;
      console.log('[FirestoreRepository] Cloud Firestore offline or restricted; memory resilience store active.');
    }
  }

  // --- Users ---
  async getUser(uid: string): Promise<UserProfile | null> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const doc = await adminDb.collection('users').doc(uid).get().catch(() => null);
        if (!doc || !doc.exists) return this.fallbackStore.users.get(uid) || null;
        return doc.data() as UserProfile;
      } catch {
        this.firestoreActive = false;
      }
    }
    return this.fallbackStore.users.get(uid) || null;
  }

  async upsertUser(user: Partial<UserProfile> & { uid: string }): Promise<UserProfile> {
    const now = new Date().toISOString();
    const existing = this.fallbackStore.users.get(user.uid);
    let updated: UserProfile;

    if (!existing) {
      updated = {
        uid: user.uid,
        displayName: user.displayName || 'Công dân Cứu sinh',
        phoneMasked: user.phoneMasked || 'Chưa cung cấp',
        role: user.role || 'citizen',
        preferredLanguage: user.preferredLanguage || 'vi',
        onboardingCompleted: user.onboardingCompleted ?? false,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      updated = {
        ...existing,
        ...user,
        updatedAt: now,
      };
    }
    this.fallbackStore.users.set(user.uid, updated);

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const userRef = adminDb.collection('users').doc(user.uid);
        await userRef.set(updated, { merge: true }).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return updated;
  }

  async deleteUser(uid: string): Promise<void> {
    this.fallbackStore.users.delete(uid);
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('users').doc(uid).delete().catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }
  }

  // --- Scenarios ---
  async getScenarios(): Promise<Scenario[]> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const snap = await adminDb.collection('scenarios').get().catch(() => null);
        if (snap && !snap.empty) return snap.docs.map((d) => d.data() as Scenario);
      } catch {
        this.firestoreActive = false;
      }
    }
    return APPROVED_SCENARIOS;
  }

  async getScenario(id: string): Promise<Scenario | null> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const doc = await adminDb.collection('scenarios').doc(id).get().catch(() => null);
        if (doc && doc.exists) return doc.data() as Scenario;
      } catch {
        this.firestoreActive = false;
      }
    }
    const found = APPROVED_SCENARIOS.find((s) => s.id === id);
    return found || null;
  }

  // --- Health Probe with strict timeout ---
  async probe(timeoutMs = 3500): Promise<{ ok: boolean; database: 'cloud_firestore' | 'memory_fallback'; degraded?: boolean }> {
    if (!isFirestoreAdminEnabled() || !this.firestoreActive) {
      return {
        ok: true,
        database: 'memory_fallback',
        degraded: true,
      };
    }

    let timer: NodeJS.Timeout | undefined;
    const probePromise = (async () => {
      try {
        const snap = await adminDb.collection('scenarios').limit(1).get().catch((e) => {
          throw e;
        });
        return snap !== null && snap !== undefined;
      } catch (err) {
        throw err;
      }
    })();

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      timer = setTimeout(() => reject(new Error('FIRESTORE_PROBE_TIMEOUT')), timeoutMs);
    });

    try {
      const result = await Promise.race([probePromise, timeoutPromise]);
      if (result) {
        return {
          ok: true,
          database: 'cloud_firestore',
        };
      }
      this.firestoreActive = false;
      return {
        ok: true,
        database: 'memory_fallback',
        degraded: true,
      };
    } catch {
      this.firestoreActive = false;
      return {
        ok: true,
        database: 'memory_fallback',
        degraded: true,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // --- Training Sessions ---
  async createTrainingSession(session: TrainingSession): Promise<TrainingSession> {
    this.fallbackStore.sessions.set(session.sessionId, JSON.parse(JSON.stringify(session)));
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('trainingSessions').doc(session.sessionId).set(session).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }
    return session;
  }

  async appendSessionEvents(sessionId: string, newEvents: SessionEvent[]): Promise<TrainingSession | null> {
    let existingSession = this.fallbackStore.sessions.get(sessionId) || null;

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const docRef = adminDb.collection('trainingSessions').doc(sessionId);
        const doc = await docRef.get().catch(() => null);
        if (doc && doc.exists) {
          existingSession = doc.data() as TrainingSession;
        }
      } catch {
        this.firestoreActive = false;
      }
    }

    if (!existingSession) return null;

    const eventIds = new Set(existingSession.events.map((e) => e.clientEventId));
    const uniqueIncoming = newEvents.filter((e) => !eventIds.has(e.clientEventId));

    if (uniqueIncoming.length === 0) {
      return existingSession;
    }

    const updatedEvents = [...existingSession.events, ...uniqueIncoming].sort(
      (a, b) => a.elapsedMs - b.elapsedMs
    );

    const updatedSession: TrainingSession = {
      ...existingSession,
      events: updatedEvents,
      updatedAt: new Date().toISOString(),
    };

    this.fallbackStore.sessions.set(sessionId, JSON.parse(JSON.stringify(updatedSession)));

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('trainingSessions').doc(sessionId).set(updatedSession, { merge: true }).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return updatedSession;
  }

  async completeTrainingSession(
    sessionId: string,
    payload: {
      completedAt?: string;
      confidenceAfter?: number;
      finalEvents?: SessionEvent[];
      thresholds?: ScenarioThresholds;
    }
  ): Promise<TrainingSession | null> {
    let existingSession = this.fallbackStore.sessions.get(sessionId) || null;

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const docRef = adminDb.collection('trainingSessions').doc(sessionId);
        const doc = await docRef.get().catch(() => null);
        if (doc && doc.exists) {
          existingSession = doc.data() as TrainingSession;
        }
      } catch {
        this.firestoreActive = false;
      }
    }

    if (!existingSession) return null;

    let combinedEvents = existingSession.events;
    if (payload.finalEvents && payload.finalEvents.length > 0) {
      const eventIds = new Set(existingSession.events.map((e) => e.clientEventId));
      const newEvts = payload.finalEvents.filter((e) => !eventIds.has(e.clientEventId));
      combinedEvents = [...existingSession.events, ...newEvts].sort((a, b) => a.elapsedMs - b.elapsedMs);
    }

    const completedAt = payload.completedAt || new Date().toISOString();
    const thresholds = payload.thresholds || {
      timeToGuidanceSec: 15,
      timeToCallSec: 45,
      timeToActionSec: 60,
      mroThresholdSec: 45,
    };
    const metrics = calculateSessionMetrics(combinedEvents, thresholds, true);

    const completedSession: TrainingSession = {
      ...existingSession,
      events: combinedEvents,
      completedAt,
      status: 'completed',
      durationSec: metrics.durationSec,
      timeToGuidanceSec: metrics.timeToGuidanceSec,
      timeToCallSec: metrics.timeToCallSec,
      timeToActionSec: metrics.timeToActionSec,
      adiSec: metrics.adiSec,
      mroFlag: metrics.mroFlag,
      readinessScore: metrics.readinessScore,
      confidenceAfter: payload.confidenceAfter ?? existingSession.confidenceAfter,
      confidenceDelta: (payload.confidenceAfter ?? existingSession.confidenceAfter ?? 3) - (existingSession.confidenceBefore ?? 3),
      updatedAt: new Date().toISOString(),
    };

    this.fallbackStore.sessions.set(sessionId, JSON.parse(JSON.stringify(completedSession)));

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('trainingSessions').doc(sessionId).set(completedSession, { merge: true }).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return completedSession;
  }

  async getTrainingSession(id: string): Promise<TrainingSession | null> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const doc = await adminDb.collection('trainingSessions').doc(id).get().catch(() => null);
        if (doc && doc.exists) return doc.data() as TrainingSession;
      } catch {
        this.firestoreActive = false;
      }
    }
    return this.fallbackStore.sessions.get(id) || null;
  }

  async listTrainingSessions(ownerUid?: string): Promise<TrainingSession[]> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        let query: Query = adminDb.collection('trainingSessions');
        if (ownerUid) {
          query = query.where('ownerUid', '==', ownerUid);
        }
        const snap = await query.limit(50).get().catch(() => null);
        if (snap && !snap.empty) {
          return snap.docs.map((d) => d.data() as TrainingSession);
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    const all = Array.from(this.fallbackStore.sessions.values());
    if (ownerUid) {
      return all.filter((s) => s.ownerUid === ownerUid);
    }
    return all;
  }

  // --- Facilities ---
  async getFacilities(): Promise<CommunityFacility[]> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const snap = await adminDb.collection('facilities').get().catch(() => null);
        if (snap && !snap.empty) {
          return snap.docs.map((d) => d.data() as CommunityFacility);
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    return DEFAULT_FACILITIES;
  }

  // --- Volunteers ---
  async createVolunteerApplication(
    data: Omit<VolunteerApplication, 'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'>
  ): Promise<VolunteerApplication> {
    const id = `vol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const application: VolunteerApplication = {
      ...data,
      id,
      status: 'pending_review',
      statusHistory: [
        {
          status: 'pending_review',
          timestamp: now,
          note: 'Hồ sơ đã được gửi trực tuyến qua cổng GoldenMinutes.',
          actorRole: 'volunteer',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.fallbackStore.volunteerApplications.set(id, application);

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('volunteerApplications').doc(id).set(application).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return application;
  }

  async getVolunteerApplicationByUserId(userId: string): Promise<VolunteerApplication | null> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const snap = await adminDb
          .collection('volunteerApplications')
          .where('userId', '==', userId)
          .limit(1)
          .get()
          .catch(() => null);
        if (snap && !snap.empty) {
          return snap.docs[0].data() as VolunteerApplication;
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    return this.fallbackStore.getVolunteerApplicationByUserId(userId) || null;
  }

  async getVolunteerApplicationById(id: string): Promise<VolunteerApplication | null> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const doc = await adminDb.collection('volunteerApplications').doc(id).get().catch(() => null);
        if (doc && doc.exists) {
          return doc.data() as VolunteerApplication;
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    return this.fallbackStore.volunteerApplications.get(id) || null;
  }

  async updateVolunteerStatusByUser(
    userId: string,
    action: 'pause' | 'resume' | 'withdraw'
  ): Promise<VolunteerApplication | null> {
    const updated = this.fallbackStore.updateVolunteerStatusByUser(userId, action);
    if (!updated) return null;

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('volunteerApplications').doc(updated.id).set(updated, { merge: true }).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return updated;
  }

  async listVolunteerApplications(filters?: {
    status?: string;
    province?: string;
    cprTrained?: boolean;
    search?: string;
  }): Promise<VolunteerApplication[]> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        let query: Query = adminDb.collection('volunteerApplications');
        if (filters?.status) {
          query = query.where('status', '==', filters.status);
        }
        if (filters?.province) {
          query = query.where('province', '==', filters.province);
        }
        if (filters?.cprTrained !== undefined) {
          query = query.where('cprTrained', '==', filters.cprTrained);
        }

        const snap = await query.get().catch(() => null);
        if (snap && !snap.empty) {
          let list = snap.docs.map((d) => d.data() as VolunteerApplication);

          if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(
              (a) =>
                a.displayName.toLowerCase().includes(q) ||
                a.district.toLowerCase().includes(q) ||
                (a.certificateNumber && a.certificateNumber.toLowerCase().includes(q))
            );
          }

          return list;
        }
      } catch {
        this.firestoreActive = false;
      }
    }

    return this.fallbackStore.listVolunteerApplications(filters);
  }

  async reviewVolunteerApplication(
    id: string,
    reviewerId: string,
    reviewerName: string,
    status: VolunteerStatus,
    reviewNote: string
  ): Promise<VolunteerApplication | null> {
    const updated = this.fallbackStore.reviewVolunteerApplication(id, reviewerId, reviewerName, status, reviewNote);
    if (!updated) return null;

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('volunteerApplications').doc(updated.id).set(updated, { merge: true }).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return updated;
  }

  // --- Audit Logs ---
  async logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    this.fallbackStore.logAudit(entry);
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const logDoc: AuditLog = {
          ...entry,
          id,
          timestamp: new Date().toISOString(),
        };
        await adminDb.collection('auditLogs').doc(id).set(logDoc).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const snap = await adminDb.collection('auditLogs').limit(100).get().catch(() => null);
        if (snap && !snap.empty) {
          return snap.docs.map((d) => d.data() as AuditLog);
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    return this.fallbackStore.auditLogs.slice(0, 100);
  }

  // --- Privacy & Deletion ---
  async createDeletionRequest(req: Omit<DeletionRequest, 'id' | 'requestedAt'>): Promise<DeletionRequest> {
    const id = `del_${Date.now()}`;
    const now = new Date().toISOString();
    const docData: DeletionRequest = {
      ...req,
      id,
      requestedAt: now,
    };
    this.fallbackStore.deletionRequests.set(id, docData);

    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        await adminDb.collection('deletionRequests').doc(id).set(docData).catch(() => {
          this.firestoreActive = false;
        });
      } catch {
        this.firestoreActive = false;
      }
    }

    return docData;
  }

  // --- Aggregates & Analytics ---
  async getDailyAggregates(scenarioId?: string): Promise<DailyAggregate[]> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        let query: Query = adminDb.collection('aggregates');
        if (scenarioId) {
          query = query.where('scenarioId', '==', scenarioId);
        }
        const snap = await query.limit(90).get().catch(() => null);
        if (snap && !snap.empty) {
          return snap.docs.map((d) => d.data() as DailyAggregate);
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    return this.fallbackStore.getDailyAggregates({ scenarioId });
  }

  async getDelayFunnel(scenarioId?: string): Promise<any> {
    if (this.firestoreActive && isFirestoreAdminEnabled()) {
      try {
        const snap = await adminDb.collection('trainingSessions').limit(500).get().catch(() => null);
        if (snap && !snap.empty) {
          const sessions = snap.docs.map((d) => d.data() as TrainingSession);
          return calculateDelayFunnel(sessions);
        }
      } catch {
        this.firestoreActive = false;
      }
    }
    const sessions = Array.from(this.fallbackStore.sessions.values());
    return calculateDelayFunnel(sessions);
  }
}

export const dataRepository = new FirestoreRepository();
