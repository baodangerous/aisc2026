import { getSupabaseProfile, supabase } from '../supabase/client';
import { saveLocalSession, saveLocalEvent, getLocalSessions } from '../indexedDb';
import {
  UserProfile,
  TrainingSession,
  DailyAggregate,
  DelayFunnelStep,
  CommunityFacility,
  FactExtractionInput,
  FactExtractionOutput,
  AudioTranscribeInput,
  AudioTranscribeOutput,
  VisualFactExtractionInput,
  VisualFactExtractionOutput,
  InsightInput,
  InsightOutput,
  AuditLog,
  VolunteerApplication,
  VolunteerStatus,
} from '../../domain/schemas';

const API_BASE = '/api';

async function getSupabaseTrainingContext() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return { user: session.user, profile: await getSupabaseProfile(session.user) };
}

async function persistSupabaseSession(session: any, ownerUid: string) {
  if (!supabase) return null;
  const metrics = {
    durationSec: session.durationSec,
    timeToGuidanceSec: session.timeToGuidanceSec,
    timeToCallSec: session.timeToCallSec,
    timeToActionSec: session.timeToActionSec,
    adiSec: session.adiSec,
    mroFlag: session.mroFlag,
    readinessScore: session.readinessScore,
    confidenceDelta: session.confidenceDelta,
  };
  const { data, error } = await supabase.from('training_sessions').upsert({
    session_id: session.sessionId || session.clientSessionId,
    owner_uid: ownerUid,
    scenario_id: session.scenarioId,
    scenario_version_id: session.scenarioVersionId || 'v1',
    status: session.status || 'in_progress',
    data_origin: 'training_user',
    events: session.events || [],
    metrics,
    started_at: session.startedAt || new Date().toISOString(),
    completed_at: session.completedAt || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'session_id' }).select().single();
  if (error) throw error;
  return data;
}

