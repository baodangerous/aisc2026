import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dataRepository, RepositoryError } from '../repository';
import { DocumentIdSchema, SessionEventSchema, normalizeEvents } from '../../src/domain/schemas/persistence';
import { adminAuth } from '../firebaseAdmin';
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

// Middleware to parse and verify Firebase ID token
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  firebaseUid?: string;
  firebaseClaims?: Record<string, any>;
}

export const authenticateOptional = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // Verify ID token with Firebase Admin SDK
      const decoded = await adminAuth.verifyIdToken(token, true);
      req.firebaseUid = decoded.uid;
      req.firebaseClaims = decoded;

      // Fetch or auto-provision user in repository
      let user = await dataRepository.getUser(decoded.uid);
      if (!user) {
        // Derive masked phone
        const rawPhone = decoded.phone_number || '';
        const phoneMasked = rawPhone.length > 6
          ? `${rawPhone.slice(0, 3)}***${rawPhone.slice(-4)}`
          : 'Chưa cung cấp';

        user = await dataRepository.upsertUser({
          uid: decoded.uid,
          displayName: decoded.name || 'Công dân Cứu sinh',
          phoneMasked,
          role: getEffectiveRoleFromClaims(decoded),
          preferredLanguage: 'vi',
        });
      }
      req.user = { ...user, role: getEffectiveRoleFromClaims(decoded) };
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
    if (!req.user || !req.firebaseUid) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu đăng nhập Firebase để truy cập tài nguyên này.',
        requestId: req.headers['x-request-id'] || 'req_anon',
      });
    }
    next();
  });
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Strictly verify Custom Claims inside the decoded Firebase token
    const effectiveRole = getEffectiveRoleFromClaims(req.firebaseClaims);

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này. Quyền này yêu cầu Firebase Custom Claims được cấp quyền bởi quản trị viên hệ thống.',
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

// 2. Firebase User Profile Synchronization (after Google Sign-In or profile edit)
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
  const uid = req.firebaseUid!;

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

// 5. Training Sessions: Create / Sync (Requires Firebase Auth; guest stores in local IndexedDB)
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
  const ownerUid = req.firebaseUid!;

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

  if (existing.ownerUid !== req.firebaseUid) {
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

  if (existing.ownerUid !== req.firebaseUid) {
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
  const uid = req.firebaseUid!;
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
    const isOwner = session.ownerUid === req.firebaseUid;
    const effectiveRole = getEffectiveRoleFromClaims(req.firebaseClaims);
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
  const uid = req.firebaseUid!;
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
