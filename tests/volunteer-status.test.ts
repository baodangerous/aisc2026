import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { dataRepository } from '../server/repository';

// Mock auth token verification
vi.mock('../server/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === 'valid_applicant_token') {
        return { uid: 'vol_user_1', email: 'vol@test.com' };
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

describe('Volunteer Status Integrity Verification', () => {
  it('new volunteer application always receives status pending_review (never verified)', async () => {
    vi.spyOn(dataRepository, 'getUser').mockResolvedValueOnce({
      uid: 'vol_user_1',
      displayName: 'Nguyen Van A',
      role: 'citizen',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.spyOn(dataRepository, 'logAudit').mockResolvedValue();

    const createSpy = vi.spyOn(dataRepository, 'createVolunteerApplication').mockImplementation(async (data: any) => ({
      ...data,
      id: 'VOL-2026-0001',
      status: 'pending_review',
      statusHistory: [{ status: 'pending_review', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const res = await request(app)
      .post('/api/volunteer/apply')
      .set('Authorization', 'Bearer valid_applicant_token')
      .send({
        displayName: 'Nguyen Van A',
        email: 'vol@test.com',
        phone: '0901234567',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        skills: ['cpr_adult', 'aed_operator'],
        cprTrained: true,
        certificationOrg: 'Hội Chữ Thập Đỏ',
        status: 'verified', // Attempted auto-verification bypass
        safetyConsent: true,
        privacyConsent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('pending_review');
    expect(createSpy).toHaveBeenCalled();
  });
});
