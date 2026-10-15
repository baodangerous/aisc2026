import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { dataRepository } from '../server/repository';

// Mock auth token verification
vi.mock('../server/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid_token') {
        return { uid: 'user_123', email: 'tester@test.com' };
      }
      throw new Error('Invalid token');
    }),
  },
  adminDb: {
    collection: vi.fn(),
  },
  adminApp: {},
}));

describe('Session Idempotency & Batching Verification', () => {
  it('rejects unauthenticated POST /api/sessions', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        scenarioId: 'scen_01_cardiac_arrest',
        scenarioTitle: 'Ép tim CPR',
        events: [],
      });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('deduplicates existing session without overwriting score', async () => {
    const existingSession = {
      sessionId: 'sess_duplicate_1',
      clientSessionId: 'sess_duplicate_1',
      ownerUid: 'user_123',
      scenarioId: 'scen_01',
      scenarioTitle: 'Ép tim CPR',
      readinessScore: 92,
      durationSec: 45,
      events: [],
    };

    vi.spyOn(dataRepository, 'getUser').mockResolvedValueOnce({
      uid: 'user_123',
      displayName: 'Tester',
      role: 'citizen',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.spyOn(dataRepository, 'getTrainingSession').mockResolvedValueOnce(existingSession as any);

    const res = await request(app)
      .post('/api/sessions')
      .set('Authorization', 'Bearer valid_token')
      .send({
        sessionId: 'sess_duplicate_1',
        clientSessionId: 'sess_duplicate_1',
        scenarioId: 'scen_01',
        scenarioTitle: 'Ép tim CPR',
        events: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(true);
    expect(res.body.session.readinessScore).toBe(92);
  });
});
