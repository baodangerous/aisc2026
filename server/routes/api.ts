import { Router, Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { dataRepository, RepositoryError } from '../repository';
import { DocumentIdSchema, SessionEventSchema, normalizeEvents } from '../../src/domain/schemas/persistence';
import { supabaseAdmin, verifySupabaseAccessToken } from '../supabaseAuth';
import {
  extractEmergencyFacts,
  generateAnalyticsInsight,
  transcribeAndExtractFromAudio,
  extractVisualPracticeFacts,
} from '../services/gemini';
import {
  FactExtractionInputSchema,
  InsightInputSchema,
  AudioTranscribeInputSchema,
  VisualFactExtractionInputSchema,
  UserProfile,
  SessionEvent,
  TrainingSession,
  DataOrigin,
} from '../../src/domain/schemas';
import { calculateSessionMetrics } from '../../src/domain/metrics/calculator';

export const apiRouter = Router();
const safeHandler = (handler: import('express').RequestHandler): import('express').RequestHandler =>
  (req, res, next) => { Promise.resolve().then(() => handler(req, res, next)).catch(next); };
const routes = {
  get: (path: string, ...handlers: import('express').RequestHandler[]) => apiRouter.get(path, ...handlers.map(safeHandler)),
  post: (path: string, ...handlers: import('express').RequestHandler[]) => apiRouter.post(path, ...handlers.map(safeHandler)),
  patch: (path: string, ...handlers: import('express').RequestHandler[]) => apiRouter.patch(path, ...handlers.map(safeHandler)),
};

export const VALID_ROLES = ['citizen', 'volunteer', 'clinical_reviewer', 'org_admin', 'platform_admin'] as const;
export type ValidRole = (typeof VALID_ROLES)[number];

export function getEffectiveRoleFromClaims(claims?: Record<string, any>): ValidRole {
  if (!claims) return 'citizen';
  if (claims.admin === true || claims.platform_admin === true || claims.role === 'platform_admin') {
    return 'platform_admin';
  }
  if (claims.clinical_reviewer === true || claims.reviewer === true || claims.role === 'clinical_reviewer') {
    return 'clinical_reviewer';
  }
  if (claims.org_admin === true || claims.role === 'org_admin') {
    return 'org_admin';
  }
  if (claims.volunteer === true || claims.role === 'volunteer') {
    return 'volunteer';
  }
  if (claims.role === 'citizen') {
    return 'citizen';
  }
  return 'citizen';
}

// Middleware to parse and verify a Supabase access token
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  authUid?: string;
  authClaims?: Record<string, any>;
}

export const authenticateOptional = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const supabaseUser = await verifySupabaseAccessToken(token);
      if (supabaseUser) {
        req.authUid = supabaseUser.id;
        req.authClaims = { sub: supabaseUser.id, role: supabaseUser.app_metadata?.role || 'citizen' };
        let user = await dataRepository.getUser(supabaseUser.id);
        if (!user) {
          const rawPhone = supabaseUser.phone || '';
          const phoneMasked = rawPhone.length > 6 ? `${rawPhone.slice(0, 3)}***${rawPhone.slice(-4)}` : 'Chưa cung cấp';
          user = await dataRepository.upsertUser({
            uid: supabaseUser.id,
            displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'Công dân Cứu sinh',
            phoneMasked,
            role: getEffectiveRoleFromClaims(req.authClaims),
            preferredLanguage: 'vi',
          });
        }
        req.user = { ...user, role: user.role || getEffectiveRoleFromClaims(req.authClaims) };
      } else {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Token không hợp lệ. Vui lòng đăng nhập lại.' });
      }
    } catch (err) {
      if (err instanceof RepositoryError || (err instanceof Error && err.message.includes('disabled'))) {
        return res.status(503).json({ code: 'ACCOUNT_SERVICE_UNAVAILABLE', message: 'Dịch vụ tài khoản chưa sẵn sàng. Vui lòng thử lại sau.' });
      }
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    }
  }
  next();
};

export const authenticateRequired = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  authenticateOptional(req, res, () => {
    if (!req.user || !req.authUid) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập để truy cập tài nguyên này.',
        requestId: req.headers['x-request-id'] || 'req_anon',
      });
    }
    next();
  });
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Strictly verify roles from the Supabase access token
    const effectiveRole = getEffectiveRoleFromClaims(req.authClaims);

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này. Quyền cần được cấp bởi quản trị viên hệ thống.',
        requestId: req.headers['x-request-id'] || 'req_forbidden',
      });
    }
    next();
  };
};

// In-Memory Simple Rate Limiter for AI endpoints
const aiRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const checkAiRateLimit = (key: string, maxPerMin: number = 20): boolean => {
  const now = Date.now();
  const entry = aiRateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    aiRateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMin) {
    return false;
  }
  entry.count++;
  return true;
};