// Obtain the current Supabase access token for server-side verification.
async function getAuthHeader(accessTokenOverride?: string): Promise<Record<string, string>> {
  if (accessTokenOverride) return { Authorization: `Bearer ${accessTokenOverride}` };
  if (!supabase) return {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Lỗi máy chủ (HTTP ${res.status})`);
    } else {
      const text = await res.text().catch(() => '');
      throw new Error(`Lỗi yêu cầu (HTTP ${res.status}): ${text.slice(0, 100) || 'Phản hồi không hợp lệ'}`);
    }
  }

  if (!isJson) {
    throw new Error(`API endpoint trả về HTML thay vì JSON (HTTP ${res.status}). Kiểm tra cấu hình router.`);
  }

  return res.json();
}

export const apiClient = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<{
      status: string;
      version: string;
      geminiReady: boolean;
      uptimeSeconds: number;
    }>(res);
  },

  // Supabase Auth Helper APIs
  async syncUserProfile(
    displayName?: string,
    preferredLanguage?: string,
    phone?: string,
    accessTokenOverride?: string
  ) {
    const authHeaders = await getAuthHeader(accessTokenOverride);
    const res = await fetch(`${API_BASE}/auth/sync-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ displayName, preferredLanguage, phone }),
    });
    return handleResponse<{ user: UserProfile }>(res);
  },

  async getCurrentUser(accessTokenOverride?: string) {
    const authHeaders = await getAuthHeader(accessTokenOverride);
    if (!authHeaders.Authorization) {
      return {
        user: {
          uid: 'anonymous_guest',
          displayName: 'Khách vãng lai (Guest)',
          phoneMasked: 'Chưa xác thực',
          role: 'guest' as const,
          preferredLanguage: 'vi' as const,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UserProfile,
        isGuest: true,
      };
    }
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: authHeaders,
    });
    return handleResponse<{ user: UserProfile; isGuest: boolean }>(res);
  },

  async requestAccountDeletion(reason?: string) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/privacy/delete-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<{ success: boolean; request: any }>(res);
  },

  // Scenarios (Resilient fallback to approvedScenarios)
  async getScenarios() {
    try {
      const res = await fetch(`${API_BASE}/scenarios`);
      return await handleResponse<{ scenarios: any[] }>(res);
    } catch {
      const { APPROVED_SCENARIOS } = await import('../../content/approvedScenarios');
      return { scenarios: APPROVED_SCENARIOS };
    }
  },

  async getScenario(id: string) {
    try {
      const res = await fetch(`${API_BASE}/scenarios/${id}`);
      return await handleResponse<{ scenario: any }>(res);
    } catch {
      const { APPROVED_SCENARIOS } = await import('../../content/approvedScenarios');
      const found = APPROVED_SCENARIOS.find((s) => s.id === id);
      return { scenario: found || APPROVED_SCENARIOS[0] };
    }
  },

  // Training Sessions
  async saveTrainingSession(session: any) {
    const supabaseContext = await getSupabaseTrainingContext().catch(() => null);
    if (supabaseContext) {
      await persistSupabaseSession(session, supabaseContext.user.id);
      return { session: session as TrainingSession, isLocalOnly: false };
    }
    const authHeaders = await getAuthHeader();
    if (!authHeaders.Authorization) {
      // Guest mode: Persist purely to local IndexedDB
      try {
        await saveLocalSession(session);
      } catch (e) {
        console.warn('IndexedDB write fallback note:', e);
      }
      return { session: session as TrainingSession, isLocalOnly: true };
    }

    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(session),
      });
      return handleResponse<{ session: TrainingSession; isDuplicate?: boolean }>(res);
    } catch (err) {
      // Offline fallback
      try {
        await saveLocalSession(session);
      } catch (e) {
        console.warn('IndexedDB fallback note:', e);
      }
      return { session: session as TrainingSession, isLocalOnly: true };
    }
  },

  async startSession(payload: {
    clientSessionId: string;
    scenarioId: string;
    scenarioVersionId?: string;
    scenarioTitle?: string;
    confidenceBefore?: number;
    dataOrigin?: string;
  }) {
    return this.saveTrainingSession({
      clientSessionId: payload.clientSessionId,
      scenarioId: payload.scenarioId,
      scenarioVersionId: payload.scenarioVersionId || 'v1',
      scenarioTitle: payload.scenarioTitle || 'Luyện tập tình huống',
      confidenceBefore: payload.confidenceBefore,
      status: 'in_progress',
      events: [],
      dataOrigin: payload.dataOrigin || 'training_user',
    });
  },

  async sendEventsBatch(clientSessionId: string, events: any[]) {
    const supabaseContext = await getSupabaseTrainingContext().catch(() => null);
    if (supabaseContext) {
      const { data: current, error: readError } = await supabase.from('training_sessions').select('events').eq('session_id', clientSessionId).eq('owner_uid', supabaseContext.user.id).maybeSingle();
      if (readError) throw readError;
      const previous = Array.isArray(current?.events) ? current.events : [];
      const merged = [...previous, ...events].filter((event, index, list) => list.findIndex((item) => item.clientEventId === event.clientEventId) === index);
      const { error } = await supabase.from('training_sessions').update({ events: merged, updated_at: new Date().toISOString() }).eq('session_id', clientSessionId).eq('owner_uid', supabaseContext.user.id);
      if (error) throw error;
      return { success: true, pending: false };
    }

    // Save to local indexedDB first
    try {
      for (const ev of events) {
        await saveLocalEvent({ ...ev, sessionId: clientSessionId });
      }
    } catch (e) {
      console.warn('IndexedDB saveLocalEvent note:', e);
    }

    const authHeaders = await getAuthHeader();
    if (!authHeaders.Authorization) {
      return { success: true, pending: true };
    }

    try {
      const res = await fetch(`${API_BASE}/sessions/${clientSessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ events }),
      });
      return handleResponse<{ success: boolean; session?: TrainingSession }>(res);
    } catch (err) {
      return { success: true, pending: true };
    }
  },

  async completeSession(clientSessionId: string, payload: {
    scenarioId: string;
    scenarioVersionId?: string;
    scenarioTitle?: string;
    confidenceAfter?: number;
    finalEvents: any[];
  }) {
    const supabaseContext = await getSupabaseTrainingContext().catch(() => null);
    if (supabaseContext) {
      const { data: current, error: readError } = await supabase.from('training_sessions').select('scenario_id,scenario_version_id,events,metrics,started_at').eq('session_id', clientSessionId).eq('owner_uid', supabaseContext.user.id).maybeSingle();
      if (readError) throw readError;
      if (!current) throw new Error('Không tìm thấy phiên luyện tập.');
      const { calculateSessionMetrics } = await import('../../domain/metrics/calculator');
      const events = [...(Array.isArray(current.events) ? current.events : []), ...payload.finalEvents].filter((event, index, list) => list.findIndex((item) => item.clientEventId === event.clientEventId) === index);
      const metrics = calculateSessionMetrics(events, { timeToGuidanceSec: 15, timeToCallSec: 30, timeToActionSec: 60, mroThresholdSec: 45 }, true);
      const nextMetrics = { ...current.metrics, ...metrics, confidenceAfter: payload.confidenceAfter };
      const { error } = await supabase.from('training_sessions').update({ status: 'completed', events, metrics: nextMetrics, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('session_id', clientSessionId).eq('owner_uid', supabaseContext.user.id);
      if (error) throw error;
      return { success: true, session: {
        sessionId: clientSessionId,
        clientSessionId,
        ownerUid: supabaseContext.user.id,
        scenarioId: current.scenario_id,
        scenarioVersionId: current.scenario_version_id,
        scenarioTitle: payload.scenarioTitle || 'Luyện tập tình huống',
        mode: 'training',
        status: 'completed',
        startedAt: current.started_at,
        completedAt: new Date().toISOString(),
        createdAt: current.started_at,
        updatedAt: new Date().toISOString(),
        events,
        dataOrigin: 'training_user',
        ...metrics,
        confidenceAfter: payload.confidenceAfter,
      } as TrainingSession };
    }
    const authHeaders = await getAuthHeader();
    if (!authHeaders.Authorization) {
      // Guest: calculate and persist in IndexedDB
      const { calculateSessionMetrics } = await import('../../domain/metrics/calculator');
      const metrics = calculateSessionMetrics(payload.finalEvents, {
        timeToGuidanceSec: 15,
        timeToCallSec: 30,
        timeToActionSec: 60,
        mroThresholdSec: 45,
      });

      const localSession: TrainingSession = {
        sessionId: clientSessionId,
        clientSessionId,
        scenarioId: payload.scenarioId,
        scenarioVersionId: payload.scenarioVersionId || 'v1',
        scenarioTitle: payload.scenarioTitle || 'Luyện tập tình huống',
        mode: 'training',
        status: 'completed',
        startedAt: payload.finalEvents[0]?.occurredAtClient || new Date().toISOString(),
        completedAt: payload.finalEvents[payload.finalEvents.length - 1]?.occurredAtClient || new Date().toISOString(),
        durationSec: metrics.durationSec,
        timeToGuidanceSec: metrics.timeToGuidanceSec,
        timeToCallSec: metrics.timeToCallSec,
        timeToActionSec: metrics.timeToActionSec,
        adiSec: metrics.adiSec,
        mroFlag: metrics.mroFlag,
        readinessScore: metrics.readinessScore,
        confidenceAfter: payload.confidenceAfter,
        dataOrigin: 'training_user',
        events: payload.finalEvents,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await saveLocalSession(localSession);
      } catch (e) {
        console.warn('IndexedDB write error:', e);
      }
      return { session: localSession, isLocalOnly: true };
    }

    try {
      const res = await fetch(`${API_BASE}/sessions/${clientSessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });
      return handleResponse<{ success: boolean; session: TrainingSession }>(res);
    } catch (err) {
      return this.saveTrainingSession({
        clientSessionId,
        scenarioId: payload.scenarioId,
        scenarioVersionId: payload.scenarioVersionId || 'v1',
        scenarioTitle: payload.scenarioTitle || 'Luyện tập tình huống',
        confidenceAfter: payload.confidenceAfter,
        status: 'completed',
        events: payload.finalEvents,
        dataOrigin: 'training_user',
      });
    }
  },

  async getMySessions() {
    const supabaseContext = await getSupabaseTrainingContext().catch(() => null);
    if (supabaseContext) {
      const { data, error } = await supabase.from('training_sessions').select('session_id,owner_uid,scenario_id,scenario_version_id,status,events,metrics,started_at,completed_at,updated_at').eq('owner_uid', supabaseContext.user.id).order('updated_at', { ascending: false });
      if (error) throw error;
      return { sessions: (data || []).map((row: any) => ({ sessionId: row.session_id, clientSessionId: row.session_id, ownerUid: row.owner_uid, scenarioId: row.scenario_id, scenarioVersionId: row.scenario_version_id, status: row.status, events: row.events || [], startedAt: row.started_at, completedAt: row.completed_at, updatedAt: row.updated_at, dataOrigin: 'training_user', ...(row.metrics || {}) })) as TrainingSession[] };
    }
    const authHeaders = await getAuthHeader();
    if (!authHeaders.Authorization) {
      const localList = await getLocalSessions();
      return { sessions: localList.filter((session) => !session.ownerUid) };
    }
    const res = await fetch(`${API_BASE}/sessions`, {
      headers: authHeaders,
    });
    return handleResponse<{ sessions: TrainingSession[] }>(res);
  },

  // Facilities Directory & Map Data
  async getFacilities() {
    try {
      const res = await fetch(`${API_BASE}/facilities`);
      return await handleResponse<{ facilities: CommunityFacility[] }>(res);
    } catch {
      return { facilities: [] };
    }
  },

  async getMapData(type?: string) {
    try {
      const query = type ? `?type=${type}` : '';
      const res = await fetch(`${API_BASE}/facilities${query}`);
      return await handleResponse<{ facilities: CommunityFacility[] }>(res);
    } catch {
      return { facilities: [] };
    }
  },

  async getImpactData(origin?: string) {
    const dailyRes = await this.getDailyAggregates().catch(() => ({ aggregates: [] }));
    const list = dailyRes.aggregates || [];
    const totalSessions = list.reduce((sum, a) => sum + (a.sessionCount || 0), 0);

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        hasData: false,
        livesSavedEstimate: null,
        averageAdiReductionPercent: null,
        certifiedRespondersCount: null,
      };
    }

    return {
      totalSessions, hasData: true,
      livesSavedEstimate: null,
      averageAdiReductionPercent: null,
      certifiedRespondersCount: null,
    };
  },

  // Analytics Dashboard
  async getDailyAggregates(scenarioId?: string) {
    const query = scenarioId ? `?scenarioId=${scenarioId}` : '';
    const res = await fetch(`${API_BASE}/aggregates/daily${query}`, { headers: await getAuthHeader() });
    return handleResponse<{ aggregates: DailyAggregate[] }>(res);
  },

  async getDelayFunnel(scenarioId?: string) {
    const query = scenarioId ? `?scenarioId=${scenarioId}` : '';
    const res = await fetch(`${API_BASE}/analytics/funnel${query}`, { headers: await getAuthHeader() });
    return handleResponse<{ funnel: DelayFunnelStep[] }>(res);
  },

  async getAnalyticsOverview(params?: { dataOrigin?: string; days?: number; scenarioId?: string }) {
    const [dailyRes, funnelRes] = await Promise.all([
      this.getDailyAggregates(params?.scenarioId),
      this.getDelayFunnel(params?.scenarioId),
    ]);

    const aggregates = dailyRes.aggregates || [];
    const totalSessions = aggregates.reduce((sum, a) => sum + (a.sessionCount || 0), 0);
    const completedSessions = aggregates.reduce((sum, a) => sum + (a.completionCount || a.sessionCount || 0), 0);

    if (totalSessions === 0) {
      return {
        hasData: false,
        kpis: {
          totalSessions: 0,
          completedSessions: 0,
          completionRate: 0,
          medianTimeToGuidanceSec: null,
          medianTimeToCallSec: null,
          medianTimeToActionSec: null,
          medianAdiSec: null,
          mroRate: null,
          avgReadinessScore: null,
          confidenceDeltaAvg: null,
          largestDelayStep: null,
        },
        dailyAggregates: [],
        delayFunnel: [],
      };
    }

    const validAdi = aggregates.filter(a => typeof a.medianAdiSec === 'number');
    const avgAdi = validAdi.length > 0
      ? validAdi.reduce((sum, a) => sum + (a.medianAdiSec || 0), 0) / validAdi.length
      : 0;

    const validReadiness = aggregates.filter(a => typeof a.avgReadinessScore === 'number');
    const avgReadiness = validReadiness.length > 0
      ? validReadiness.reduce((sum, a) => sum + (a.avgReadinessScore || 0), 0) / validReadiness.length
      : 0;

    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    return {
      hasData: true,
      kpis: {
        totalSessions,
        completedSessions,
        completionRate,
        medianTimeToGuidanceSec: null,
        medianTimeToCallSec: null,
        medianTimeToActionSec: null,
        medianAdiSec: null,
        mroRate: Math.round((aggregates.reduce((sum, a) => sum + (a.mroCount || 0), 0) / Math.max(1, completedSessions)) * 100),
        avgReadinessScore: Math.round(avgReadiness),
        confidenceDeltaAvg: null,
        largestDelayStep: funnelRes.funnel.length ? [...funnelRes.funnel].sort((a, b) => b.avoidableDelaySec - a.avoidableDelaySec)[0].stepKey : null,
      },
      dailyAggregates: aggregates,
      delayFunnel: funnelRes.funnel || [],
    };
  },

  // AI Fact Extractor & Copilot
  async extractFacts(input: FactExtractionInput) {
    const res = await fetch(`${API_BASE}/ai/extract-facts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<{ facts: FactExtractionOutput }>(res);
  },

  async transcribeAudio(input: AudioTranscribeInput) {
    const res = await fetch(`${API_BASE}/ai/transcribe-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<AudioTranscribeOutput>(res);
  },

  async extractVisualFacts(input: VisualFactExtractionInput) {
    const res = await fetch(`${API_BASE}/ai/extract-visual-facts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<{ facts: VisualFactExtractionOutput; result: VisualFactExtractionOutput }>(res);
  },

  async generateInsight(input: InsightInput) {
    const res = await fetch(`${API_BASE}/ai/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<{ insight: InsightOutput }>(res);
  },

  // Admin Audit Logs
  async getAuditLogs() {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: authHeaders,
    });
    return handleResponse<{ logs: AuditLog[] }>(res);
  },

  // Volunteer / First Responder APIs
  async applyVolunteer(data: {
    displayName: string;
    email?: string;
    phone?: string;
    province: string;
    district: string;
    skills: string[];
    cprTrained: boolean;
    certificationOrg?: string;
    certificateNumber?: string;
    availability: string;
    preferredRadiusKm: number;
    safetyConsent: boolean;
    privacyConsent: boolean;
  }) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/volunteer/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; application: VolunteerApplication }>(res);
  },

  async getMyVolunteerApplication() {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/volunteer/my-application`, {
      headers: authHeaders,
    });
    return handleResponse<{ application: VolunteerApplication | null }>(res);
  },

  async updateMyVolunteerStatus(action: 'pause' | 'resume' | 'withdraw') {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/volunteer/my-application/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ action }),
    });
    return handleResponse<{ success: boolean; application: VolunteerApplication }>(res);
  },

  async listVolunteerApplications(params?: {
    status?: string;
    province?: string;
    cprTrained?: boolean;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.province) query.set('province', params.province);
    if (params?.cprTrained !== undefined) query.set('cprTrained', String(params.cprTrained));
    if (params?.search) query.set('search', params.search);

    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/volunteer/admin/applications?${query.toString()}`, {
      headers: authHeaders,
    });
    return handleResponse<{ applications: VolunteerApplication[] }>(res);
  },

  async reviewVolunteerApplication(id: string, data: { status: VolunteerStatus; reviewNote: string }) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${API_BASE}/volunteer/admin/applications/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; application: VolunteerApplication }>(res);
  },
};
