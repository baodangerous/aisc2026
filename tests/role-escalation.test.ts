import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/app';
import { getEffectiveRoleFromClaims } from '../server/routes/api';
import { dataRepository } from '../server/repository';
import { TrainingSession } from '../src/domain/schemas';

// Mock auth token verification
vi.mock('../server/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid_citizen_token') {
        return { uid: 'user_citizen', email: 'citizen@test.com', role: 'citizen' };
      }
      if (token === 'valid_admin_token') {
        return { uid: 'user_admin', email: 'admin@test.com', admin: true, role: 'platform_admin' };
      }
      if (token === 'forged_claim_token') {
        return { uid: 'attacker', email: 'attacker@test.com', role: 'arbitrary_superuser_role' };
      }
      throw new Error('Invalid token');
    }),
  },
  adminDb: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        set: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    }),
  },
  adminApp: {},
}));

describe('Role Escalation & IDOR Protection Verification', () => {
  it('getEffectiveRoleFromClaims strictly enforces whitelist and rejects arbitrary strings', () => {
    expect(getEffectiveRoleFromClaims({ admin: true })).toBe('platform_admin');
    expect(getEffectiveRoleFromClaims({ platform_admin: true })).toBe('platform_admin');
    expect(getEffectiveRoleFromClaims({ clinical_reviewer: true })).toBe('clinical_reviewer');
    expect(getEffectiveRoleFromClaims({ org_admin: true })).toBe('org_admin');
    expect(getEffectiveRoleFromClaims({ volunteer: true })).toBe('volunteer');
    expect(getEffectiveRoleFromClaims({ role: 'citizen' })).toBe('citizen');
    // Arbitrary role strings should be sanitized to citizen
    expect(getEffectiveRoleFromClaims({ role: 'super_hacker' })).toBe('citizen');
    expect(getEffectiveRoleFromClaims(undefined)).toBe('citizen');
  });

  it('does not allow client to change role to platform_admin via sync-profile', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValueOnce({
      uid: 'user_citizen',
      displayName: 'Citizen User',
      role: 'citizen',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.spyOn(dataRepository, 'logAudit').mockResolvedValue();

    const upsertSpy = vi.spyOn(dataRepository, 'upsertUser').mockImplementation(async (data: any) => ({
      uid: data.uid,
      displayName: data.displayName || 'Citizen User',
      role: 'citizen',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const res = await request(app)
      .post('/api/auth/sync-profile')
      .set('Authorization', 'Bearer valid_citizen_token')
      .send({
        displayName: 'Attacker',
        role: 'platform_admin',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('citizen');
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({ role: 'platform_admin' })
    );
  });

  it('IDOR check forbids citizen from accessing another user training session', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValueOnce({
      uid: 'user_citizen',
      displayName: 'Citizen User',
      role: 'citizen',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockSession: TrainingSession = {
      sessionId: 'sess_other',
      clientSessionId: 'sess_other',
      ownerUid: 'other_victim_uid',
      scenarioId: 'sc_cpr_adult',
      scenarioVersionId: 'v1.0.0',
      scenarioTitle: 'Ép tim người lớn',
      mode: 'training',
      status: 'completed',
      startedAt: new Date().toISOString(),
      events: [],
      dataOrigin: 'training_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(dataRepository, 'getTrainingSession').mockResolvedValueOnce(mockSession);

    const res = await request(app)
      .get('/api/sessions/sess_other')
      .set('Authorization', 'Bearer valid_citizen_token');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('IDOR check allows admin with verified Custom Claims to view training session', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValueOnce({
      uid: 'user_admin',
      displayName: 'Admin User',
      role: 'platform_admin',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockSession: TrainingSession = {
      sessionId: 'sess_other',
      clientSessionId: 'sess_other',
      ownerUid: 'other_victim_uid',
      scenarioId: 'sc_cpr_adult',
      scenarioVersionId: 'v1.0.0',
      scenarioTitle: 'Ép tim người lớn',
      mode: 'training',
      status: 'completed',
      startedAt: new Date().toISOString(),
      events: [],
      dataOrigin: 'training_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(dataRepository, 'getTrainingSession').mockResolvedValueOnce(mockSession);

    const res = await request(app)
      .get('/api/sessions/sess_other')
      .set('Authorization', 'Bearer valid_admin_token');

    expect(res.status).toBe(200);
    expect(res.body.session).toBeDefined();
  });
});
