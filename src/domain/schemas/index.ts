import { z } from 'zod';

// ==========================================
// User & Auth Types
// ==========================================
export type UserRole = 'guest' | 'citizen' | 'volunteer' | 'org_viewer' | 'org_admin' | 'clinical_reviewer' | 'platform_admin';

export type AuthStatus =
  | 'initializing'
  | 'guest'
  | 'authenticated_synced'
  | 'authenticated_offline'
  | 'authentication_error';

export const UserConsentSchema = z.object({
  consentId: z.string(),
  policyVersion: z.string(),
  purpose: z.enum(['account', 'training_analytics', 'location']),
  granted: z.boolean(),
  createdAt: z.string(),
  withdrawnAt: z.string().optional(),
});
export type UserConsent = z.infer<typeof UserConsentSchema>;

export const UserProfileSchema = z.object({
  uid: z.string(),
  displayName: z.string().min(1).max(100),
  email: z.string().optional(),
  photoURL: z.string().optional(),
  phoneMasked: z.string().optional(),
  provinceCode: z.string().optional(),
  provinceName: z.string().optional(),
  role: z.enum(['guest', 'citizen', 'volunteer', 'org_viewer', 'org_admin', 'clinical_reviewer', 'platform_admin']).default('citizen'),
  orgId: z.string().optional(),
  preferredLanguage: z.enum(['vi', 'en']).default('vi'),
  onboardingCompleted: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletionRequestedAt: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ==========================================
// Scenario & Content Types
// ==========================================
export type ScenarioStatus = 'draft' | 'pending_review' | 'reference_only' | 'approved' | 'retired';

export interface GuidanceStep {
  stepNumber: number;
  title: string;
  instruction: string;
  alertText?: string;
  visualCue?: 'chest_compression' | 'head_tilt' | 'fast_face' | 'pressure_wound' | 'recovery_position' | 'call_115';
  metronomeBpm?: number;
  durationSeconds?: number;
  vitalAction?: boolean;
}

export interface ScenarioQuestionChoice {
  id: string;
  label: string;
  nextStepId?: string;
  isRecommended?: boolean;
  explanation?: string;
}

export interface ScenarioQuestion {
  id: string;
  prompt: string;
  factKey?: string;
  choices: ScenarioQuestionChoice[];
}

export interface ScenarioThresholds {
  timeToGuidanceSec: number; // Target seconds to open guidance
  timeToCallSec: number;     // Target seconds to trigger 115 call
  timeToActionSec: number;   // Target seconds to begin primary action
  mroThresholdSec: number;   // Avoidable Delay Index threshold to flag MRO
}

export interface ScenarioVersion {
  versionId: string;
  scenarioId: string;
  versionNumber: number;
  status: ScenarioStatus;
  title: string;
  subtitle: string;
  targetCategory: 'cardiac_arrest' | 'stroke' | 'severe_bleeding' | 'choking' | 'respiratory';
  initialAssessment: string;
  questions: ScenarioQuestion[];
  guidanceSteps: GuidanceStep[];
  thresholds: ScenarioThresholds;
  citations: string[];
  medicalDisclaimer: string;
  reviewedBy?: string;
  reviewedAt?: string;
  changeNotes?: string;
  createdAt: string;
}

export interface Scenario {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'cardiac_arrest' | 'stroke' | 'severe_bleeding' | 'choking' | 'general';
  activeVersionId: string;
  versions: ScenarioVersion[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Training Session & Append-Only Events
// ==========================================
export type SessionMode = 'training' | 'simulation' | 'real_emergency_view';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type DataOrigin = 'training_user' | 'synthetic_seed' | 'pilot_verified';

export type EventType =
  | 'session_started'
  | 'question_viewed'
  | 'answer_selected'
  | 'guidance_opened'
  | 'call_115_tapped'
  | 'action_started'
  | 'step_completed'
  | 'metronome_started'
  | 'confidence_rated'
  | 'session_completed'
  | 'feedback_submitted'
  | 'sync_replayed';

export interface SessionEvent {
  clientEventId: string;
  sessionId: string;
  type: EventType;
  occurredAtClient: string; // ISO 8601
  receivedAtServer?: string; // ISO 8601
  elapsedMs: number;
  payloadSafe: Record<string, string | number | boolean | null>;
  source: 'client' | 'server';
  schemaVersion: string;
}

export interface TrainingSession {
  sessionId: string;
  clientSessionId: string;
  ownerUid?: string;
  scenarioId: string;
  scenarioVersionId: string;
  scenarioTitle: string;
  mode: SessionMode;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  durationSec?: number;
  
  // Computed Metrics
  timeToGuidanceSec?: number | null;
  timeToCallSec?: number | null;
  timeToActionSec?: number | null;
  adiSec?: number | null; // Avoidable Delay Index in seconds
  mroFlag?: boolean;      // Missed Rescue Opportunity flag
  readinessScore?: number;// 0 - 100
  
  confidenceBefore?: number; // 1 - 5
  confidenceAfter?: number;  // 1 - 5
  confidenceDelta?: number;  // after - before
  
  regionCell?: string;       // Anonymized ~200m geohash or district code
  dataOrigin: DataOrigin;
  consentVersion?: string;
  
  events: SessionEvent[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Metrics & Aggregations
// ==========================================
export interface DailyAggregate {
  aggregateId: string;
  date: string; // YYYY-MM-DD
  orgId?: string;
  regionCell?: string;
  regionName?: string;
  scenarioId?: string;
  dataOrigin: DataOrigin;
  sessionCount: number;
  completionCount: number;
  completionRate: number;
  medianTimeToGuidanceSec: number;
  medianTimeToCallSec: number;
  medianTimeToActionSec: number;
  medianAdiSec: number;
  mroCount: number;
  mroRate: number; // mroCount / completed sessions
  avgReadinessScore: number;
  confidenceDeltaAvg: number;
  sampleSize: number;
  computedAt: string;
  schemaVersion: string;
}

export interface DelayFunnelStep {
  stepKey: 'open_app' | 'recognize_symptoms' | 'call_115' | 'start_guidance' | 'first_compression_or_action';
  stepLabel: string;
  medianTimeSec: number;
  standardTargetSec: number;
  avoidableDelaySec: number;
  bottleneckRate: number; // percentage of sessions with delay > standard
}

// ==========================================
// Geo & Community Responder Types
// ==========================================
export interface CommunityFacility {
  id: string;
  name: string;
  type: 'aed' | 'hospital' | 'emergency_station' | 'clinic';
  address: string;
  province: string;
  district: string;
  lat: number;
  lng: number;
  regionCell: string;
  isPublicAccess: boolean;
  operatingHours: string;
  sourceUrl?: string;
  verifiedAt?: string;
  status: 'verified' | 'synthetic_simulation';
  disclaimer: string;
}

export interface ResponderSimulation {
  id: string;
  callSign: string;
  distanceMeters: number;
  etaSeconds: number;
  status: 'available' | 'en_route' | 'arrived';
  certifiedSkills: string[];
  simulationNote: string;
}

// ==========================================
// AI Input/Output Schemas
// ==========================================
export const FactExtractionInputSchema = z.object({
  text: z.string().min(2).max(1000),
  scenarioContextHint: z.string().optional(),
});
export type FactExtractionInput = z.infer<typeof FactExtractionInputSchema>;

export const FactExtractionOutputSchema = z.object({
  consciousness: z.enum(['responsive', 'unresponsive', 'unknown']),
  breathing: z.enum(['normal', 'abnormal', 'not_breathing', 'unknown']),
  severeBleeding: z.boolean().nullable(),
  strokeFace: z.boolean().nullable(),
  strokeArm: z.boolean().nullable(),
  strokeSpeech: z.boolean().nullable(),
  choking: z.boolean().nullable(),
  extractedEvidence: z.array(z.string()),
  missingFacts: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  recommendedEmergencyPrompt: z.string(),
});
export type FactExtractionOutput = z.infer<typeof FactExtractionOutputSchema>;

// Audio Transcription Schema
export const AudioTranscribeInputSchema = z.object({
  audioBase64: z.string().min(10), // Base64 audio stream data
  mimeType: z.string().default('audio/webm'),
  durationSec: z.number().max(30).optional(),
  scenarioContextHint: z.string().optional(),
});
export type AudioTranscribeInput = z.infer<typeof AudioTranscribeInputSchema>;

export const AudioTranscribeOutputSchema = z.object({
  transcript: z.string(),
  facts: FactExtractionOutputSchema,
  transcribedBy: z.enum(['gemini_server', 'fallback_local']),
});
export type AudioTranscribeOutput = z.infer<typeof AudioTranscribeOutputSchema>;

// Visual Fact Extraction Schema (Strict bounded practice feedback)
export const VisualFactExtractionInputSchema = z.object({
  imageBase64: z.string().min(50),
  mimeType: z.string().default('image/jpeg'),
  scenarioId: z.string().optional(),
  stepContext: z.string().optional(),
});
export type VisualFactExtractionInput = z.infer<typeof VisualFactExtractionInputSchema>;

export const VisualFactExtractionOutputSchema = z.object({
  postureAssessment: z.enum(['good', 'needs_adjustment', 'unclear']),
  handPlacement: z.string(),
  armAngle: z.string(),
  environmentSafety: z.string(),
  observations: z.array(z.string()),
  correctiveTips: z.array(z.string()),
  simulatedFactsExtracted: z.object({
    consciousness: z.enum(['responsive', 'unresponsive', 'unknown']).optional(),
    breathing: z.enum(['normal', 'abnormal', 'not_breathing', 'unknown']).optional(),
    severeBleeding: z.boolean().nullable().optional(),
  }).optional(),
  safetyDisclaimer: z.string(),
});
export type VisualFactExtractionOutput = z.infer<typeof VisualFactExtractionOutputSchema>;

export const InsightInputSchema = z.object({
  dataOrigin: z.enum(['training_user', 'synthetic_seed', 'pilot_verified']),
  timeRangeDays: z.number().default(30),
  scenarioId: z.string().optional(),
  metricsSnapshot: z.object({
    totalSessions: z.number(),
    completedSessions: z.number(),
    medianTimeToGuidanceSec: z.number(),
    medianTimeToCallSec: z.number(),
    medianAdiSec: z.number(),
    mroRate: z.number(),
    avgReadinessScore: z.number(),
    confidenceDeltaAvg: z.number(),
    largestDelayStep: z.string(),
  }),
});
export type InsightInput = z.infer<typeof InsightInputSchema>;

export const InsightOutputSchema = z.object({
  summary: z.string(),
  observations: z.array(
    z.object({
      claim: z.string(),
      metricKeys: z.array(z.string()),
      impactLevel: z.enum(['high', 'medium', 'low']),
    })
  ),
  recommendedTrainingAction: z.string(),
  limitations: z.array(z.string()),
  dataProvenanceNote: z.string(),
});
export type InsightOutput = z.infer<typeof InsightOutputSchema>;

// ==========================================
// Audit & Compliance Types
// ==========================================
export interface AuditLog {
  id: string;
  actorUid: string;
  actorRole: UserRole;
  action: string;
  targetResource: string;
  details: Record<string, unknown>;
  ipAddressMasked: string;
  timestamp: string;
}

export interface DeletionRequest {
  id: string;
  uid: string;
  phoneMasked: string;
  reason?: string;
  status: 'pending' | 'processing' | 'completed';
  requestedAt: string;
  completedAt?: string;
}

// ==========================================
// Phase D: Volunteer / Responder Schemas
// ==========================================
export type VolunteerStatus = 'pending_review' | 'verified' | 'rejected' | 'suspended' | 'withdrawn';

export interface VolunteerStatusHistoryEntry {
  status: VolunteerStatus;
  timestamp: string;
  note?: string;
  actorRole: string;
}

export const VolunteerApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string().min(2, 'Tên hiển thị ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  phoneMasked: z.string(),
  province: z.string().min(1, 'Vui lòng chọn Tỉnh/Thành phố'),
  district: z.string().min(1, 'Vui lòng chọn Quận/Huyện'),
  skills: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất 1 kỹ năng'),
  cprTrained: z.boolean(),
  certificationOrg: z.string().optional().default(''),
  certificateNumber: z.string().optional().default(''),
  availability: z.enum(['evening_weekend', 'working_hours', 'flexible_anytime', 'on_call_emergency']),
  preferredRadiusKm: z.number().min(1).max(20).default(3),
  safetyConsent: z.boolean().refine((val) => val === true, {
    message: 'Bạn cần đồng ý với quy tắc an toàn và giới hạn sơ cấp cứu cộng đồng',
  }),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: 'Bạn cần đồng ý với điều khoản xử lý dữ liệu theo Nghị định 13/2023/NĐ-CP',
  }),
  status: z.enum(['pending_review', 'verified', 'rejected', 'suspended', 'withdrawn']),
  statusHistory: z.array(
    z.object({
      status: z.enum(['pending_review', 'verified', 'rejected', 'suspended', 'withdrawn']),
      timestamp: z.string(),
      note: z.string().optional(),
      actorRole: z.string(),
    })
  ),
  reviewNote: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VolunteerApplication = z.infer<typeof VolunteerApplicationSchema>;

export interface ResponderProfile {
  id: string;
  userId: string;
  displayName: string;
  province: string;
  district: string;
  status: VolunteerStatus;
  skills: string[];
  cprTrained: boolean;
  preferredRadiusKm: number;
  isVerifiedResponder: boolean;
  verifiedAt?: string;
  updatedAt: string;
}

// ==========================================
// Curated Learning Resource Types
// ==========================================
export type LearningResourceTopic =
  | 'scene_safety'
  | 'emergency_call'
  | 'cardiac_arrest'
  | 'aed_usage'
  | 'choking'
  | 'bleeding'
  | 'burns'
  | 'seizure'
  | 'stroke'
  | 'traffic_accident'
  | 'general';

export type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'needs_update';

export interface MedicalLearningResourceStep {
  stepNumber: number;
  title: string;
  detail: string;
  keyPoint?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
}

export interface LearningResourceQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MedicalLearningResource {
  id: string;
  title: string;
  slug: string;
  topic: LearningResourceTopic;
  description: string;
  learningObjectives: string[];
  mediaType: 'video' | 'article' | 'interactive_guide';
  sourceOrganization: string;
  sourcePageUrl: string;
  youtubeVideoId?: string;
  embedUrl?: string;
  thumbnailUrl: string;
  videoChannel?: string;
  language: 'vi' | 'en';
  durationSeconds: number;
  publishedAt?: string;
  reviewedAt: string;
  reviewedBy: string;
  reviewStatus: ReviewStatus;
  evidenceLevel: string;
  applicableAudience: string;
  emergencyWarning: string;
  steps: MedicalLearningResourceStep[];
  avoidActions: string[];
  dangerSigns115: string[];
  quiz?: LearningResourceQuizQuestion[];
  relatedScenarioIds: string[];
  copyrightStatus: string;
  embeddingAllowed: boolean;
  difficultyLevel: 'Cơ bản' | 'Nâng cao';
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  changeNote?: string;
}

// Backward compatibility alias for CuratedVideo
export interface CuratedVideo {
  id: string;
  title: string;
  description: string;
  scenario: LearningResourceTopic;
  sourceOrganization: string;
  sourceUrl: string;
  embedUrl: string;
  language: 'vi' | 'en';
  duration: string;
  thumbnailUrl: string;
  reviewedAt: string;
  reviewStatus: 'approved' | 'pending' | 'rejected';
  safetyNote: string;
}