// 1. Health Check
routes.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'GoldenMinutes Emergency Response Intelligence System',

    timestamp: new Date().toISOString(),
  });
});

// 2. Supabase user profile synchronization
const SyncProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  preferredLanguage: z.enum(['vi', 'en']).optional(),
  phone: z.string().max(20).optional(),
});

routes.post('/auth/sync-profile', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = SyncProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_INPUT', errors: parsed.error.issues });
  }

  const { displayName, preferredLanguage, phone } = parsed.data;
  const uid = req.authUid!;

  const phoneMasked = phone && phone.length > 6
    ? `${phone.slice(0, 3)}***${phone.slice(-4)}`
    : undefined;

  // Role cannot be modified by user request - strict protection against privilege escalation
  const updated = await dataRepository.upsertUser({
    uid,
    ...(displayName ? { displayName } : {}),
    ...(preferredLanguage ? { preferredLanguage } : {}),
    ...(phoneMasked ? { phoneMasked } : {}),
  });

  await dataRepository.logAudit({
    actorUid: uid,
    actorRole: updated.role,
    action: 'USER_SYNC_PROFILE',
    targetResource: `users/${uid}`,
    details: { preferredLanguage: updated.preferredLanguage },
    ipAddressMasked: 'not_collected',
  });

  res.json({ user: updated });
});

// 3. User Me Profile
routes.get('/auth/me', authenticateOptional, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json({
      user: {
        uid: 'anonymous_guest',
        displayName: 'Khách vãng lai (Guest)',
        phoneMasked: 'Chưa xác thực',
        role: 'guest',
        preferredLanguage: 'vi',
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as UserProfile,
      isGuest: true,
    });
  }

  res.json({
    user: req.user,
    isGuest: false,
  });
});

// 4. Scenarios List & Details
routes.get('/scenarios', async (req: Request, res: Response) => {
  const list = await dataRepository.getScenarios();
  res.json({ scenarios: list });
});

routes.get('/scenarios/:id', async (req: Request, res: Response) => {
  const scenario = await dataRepository.getScenario(req.params.id);
  if (!scenario) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Kịch bản không tồn tại.' });
  }
  res.json({ scenario });
});

// 5. Training sessions: create and sync
const CreateSessionSchema = z.object({
  sessionId: DocumentIdSchema.optional(), clientSessionId: DocumentIdSchema.optional(),
  scenarioId: DocumentIdSchema, scenarioVersionId: DocumentIdSchema.optional(),
  scenarioTitle: z.string().max(200),
  mode: z.enum(['training', 'simulation']).optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  events: z.array(SessionEventSchema).max(512),
  dataOrigin: z.literal('training_user').optional(),
  confidenceBefore: z.number().int().min(1).max(5).optional(),
  confidenceAfter: z.number().int().min(1).max(5).optional(),
});

