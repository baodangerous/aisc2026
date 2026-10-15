import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/app';
import { dataRepository, SupabaseRepository } from '../server/repository';
import { SessionEventSchema, FacilitySchema } from '../src/domain/schemas/persistence';
import { REFERENCE_LEARNING_RESOURCES } from '../src/content/curatedLearningCatalog';
import type { TrainingSession, UserProfile } from '../src/domain/schemas';

vi.mock('../server/supabaseAuth', () => ({
  supabaseAdmin: null,
  verifySupabaseAccessToken: vi.fn(async (token: string) => token === 'token' ? { id: 'owner_a', email: 'owner@test.com', user_metadata: { role: 'citizen' } } : null),
  isSupabaseAuthConfigured: () => false,
}));

afterEach(() => vi.restoreAllMocks());
const now = '2026-10-15T10:00:00.000Z';
const profile: UserProfile = { uid: 'owner_a', displayName: 'User', role: 'citizen', preferredLanguage: 'vi', onboardingCompleted: true, createdAt: now, updatedAt: now };
const event = { clientEventId: 'evt_1', sessionId: 'session_1', type: 'session_started', occurredAtClient: now, elapsedMs: 0, payloadSafe: {}, source: 'client', schemaVersion: '2.0.0' };
const payload = { sessionId: 'session_1', scenarioId: 'sc_ohca_01', scenarioTitle: 'CPR', events: [] };

describe('Release data boundaries', () => {
  it('refuses writes instead of acknowledging RAM-only persistence', async () => {
    const repository = new SupabaseRepository();
    await expect(repository.upsertUser(profile)).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE', status: 503 });
    expect(await repository.probe()).toEqual({ ok: false, database: 'unavailable' });
    expect(await repository.getFacilities()).toEqual([]);
  });
  it('does not leak another owner through duplicate submission', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValue(profile);
    vi.spyOn(dataRepository, 'getTrainingSession').mockResolvedValue({ ...payload, ownerUid: 'owner_b', privateNote: 'private' } as unknown as TrainingSession);
    const response = await request(app).post('/api/sessions').set('Authorization', 'Bearer token').send(payload);
    expect(response.status).toBe(409);
    expect(response.body.session).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('private');
  });
  it('rejects user-supplied verified data provenance', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValue(profile);
    const response = await request(app).post('/api/sessions').set('Authorization', 'Bearer token').send({ ...payload, dataOrigin: 'pilot_verified' });
    expect(response.status).toBe(400);
  });
  it('rejects malformed event types and negative elapsed time', () => {
    expect(SessionEventSchema.safeParse({ ...event, type: 'made_up' }).success).toBe(false);
    expect(SessionEventSchema.safeParse({ ...event, elapsedMs: -5 }).success).toBe(false);
  });
  it('strips health descriptions and precise locations from persisted payloads', () => {
    const parsed = SessionEventSchema.parse({ ...event, payloadSafe: { questionId: 'q1', facts: 'medical data', latitude: 10.22, phone: 'private' } });
    expect(parsed.payloadSafe).toEqual({ questionId: 'q1' });
  });
  it('requires provenance for a public facility', () => {
    expect(FacilitySchema.safeParse({ id: 'sample', status: 'verified' }).success).toBe(false);
  });
  it('protects global analytics from anonymous requests', async () => {
    expect((await request(app).get('/api/aggregates/daily')).status).toBe(401);
    expect((await request(app).get('/api/analytics/funnel')).status).toBe(401);
  });
  it('does not grant organization admins cross-organization access', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValue({ ...profile, role: 'org_admin' });
    const response = await request(app).get('/api/admin/sessions').set('Authorization', 'Bearer token');
    expect(response.status).toBe(403);
  });
  it('does not expose server bundle or internals through public health', async () => {
    expect((await request(app).get('/server.js')).status).toBe(404);
    const response = await request(app).get('/api/health');
    expect(response.body.geminiModel).toBeUndefined();
    expect(response.body.geminiReady).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('publisher references do not claim a fabricated review or media license', () => {
    for (const resource of REFERENCE_LEARNING_RESOURCES) {
      expect(resource.reviewStatus).toBe('reference_only');
      expect(resource.reviewedBy).toBe('');
      expect(resource.reviewedAt).toBe('');
      expect(resource.embeddingAllowed).toBe(false);
      expect(resource.youtubeVideoId).toBeUndefined();
      expect(new URL(resource.sourcePageUrl).protocol).toBe('https:');
    }
  });
});
