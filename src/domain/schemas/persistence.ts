import { z } from 'zod';
import { UserProfileSchema, VolunteerApplicationSchema } from './index';

export const DocumentIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const timestamp = z.string().datetime({ offset: true });
const shortText = z.string().max(200);
const seconds = z.number().finite().nonnegative();

// Only structured interaction metadata is persisted; no symptom text, media, or GPS.
const EventPayloadSchema = z.object({
  scenarioId: DocumentIdSchema.optional(), scenarioVersionId: DocumentIdSchema.optional(),
  questionId: DocumentIdSchema.optional(), choiceId: DocumentIdSchema.optional(),
  stepId: DocumentIdSchema.optional(), stepNumber: z.number().int().nonnegative().optional(),
  questionIndex: z.number().int().nonnegative().optional(),
  actionKey: shortText.optional(), posture: shortText.optional(),
  isRecommended: z.boolean().optional(), isDangerous: z.boolean().optional(),
  confidenceBefore: z.number().int().min(1).max(5).optional(),
  confidenceAfter: z.number().int().min(1).max(5).optional(),
  hasVoiceInput: z.boolean().optional(), hasCameraObservation: z.boolean().optional(),
  bpm: z.number().min(40).max(200).optional(),
});

export const SessionEventSchema = z.object({
  clientEventId: DocumentIdSchema,
  sessionId: DocumentIdSchema,
  type: z.enum(['session_started', 'question_viewed', 'answer_selected', 'guidance_opened',
    'call_115_tapped', 'action_started', 'step_completed', 'metronome_started',
    'confidence_rated', 'session_completed', 'feedback_submitted', 'sync_replayed']),
  occurredAtClient: timestamp,
  receivedAtServer: timestamp.optional(),
  elapsedMs: z.number().int().min(0).max(86_400_000),
  payloadSafe: EventPayloadSchema.default({}),
  source: z.enum(['client', 'server']),
  schemaVersion: z.string().max(20),
});

export const TrainingSessionSchema = z.object({
  sessionId: DocumentIdSchema, clientSessionId: DocumentIdSchema, ownerUid: z.string().min(1).max(128),
  scenarioId: DocumentIdSchema, scenarioVersionId: DocumentIdSchema, scenarioTitle: shortText,
  mode: z.enum(['training', 'simulation', 'real_emergency_view']),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  startedAt: timestamp, completedAt: timestamp.optional(), durationSec: seconds.optional(),
  timeToGuidanceSec: seconds.nullable().optional(), timeToCallSec: seconds.nullable().optional(),
  timeToActionSec: seconds.nullable().optional(), adiSec: seconds.nullable().optional(),
  mroFlag: z.boolean().optional(), readinessScore: z.number().min(0).max(100).optional(),
  confidenceBefore: z.number().int().min(1).max(5).optional(),
  confidenceAfter: z.number().int().min(1).max(5).optional(),
  confidenceDelta: z.number().min(-4).max(4).optional(),
  regionCell: shortText.optional(), dataOrigin: z.enum(['training_user', 'synthetic_seed', 'pilot_verified']),
  consentVersion: shortText.optional(), events: z.array(SessionEventSchema).max(512),
  createdAt: timestamp, updatedAt: timestamp,
});

export const FacilitySchema = z.object({
  id: DocumentIdSchema, name: shortText,
  type: z.enum(['aed', 'hospital', 'emergency_station', 'clinic']),
  address: z.string().max(500), province: shortText, district: shortText,
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
  regionCell: shortText, isPublicAccess: z.boolean(), operatingHours: shortText,
  sourceUrl: z.string().url().startsWith('https://'), verifiedAt: timestamp,
  status: z.literal('verified'), disclaimer: z.string().max(1000),
});

export const AuditLogSchema = z.object({
  id: DocumentIdSchema, actorUid: shortText, actorRole: UserProfileSchema.shape.role,
  action: shortText, targetResource: z.string().max(300),
  details: z.record(z.string().max(80), z.union([shortText, z.number().finite(), z.boolean(), z.null()])),
  ipAddressMasked: shortText, timestamp,
});

export const DeletionRequestSchema = z.object({
  id: DocumentIdSchema, uid: z.string().min(1).max(128), phoneMasked: shortText.default(''),
  reason: z.string().max(500).optional(), status: z.enum(['pending', 'processing', 'completed']),
  requestedAt: timestamp, completedAt: timestamp.optional(),
});

export const DailyAggregateSchema = z.object({
  aggregateId: DocumentIdSchema, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orgId: shortText.optional(), regionCell: shortText.optional(), regionName: shortText.optional(),
  scenarioId: DocumentIdSchema.optional(), dataOrigin: z.enum(['training_user', 'synthetic_seed', 'pilot_verified']),
  sessionCount: z.number().int().nonnegative(), completionCount: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(100), medianTimeToGuidanceSec: seconds,
  medianTimeToCallSec: seconds, medianTimeToActionSec: seconds, medianAdiSec: seconds,
  mroCount: z.number().int().nonnegative(), mroRate: z.number().min(0).max(100),
  avgReadinessScore: z.number().min(0).max(100), confidenceDeltaAvg: z.number().min(-4).max(4),
  sampleSize: z.number().int().nonnegative(), computedAt: timestamp, schemaVersion: shortText,
});

export const COLLECTION_MODELS = {
  users: { schema: UserProfileSchema, ownerField: 'uid', access: 'owner', source: 'verified_identity' },
  trainingSessions: { schema: TrainingSessionSchema, ownerField: 'ownerUid', access: 'owner', source: 'user_reported_training' },
  volunteerApplications: { schema: VolunteerApplicationSchema, ownerField: 'userId', access: 'owner_and_platform_admin', source: 'user_application' },
  auditLogs: { schema: AuditLogSchema, ownerField: 'actorUid', access: 'platform_admin', source: 'server_only' },
  deletionRequests: { schema: DeletionRequestSchema, ownerField: 'uid', access: 'owner_and_platform_admin', source: 'user_request' },
  aggregates: { schema: DailyAggregateSchema, ownerField: null, access: 'platform_admin', source: 'derived_training_only' },
  facilities: { schema: FacilitySchema, ownerField: null, access: 'public_verified_only', source: 'verified_directory' },
} as const;

export function normalizeEvents(events: unknown[], sessionId: string) {
  const receivedAtServer = new Date().toISOString();
  return events.map((event) => ({ ...SessionEventSchema.parse(event), sessionId, source: 'client' as const, receivedAtServer }));
}