routes.post('/sessions', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = CreateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_SESSION_DATA', errors: parsed.error.issues });
  }

  const {
    scenarioId,
    scenarioVersionId,
    scenarioTitle,
    events,
    clientSessionId,
    mode,
    status,
    dataOrigin,
    confidenceBefore,
    confidenceAfter,
  } = parsed.data;
  const ownerUid = req.authUid!;

  const sessionId = parsed.data.sessionId || clientSessionId || `sess_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Check ownership before returning a duplicate; IDs are not authorization.
  const existing = await dataRepository.getTrainingSession(sessionId);
  if (existing) {
    if (existing.ownerUid !== ownerUid) return res.status(409).json({ code: 'SESSION_CONFLICT', message: 'Mã phiên không khả dụng.' });
    return res.json({ session: existing, isDuplicate: true });
  }
  const scenario = await dataRepository.getScenario(scenarioId);
  const version = scenario?.versions.find((item) => item.versionId === (scenarioVersionId || scenario.activeVersionId));
  if (!scenario || !version) return res.status(400).json({ code: 'INVALID_SCENARIO', message: 'Phiên bản bài tập không tồn tại.' });
  const safeEvents = normalizeEvents(events, sessionId);
  const metrics = calculateSessionMetrics(safeEvents, version.thresholds, (status || 'completed') === 'completed');

  const session: TrainingSession = {
    sessionId,
    clientSessionId: clientSessionId || sessionId,
    ownerUid,
    scenarioId,
    scenarioVersionId: version.versionId,
    scenarioTitle: scenario.title,
    mode: mode || 'training',
    status: status || 'completed',
    startedAt: events[0]?.occurredAtClient || now,
    completedAt: events[events.length - 1]?.occurredAtClient || now,
    durationSec: metrics.durationSec,
    timeToGuidanceSec: metrics.timeToGuidanceSec,
    timeToCallSec: metrics.timeToCallSec,
    timeToActionSec: metrics.timeToActionSec,
    adiSec: metrics.adiSec,
    mroFlag: metrics.mroFlag,
    readinessScore: metrics.readinessScore,
    confidenceBefore,
    confidenceAfter,
    confidenceDelta: (confidenceBefore !== undefined && confidenceAfter !== undefined) ? confidenceAfter - confidenceBefore : undefined,
    dataOrigin: 'training_user',
    events: safeEvents,
    createdAt: now,
    updatedAt: now,
  };

  const created = await dataRepository.createTrainingSession(session);

  await dataRepository.logAudit({
    actorUid: ownerUid,
    actorRole: req.user ? req.user.role : 'citizen',
    action: 'TRAINING_SESSION_SUBMIT',
    targetResource: `sessions/${created.sessionId}`,
    details: { adi: created.adiSec, readiness: created.readinessScore },
    ipAddressMasked: 'not_collected',
  });

  res.status(201).json({ session: created });
});

// 5b. Idempotent Event Batch Appending
const AppendEventsSchema = z.object({ events: z.array(SessionEventSchema).min(1).max(512) });

routes.post('/sessions/:id/events', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.params.id;
  const parsed = AppendEventsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_EVENTS', errors: parsed.error.issues });
  }

  const existing = await dataRepository.getTrainingSession(sessionId);
  if (!existing) {
    return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'Phiên luyện tập không tồn tại.' });
  }

  if (existing.ownerUid !== req.authUid) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Bạn không có quyền chỉnh sửa phiên này.' });
  }

  const updatedSession = await dataRepository.appendSessionEvents(sessionId, normalizeEvents(parsed.data.events, sessionId));
  res.json({ success: true, session: updatedSession });
});

// 5c. Complete Training Session Endpoint
const CompleteSessionSchema = z.object({
  scenarioId: z.string(),
  scenarioVersionId: z.string().optional(),
  scenarioTitle: z.string().optional(),
  confidenceAfter: z.number().int().min(1).max(5).optional(),
  finalEvents: z.array(SessionEventSchema).max(512),
});

routes.post('/sessions/:id/complete', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.params.id;
  const parsed = CompleteSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_INPUT', errors: parsed.error.issues });
  }

  const existing = await dataRepository.getTrainingSession(sessionId);
  if (!existing) {
    return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'Phiên luyện tập không tồn tại.' });
  }

  if (existing.ownerUid !== req.authUid) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Bạn không có quyền hoàn tất phiên này.' });
  }

  const thresholds = {
    timeToGuidanceSec: 15,
    timeToCallSec: 30,
    timeToActionSec: 60,
    mroThresholdSec: 45,
  };

  const completed = await dataRepository.completeTrainingSession(sessionId, {
    confidenceAfter: parsed.data.confidenceAfter,
    finalEvents: normalizeEvents(parsed.data.finalEvents, sessionId),
    thresholds,
  });

  res.json({ success: true, session: completed });
});

// 6. List user's private sessions (Strictly own sessions only)
routes.get('/sessions', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.authUid!;
  const list = await dataRepository.listTrainingSessions(uid);
  res.json({ sessions: list });
});

// Admin/Reviewer listing of aggregated/audited sessions
routes.get(
  '/admin/sessions',
  authenticateRequired,
  requireRole(['platform_admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    const list = await dataRepository.listTrainingSessions();
    res.json({ sessions: list });
  }
);

// 7. Get specific session (IDOR safe check)
routes.get('/sessions/:id', authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const session = await dataRepository.getTrainingSession(req.params.id);
    if (!session) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Phiên luyện tập không tồn tại.' });
    }

    // IDOR Protection: Citizens can only see their own sessions; Staff/Admin can view all via verified Custom Claims
    const isOwner = session.ownerUid === req.authUid;
    const effectiveRole = getEffectiveRoleFromClaims(req.authClaims);
    const isPrivileged = ['platform_admin'].includes(effectiveRole);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Bạn không có quyền xem phiên luyện tập này.' });
    }

    res.json({ session });
  } catch (err) {
    next(err);
  }
});

// 7b. Self-service Account Deletion (Decree 13 / GDPR Compliance)
routes.post('/auth/delete-account', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.authUid!;
  try {
    const deletion = await dataRepository.createDeletionRequest({
      uid, phoneMasked: req.user?.phoneMasked || '', status: 'pending',
    });
    res.status(202).json({ success: true, request: deletion, message: 'Đã tiếp nhận yêu cầu xóa. Dữ liệu chưa bị xóa; yêu cầu đang chờ xử lý.' });
  } catch (err: any) {
    console.error('Delete account error:', err);
    res.status(500).json({ code: 'DELETE_ERROR', message: 'Không th��� hoàn tất xóa tài khoản lúc này.' });
  }
});

// 8. Facilities Directory & AED Stations
routes.get('/facilities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facilities = await dataRepository.getFacilities();
    res.json({ facilities });
  } catch (err) {
    next(err);
  }
});

// 9. Aggregates & Analytics
routes.get('/aggregates/daily', authenticateRequired, requireRole(['platform_admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarioId = req.query.scenarioId as string | undefined;
    const list = await dataRepository.getDailyAggregates(scenarioId);
    res.json({ aggregates: list });
  } catch (err) {
    next(err);
  }
});

routes.get('/analytics/funnel', authenticateRequired, requireRole(['platform_admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarioId = req.query.scenarioId as string | undefined;
    const funnel = await dataRepository.getDelayFunnel(scenarioId);
    res.json({ funnel });
  } catch (err) {
    next(err);
  }
});

// 10. Volunteer Application APIs
const VolunteerApplySchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  province: z.string().min(2),
  district: z.string().min(2),
  skills: z.array(z.string()).min(1),
  cprTrained: z.boolean(),
  certificationOrg: z.string().optional(),
  certificateNumber: z.string().optional(),
  availability: z.enum(['evening_weekend', 'working_hours', 'flexible_anytime', 'on_call_emergency']).default('evening_weekend'),
  preferredRadiusKm: z.number().min(1).max(20).default(3),
  safetyConsent: z.boolean(),
  privacyConsent: z.boolean(),
});

routes.post('/volunteer/apply', authenticateRequired, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = VolunteerApplySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'INVALID_INPUT', errors: parsed.error.issues });
    }

    const user = req.user!;
    const body = parsed.data;

    if (!body.safetyConsent || !body.privacyConsent) {
      return res.status(400).json({ code: 'CONSENT_REQUIRED', message: 'Bạn cần đồng ý với quy tắc an toàn và điều khoản xử lý dữ liệu.' });
    }

    const rawPhone = body.phone || '';
    const phoneMasked = rawPhone.length > 6
      ? `${rawPhone.slice(0, 3)}***${rawPhone.slice(-4)}`
      : user.phoneMasked || 'Chưa cung cấp';

    const application = await dataRepository.createVolunteerApplication({
      userId: user.uid,
      displayName: body.displayName.trim(),
      email: body.email || '',
      phone: rawPhone,
      phoneMasked,
      province: body.province,
      district: body.district.trim(),
      skills: body.skills,
      cprTrained: body.cprTrained,
      certificationOrg: body.certificationOrg?.trim(),
      certificateNumber: body.certificateNumber?.trim(),
      availability: body.availability,
      preferredRadiusKm: body.preferredRadiusKm,
      safetyConsent: true,
      privacyConsent: true,
    });

    await dataRepository.logAudit({
      actorUid: user.uid,
      actorRole: user.role,
      action: 'VOLUNTEER_APPLICATION_SUBMIT',
      targetResource: `volunteerApplications/${application.id}`,
      details: { province: body.province, district: body.district, skillsCount: body.skills.length },
      ipAddressMasked: 'not_collected',
    });

    res.status(201).json({ success: true, application });
  } catch (err) {
    next(err);
  }
});

routes.get('/volunteer/my-application', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const application = await dataRepository.getVolunteerApplicationByUserId(user.uid);
  res.json({ application });
});

routes.patch('/volunteer/my-application/status', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { action } = req.body;

  if (!['pause', 'resume', 'withdraw'].includes(action)) {
    return res.status(400).json({ code: 'INVALID_ACTION', message: 'Hành động không hợp lệ.' });
  }

  const updated = await dataRepository.updateVolunteerStatusByUser(user.uid, action);
  if (!updated) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Hồ sơ tình nguyện viên không tồn tại.' });
  }

  await dataRepository.logAudit({
    actorUid: user.uid,
    actorRole: user.role,
    action: `VOLUNTEER_STATUS_${action.toUpperCase()}`,
    targetResource: `volunteerApplications/${updated.id}`,
    details: { newStatus: updated.status },
    ipAddressMasked: 'not_collected',
  });

  res.json({ success: true, application: updated });
});

// 11. Reviewer / Admin Volunteer Queue
routes.get(
  '/volunteer/admin/applications',
  authenticateRequired,
  requireRole(['platform_admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    const { status, province, cprTrained, search } = req.query;

    const list = await dataRepository.listVolunteerApplications({
      status: status as string,
      province: province as string,
      cprTrained: cprTrained !== undefined ? cprTrained === 'true' : undefined,
      search: search as string,
    });

    res.json({ applications: list });
  }
);

routes.post(
  '/volunteer/admin/applications/:id/review',
  authenticateRequired,
  requireRole(['platform_admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, reviewNote } = req.body;
    const user = req.user!;

    if (!['verified', 'rejected', 'suspended', 'pending_review'].includes(status)) {
      return res.status(400).json({ code: 'INVALID_STATUS', message: 'Trạng thái thẩm định không hợp lệ.' });
    }

    const updated = await dataRepository.reviewVolunteerApplication(
      id,
      user.uid,
      user.displayName || 'Thẩm định viên Y tế',
      status,
      reviewNote || ''
    );

    if (!updated) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ tình nguyện viên.' });
    }

    await dataRepository.logAudit({
      actorUid: user.uid,
      actorRole: user.role,
      action: 'VOLUNTEER_APPLICATION_REVIEW',
      targetResource: `volunteerApplications/${updated.id}`,
      details: {
        newStatus: status,
        reviewerId: user.uid,
        reviewNote,
      },
      ipAddressMasked: 'not_collected',
    });

    res.json({ success: true, application: updated });
  }
);

// 12. Privacy & Data Deletion (Decree 13 / GDPR)
routes.post('/privacy/delete-request', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { reason } = req.body;

  const delReq = await dataRepository.createDeletionRequest({
    uid: user.uid,
    phoneMasked: user.phoneMasked,
    status: 'pending',
    reason: reason || 'Yêu cầu xóa toàn bộ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP',
  });

  await dataRepository.logAudit({
    actorUid: user.uid,
    actorRole: user.role,
    action: 'DELETION_REQUEST_SUBMIT',
    targetResource: `deletionRequests/${delReq.id}`,
    details: { status: 'pending' },
    ipAddressMasked: 'not_collected',
  });

  res.json({ success: true, request: delReq });
});

// 13. Audit Trail for Compliance
routes.get(
  '/admin/audit-logs',
  authenticateRequired,
  requireRole(['platform_admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    const logs = await dataRepository.getAuditLogs();
    res.json({ logs });
  }
);

// 14. AI Smart Assistance Services (Gemini) with Rate Limiting & Timeout Guards
const withAiTimeout = <T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI_TIMEOUT: Thời gian xử lý của Gemini vượt quá 15 giây.')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

routes.post('/ai/extract-facts', async (req: Request, res: Response) => {
  const clientKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_anon';
  if (!checkAiRateLimit(clientKey, 30)) {
    return res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Bạn đã thực hiện quá nhiều yêu cầu phân tích AI trong 1 phút. Vui lòng thử lại sau giây lát.',
      requestId: req.headers['x-request-id'] || 'req_ratelimit',
    });
  }

  const parsed = FactExtractionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'Dữ liệu văn bản phân tích không hợp lệ.',
      errors: parsed.error.issues,
      requestId: req.headers['x-request-id'] || 'req_invalid',
    });
  }

  try {
    const facts = await withAiTimeout(extractEmergencyFacts(parsed.data));
    res.json({ facts, requestId: req.headers['x-request-id'] });
  } catch (err: any) {
    console.warn('Fact Extraction Fallback Note:', err?.message || err);
    res.status(500).json({
      code: 'AI_SERVICE_ERROR',
      message: 'Lỗi trích xuất sự kiện từ AI. Vui lòng sử dụng biểu mẫu thủ công.',
      requestId: req.headers['x-request-id'] || 'req_ai_err',
    });
  }
});

routes.post('/ai/transcribe-audio', async (req: Request, res: Response) => {
  const clientKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_anon';
  if (!checkAiRateLimit(clientKey, 20)) {
    return res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Vượt quá hạn mức gửi file âm thanh trong 1 phút. Vui lòng chờ giây lát.',
      requestId: req.headers['x-request-id'] || 'req_ratelimit',
    });
  }

  const parsed = AudioTranscribeInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'Dữ liệu âm thanh không đúng định dạng base64.',
      errors: parsed.error.issues,
      requestId: req.headers['x-request-id'] || 'req_invalid',
    });
  }

  try {
    const result = await withAiTimeout(transcribeAndExtractFromAudio(parsed.data));
    res.json({ ...result, requestId: req.headers['x-request-id'] });
  } catch (err: any) {
    console.warn('Audio Transcription Fallback Note:', err?.message || err);
    res.status(500).json({
      code: 'AI_SERVICE_ERROR',
      message: 'Không thể nhận diện giọng nói lúc này. Vui lòng nhập bằng văn bản.',
      requestId: req.headers['x-request-id'] || 'req_ai_err',
    });
  }
});

routes.post('/ai/extract-visual-facts', async (req: Request, res: Response) => {
  const clientKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_anon';
  if (!checkAiRateLimit(clientKey, 15)) {
    return res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Vượt quá hạn mức gửi ảnh trong 1 phút. Vui lòng chờ giây lát.',
      requestId: req.headers['x-request-id'] || 'req_ratelimit',
    });
  }

  const parsed = VisualFactExtractionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'Dữ liệu hình ảnh luyện tập không hợp lệ.',
      errors: parsed.error.issues,
      requestId: req.headers['x-request-id'] || 'req_invalid',
    });
  }

  try {
    const result = await withAiTimeout(extractVisualPracticeFacts(parsed.data));
    res.json({ facts: result, requestId: req.headers['x-request-id'] });
  } catch (err: any) {
    console.warn('Visual Fact Extraction Fallback Note:', err?.message || err);
    res.status(500).json({
      code: 'AI_SERVICE_ERROR',
      message: 'Không thể phân tích hình ảnh luyện tập lúc này.',
      requestId: req.headers['x-request-id'] || 'req_ai_err',
    });
  }
});

routes.post('/ai/insights', async (req: Request, res: Response) => {
  const clientKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_anon';
  if (!checkAiRateLimit(clientKey, 15)) {
    return res.status(429).json({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Vượt quá hạn mức yêu cầu nhận định AI.',
      requestId: req.headers['x-request-id'] || 'req_ratelimit',
    });
  }

  const parsed = InsightInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      message: 'Dữ liệu tổng hợp không hợp lệ.',
      errors: parsed.error.issues,
      requestId: req.headers['x-request-id'] || 'req_invalid',
    });
  }

  try {
    const insight = await withAiTimeout(generateAnalyticsInsight(parsed.data));
    res.json({ insight, requestId: req.headers['x-request-id'] });
  } catch (err: any) {
    console.warn('Analytics Insight Fallback Note:', err?.message || err);
    res.status(500).json({
      code: 'AI_SERVICE_ERROR',
      message: 'Lỗi sinh nhận định AI.',
      requestId: req.headers['x-request-id'] || 'req_ai_err',
    });
  }
});

// 15. Verified Emergency Resources & Submissions (Safe / Nearby)
routes.get('/resources/emergency', async (req: Request, res: Response) => {
  const includeUnverifiedOsm = req.query.include_osm === 'true';
  // NEVER return synthetic_seed or rejected resources to public / nearby
  const resources = await dataRepository.listEmergencyResources({
    onlyVerified: !includeUnverifiedOsm,
    excludeSynthetic: true,
  });
  res.json({ resources });
});

const SubmitResourceSchema = z.object({
  resourceType: z.enum(['aed', 'first_aid_kit', 'emergency_cabinet', 'bleeding_control_kit']),
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  evidenceUrl: z.string().max(1000).optional(),
  managingOrgName: z.string().max(200).optional(),
});

routes.post('/resources/submissions', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = SubmitResourceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_SUBMISSION', errors: parsed.error.issues });
  }
  const submission = await dataRepository.createResourceSubmission({
    ...parsed.data,
    submittedBy: req.authUid,
  });
  await dataRepository.logAudit({
    actorUid: req.authUid!,
    actorRole: req.user ? req.user.role : 'citizen',
    action: 'RESOURCE_SUBMISSION_CREATE',
    targetResource: `resourceSubmissions/${submission.id}`,
    details: { resourceType: submission.resourceType, name: submission.name },
    ipAddressMasked: 'not_collected',
  });
  res.status(201).json({ success: true, submission });
});

routes.get('/admin/resources/submissions', authenticateRequired, requireRole(['platform_admin', 'org_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query;
  const submissions = await dataRepository.listResourceSubmissions({ status: status as string });
  res.json({ submissions });
});

routes.post('/admin/resources/submissions/:id/review', authenticateRequired, requireRole(['platform_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ code: 'INVALID_STATUS', message: 'Trạng thái xét duyệt không hợp lệ.' });
  }
  const reviewed = await dataRepository.reviewResourceSubmission(id, req.authUid!, status, rejectionReason);
  if (!reviewed) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy hồ sơ đề xuất.' });
  }
  await dataRepository.logAudit({
    actorUid: req.authUid!,
    actorRole: 'platform_admin',
    action: 'RESOURCE_SUBMISSION_REVIEW',
    targetResource: `resourceSubmissions/${id}`,
    details: { status, rejectionReason: rejectionReason || null },
    ipAddressMasked: 'not_collected',
  });
  res.json({ success: true, submission: reviewed });
});

// 16. Digital Proofs (Cryptographically Signed Immutable Evidence)
const CreateProofSchema = z.object({
  incidentId: z.string().min(1),
  summary: z.record(z.string(), z.any()),
  consentSnapshot: z.record(z.string(), z.any()),
});

routes.post('/proofs', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = CreateProofSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_INPUT', errors: parsed.error.issues });
  }
  const payloadString = JSON.stringify({
    incidentId: parsed.data.incidentId,
    userId: req.authUid,
    summary: parsed.data.summary,
    consent: parsed.data.consentSnapshot,
  });
  const payloadHash = createHash('sha256').update(payloadString).digest('hex');

  const proof = await dataRepository.createDigitalProof({
    incidentId: parsed.data.incidentId,
    userId: req.authUid!,
    summary: parsed.data.summary,
    payloadHash,
    consentSnapshot: parsed.data.consentSnapshot,
  });

  await dataRepository.logAudit({
    actorUid: req.authUid!,
    actorRole: req.user ? req.user.role : 'citizen',
    action: 'CREATE_DIGITAL_PROOF',
    targetResource: `digitalProofs/${payloadHash}`,
    details: { incidentId: proof.incidentId, payloadHash },
    ipAddressMasked: 'not_collected',
  });

  res.status(201).json({ success: true, proof });
});

routes.get('/proofs/:hash', async (req: Request, res: Response) => {
  const { hash } = req.params;
  const proof = await dataRepository.getDigitalProofByHash(hash);
  if (!proof) {
    return res.status(404).json({ code: 'PROOF_NOT_FOUND', message: 'Chứng chỉ số không tồn tại hoặc mã băm không đúng.' });
  }
  res.json({ proof });
});

// 17. Regional ADI Metrics & Interventions
routes.get('/analytics/regional-adi', async (req: Request, res: Response) => {
  const metrics = await dataRepository.getRegionalAdiMetrics();
  res.json({ regions: metrics });
});

routes.get('/analytics/interventions', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const { orgId } = req.query;
  if (typeof orgId !== 'string' || !orgId) return res.status(400).json({ code: 'ORG_REQUIRED' });
  if (req.user?.role !== 'platform_admin') {
    if (!supabaseAdmin) return res.status(503).json({ code: 'STORAGE_UNAVAILABLE' });
    const { data: membership } = await supabaseAdmin.from('organization_members')
      .select('role').eq('organization_id', orgId).eq('user_id', req.authUid!).maybeSingle();
    if (!membership) return res.status(403).json({ code: 'FORBIDDEN' });
  }
  const interventions = await dataRepository.listInterventions(orgId as string);
  res.json({ interventions });
});

routes.post('/analytics/interventions', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  const { organizationId, type, title } = req.body ?? {};
  if (typeof organizationId !== 'string' || !organizationId || typeof title !== 'string' || !title.trim() ||
      !['cpr_training', 'aed_verification', 'process_change', 'community_campaign'].includes(type)) {
    return res.status(400).json({ code: 'INVALID_INTERVENTION' });
  }
  if (req.user?.role !== 'platform_admin') {
    if (!supabaseAdmin) return res.status(503).json({ code: 'STORAGE_UNAVAILABLE' });
    const { data: membership } = await supabaseAdmin.from('organization_members')
      .select('role').eq('organization_id', organizationId).eq('user_id', req.authUid!).maybeSingle();
    if (!membership || !['owner', 'admin', 'site_manager'].includes(membership.role)) return res.status(403).json({ code: 'FORBIDDEN' });
  }
  const intervention = await dataRepository.createIntervention(req.body);
  await dataRepository.logAudit({
    actorUid: req.authUid!,
    actorRole: req.user?.role || 'org_admin',
    action: 'INTERVENTION_CREATE',
    targetResource: `interventions/${intervention.id}`,
    details: { type: intervention.type, title: intervention.title },
    ipAddressMasked: 'not_collected',
  });
  res.status(201).json({ success: true, intervention });
});

// Remote video support: private, short-lived rooms are created only after an
// authorized responder accepts a request. Emergency callers are still directed
// to 115 first; Daily credentials never leave the server.
const dailyRequest = async (path: string, body: Record<string, unknown>) => {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error('VIDEO_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(`https://api.daily.co/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('VIDEO_PROVIDER_REQUEST_FAILED');
  return payload as Record<string, any>;
};
const makeDailyToken = async (roomName: string, userName: string, isOwner: boolean) => {
  const expires = Math.floor(Date.now() / 1000) + 30 * 60;
  const result = await dailyRequest('/meeting-tokens', { properties: {
    room_name: roomName, user_name: userName.slice(0, 80), is_owner: isOwner,
    exp: expires, eject_at_token_exp: true, enable_recording: false,
  } });
  return result.token as string;
};

