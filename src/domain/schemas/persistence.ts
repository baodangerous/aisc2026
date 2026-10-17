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
  sourceUrl: z.string().url().startsWith('https://'), verifiedAt: timestamp.optional(),
  status: z.enum(['verified', 'pending']), disclaimer: z.string().max(1000),
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

export const EmergencyResourceSchema = z.object({
  id: z.string().min(1),
  resourceType: z.enum(['aed', 'first_aid_kit', 'emergency_cabinet', 'bleeding_control_kit']),
  name: shortText,
  address: z.string().max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geohash7: shortText.optional(),
  siteId: z.string().uuid().optional().nullable(),
  managingOrgId: z.string().uuid().optional().nullable(),
  source: z.enum(['osm', 'admin', 'org_submission', 'synthetic']),
  origin: z.enum(['training_user', 'synthetic_seed', 'pilot_verified', 'osm_import']),
  verificationStatus: z.enum(['unverified', 'pending', 'verified', 'rejected', 'expired']),
  verifiedAt: timestamp.optional().nullable(),
  expiresAt: timestamp.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const ResourceSubmissionSchema = z.object({
  id: z.string().min(1),
  submittedBy: z.string().optional().nullable(),
  resourceType: z.enum(['aed', 'first_aid_kit', 'emergency_cabinet', 'bleeding_control_kit']),
  name: shortText,
  address: z.string().max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  evidenceUrl: z.string().max(1000).optional().nullable(),
  managingOrgName: shortText.optional().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: z.string().max(500).optional().nullable(),
  createdAt: timestamp,
});

export const DigitalProofSchema = z.object({
  id: z.string().min(1),
  incidentId: z.string().min(1),
  userId: z.string().min(1),
  summary: z.record(z.string(), z.any()),
  payloadHash: z.string().length(64),
  consentSnapshot: z.record(z.string(), z.any()),
  version: z.string().max(20),
  legalDisclaimer: z.string().max(500),
  createdAt: timestamp,
});

export const PilotSurveySchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  deviceHash: z.string().min(8).max(64),
  surveyType: z.enum(['pre', 'post']),
  scenarioId: z.string().min(1),
  confidenceScore: z.number().int().min(1).max(5),
  preparednessScore: z.number().int().min(1).max(5),
  anxietyScore: z.number().int().min(1).max(5),
  susScores: z.record(z.string(), z.number().int().min(1).max(5)).optional().nullable(),
  susFinalScore: z.number().min(0).max(100).optional().nullable(),
  consent: z.boolean(),
  createdAt: timestamp,
});

export const COLLECTION_MODELS = {
  users: { schema: UserProfileSchema, ownerField: 'uid', access: 'owner', source: 'verified_identity' },
  trainingSessions: { schema: TrainingSessionSchema, ownerField: 'ownerUid', access: 'owner', source: 'user_reported_training' },
  volunteerApplications: { schema: VolunteerApplicationSchema, ownerField: 'userId', access: 'owner_and_platform_admin', source: 'user_application' },
  auditLogs: { schema: AuditLogSchema, ownerField: 'actorUid', access: 'platform_admin', source: 'server_only' },
  deletionRequests: { schema: DeletionRequestSchema, ownerField: 'uid', access: 'owner_and_platform_admin', source: 'user_request' },
  aggregates: { schema: DailyAggregateSchema, ownerField: null, access: 'platform_admin', source: 'derived_training_only' },
  facilities: { schema: FacilitySchema, ownerField: null, access: 'public_verified_only', source: 'verified_directory' },
  emergencyResources: { schema: EmergencyResourceSchema, ownerField: null, access: 'public_verified_only', source: 'verified_directory' },
  resourceSubmissions: { schema: ResourceSubmissionSchema, ownerField: 'submittedBy', access: 'owner_and_platform_admin', source: 'crowdsourced' },
  digitalProofs: { schema: DigitalProofSchema, ownerField: 'userId', access: 'public_verify_hash', source: 'cryptographic_immutable' },
  pilotSurveys: { schema: PilotSurveySchema, ownerField: null, access: 'anon_survey', source: 'pilot_collection' },
} as const;

export function normalizeEvents(events: unknown[], sessionId: string) {
  const receivedAtServer = new Date().toISOString();
  return events.map((event) => ({ ...SessionEventSchema.parse(event), sessionId, source: 'client' as const, receivedAtServer }));
}