routes.get('/remote-assistance/queue', authenticateRequired, requireRole(['clinical_reviewer', 'volunteer', 'platform_admin']), async (_req: AuthenticatedRequest, res: Response) => {
  if (!supabaseAdmin) return res.status(503).json({ code: 'STORAGE_UNAVAILABLE' });
  const { data, error } = await supabaseAdmin.from('remote_assistance_requests')
    .select('id,emergency_type,status,latitude,longitude,location_shared,created_at')
    .in('status', ['queued', 'accepted', 'in_progress']).order('created_at', { ascending: true }).limit(50);
  if (error) return res.status(503).json({ code: 'QUEUE_UNAVAILABLE' });
  res.json({ requests: data ?? [] });
});

routes.post('/remote-assistance/:id/accept', authenticateRequired, requireRole(['clinical_reviewer', 'volunteer', 'platform_admin']), async (req: AuthenticatedRequest, res: Response) => {
  if (!supabaseAdmin) return res.status(503).json({ code: 'STORAGE_UNAVAILABLE' });
  const { data: incident, error: readError } = await supabaseAdmin.from('remote_assistance_requests')
    .select('id,status,called_115').eq('id', req.params.id).maybeSingle();
  if (readError || !incident) return res.status(404).json({ code: 'REQUEST_NOT_FOUND' });
  if (incident.status !== 'queued' || incident.called_115 !== true) return res.status(409).json({ code: 'REQUEST_UNAVAILABLE' });
  const roomName = `gm-${randomUUID().replace(/-/g, '')}`;
  let room: Record<string, any>;
  let token: string;
  try {
    room = await dailyRequest('/rooms', { name: roomName, privacy: 'private', properties: {
      exp: Math.floor(Date.now() / 1000) + 30 * 60, max_participants: 2,
      enable_prejoin_ui: true, enable_knocking: false, enable_chat: false,
      enable_screenshare: false, enable_recording: false,
    } });
    token = await makeDailyToken(roomName, req.user?.displayName || 'Người hướng dẫn', true);
  } catch (error) {
    const code = error instanceof Error && error.message === 'VIDEO_PROVIDER_NOT_CONFIGURED' ? 'VIDEO_PROVIDER_NOT_CONFIGURED' : 'VIDEO_ROOM_CREATE_FAILED';
    return res.status(503).json({ code, message: code === 'VIDEO_PROVIDER_NOT_CONFIGURED' ? 'Chưa cấu hình dịch vụ video.' : 'Chưa tạo được phòng video. Vui lòng thử lại.' });
  }
  const { data: updated, error: updateError } = await supabaseAdmin.from('remote_assistance_requests').update({
    status: 'accepted', responder_id: req.authUid, room_url: room.url, updated_at: new Date().toISOString(),
  }).eq('id', req.params.id).eq('status', 'queued').select('id').maybeSingle();
  if (updateError || !updated) {
    await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } }).catch(() => undefined);
    return res.status(409).json({ code: 'REQUEST_UNAVAILABLE' });
  }
  res.json({ roomUrl: room.url, token });
});

routes.post('/remote-assistance/:id/join', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (!supabaseAdmin) return res.status(503).json({ code: 'STORAGE_UNAVAILABLE' });
  const { data: incident } = await supabaseAdmin.from('remote_assistance_requests')
    .select('id,status,requester_id,responder_id,room_url').eq('id', req.params.id).maybeSingle();
  if (!incident || !['accepted', 'in_progress'].includes(incident.status) || !incident.room_url) return res.status(404).json({ code: 'ROOM_NOT_AVAILABLE' });
  const isResponder = incident.responder_id === req.authUid;
  if (incident.requester_id !== req.authUid && !isResponder) return res.status(403).json({ code: 'FORBIDDEN' });
  const roomName = new URL(incident.room_url).pathname.split('/').filter(Boolean).at(-1);
  if (!roomName || !/^gm-[a-f0-9]{32}$/.test(roomName)) return res.status(409).json({ code: 'ROOM_INVALID' });
  try {
    const token = await makeDailyToken(roomName, req.user?.displayName || (isResponder ? 'Người hướng dẫn' : 'Người cần hỗ trợ'), isResponder);
    res.json({ roomUrl: incident.room_url, token });
  } catch {
    res.status(503).json({ code: 'VIDEO_PROVIDER_UNAVAILABLE' });
  }
});

routes.post('/remote-assistance/:id/complete', authenticateRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (!supabaseAdmin) return res.status(503).json({ code: 'STORAGE_UNAVAILABLE' });
  const { data, error } = await supabaseAdmin.from('remote_assistance_requests').update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', req.params.id).eq('responder_id', req.authUid).in('status', ['accepted', 'in_progress']).select('id').maybeSingle();
  if (error || !data) return res.status(403).json({ code: 'FORBIDDEN' });
  res.json({ success: true });
});

// 18. Pilot Surveys (Pre/Post with Likert 1-5 & SUS)
const PilotSurveyInputSchema = z.object({
  sessionId: z.string().min(1),
  deviceHash: z.string().min(8).max(64),
  surveyType: z.enum(['pre', 'post']),
  scenarioId: z.string().min(1),
  confidenceScore: z.number().int().min(1).max(5),
  preparednessScore: z.number().int().min(1).max(5),
  anxietyScore: z.number().int().min(1).max(5),
  susScores: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
  susFinalScore: z.number().min(0).max(100).optional(),
  consent: z.boolean().default(true),
});

routes.post('/surveys/pilot', async (req: Request, res: Response) => {
  const parsed = PilotSurveyInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_SURVEY', errors: parsed.error.issues });
  }
  const record = await dataRepository.savePilotSurvey(parsed.data);
  res.status(201).json({ success: true, survey: record });
});

routes.get('/admin/surveys/pilot', authenticateRequired, requireRole(['platform_admin']), async (req: AuthenticatedRequest, res: Response) => {
  const surveys = await dataRepository.listPilotSurveys();
  res.json({ surveys });
});
