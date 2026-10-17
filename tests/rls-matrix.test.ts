import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/app';
import { dataRepository } from '../server/repository';

const CITIZEN_TOKEN = 'mock_citizen_token';
const VOLUNTEER_TOKEN = 'mock_volunteer_token';
const ORG_ADMIN_TOKEN = 'mock_org_admin_token';
const CLINICAL_REVIEWER_TOKEN = 'mock_clinical_reviewer_token';
const PLATFORM_ADMIN_TOKEN = 'mock_platform_admin_token';

// In-memory test store for RLS verification
const mockResources = [
  {
    id: 'res_verified_1',
    resourceType: 'aed',
    name: 'AED Trạm Y Tế Phường Bến Nghé',
    address: 'Số 1 Nguyễn Huệ, Quận 1',
    lat: 10.776,
    lng: 106.700,
    source: 'admin',
    origin: 'pilot_verified',
    verificationStatus: 'verified',
  },
  {
    id: 'res_synthetic_1',
    resourceType: 'aed',
    name: 'AED Mô Phỏng Phục Vụ Dashboard',
    address: 'Khu vực mô phỏng',
    lat: 10.777,
    lng: 106.701,
    source: 'synthetic',
    origin: 'synthetic_seed',
    verificationStatus: 'verified', // Even if verified, synthetic_seed MUST NEVER leak to public map
  },
  {
    id: 'res_pending_1',
    resourceType: 'aed',
    name: 'AED Đề xuất chưa duyệt',
    address: 'Số 99 Lê Lợi',
    lat: 10.775,
    lng: 106.699,
    source: 'org_submission',
    origin: 'pilot_verified',
    verificationStatus: 'pending',
  },
];

const mockSubmissions: any[] = [];
const mockProofs = new Map<string, any>();

vi.mock('../server/supabaseAuth', () => ({
  supabaseAdmin: null,
  verifySupabaseAccessToken: vi.fn(async (token: string) => {
    if (token === CITIZEN_TOKEN) {
      return { id: 'usr_citizen_123', email: 'citizen@example.com', app_metadata: { role: 'citizen' } };
    }
    if (token === VOLUNTEER_TOKEN) {
      return { id: 'usr_volunteer_123', email: 'vol@example.com', app_metadata: { role: 'volunteer' } };
    }
    if (token === ORG_ADMIN_TOKEN) {
      return { id: 'usr_org_admin_123', email: 'org@example.com', app_metadata: { role: 'org_admin' } };
    }
    if (token === CLINICAL_REVIEWER_TOKEN) {
      return { id: 'usr_clinical_123', email: 'doctor@example.com', app_metadata: { role: 'clinical_reviewer' } };
    }
    if (token === PLATFORM_ADMIN_TOKEN) {
      return { id: 'usr_admin_123', email: 'admin@example.com', app_metadata: { role: 'platform_admin' } };
    }
    return null;
  }),
  isSupabaseAuthConfigured: () => false,
}));

describe('RLS & Security Matrix for Emergency Resources, Submissions & Audit Logs', () => {
  beforeEach(() => {
    // Spy on dataRepository methods to test access control matrix
    vi.spyOn(dataRepository, 'getUser').mockImplementation(async (uid: string) => ({
      uid,
      displayName: 'User',
      role: uid.includes('admin') ? 'platform_admin' : uid.includes('vol') ? 'volunteer' : uid.includes('org') ? 'org_admin' : uid.includes('clinical') ? 'clinical_reviewer' : 'citizen',
      preferredLanguage: 'vi',
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    vi.spyOn(dataRepository, 'logAudit').mockResolvedValue();

    vi.spyOn(dataRepository, 'listEmergencyResources').mockImplementation(async (options: any = {}) => {
      const onlyVerified = options.onlyVerified !== false;
      const excludeSynthetic = options.excludeSynthetic !== false;
      return mockResources.filter((r) => (!onlyVerified || r.verificationStatus === 'verified') && (!excludeSynthetic || r.origin !== 'synthetic_seed'));
    });

    vi.spyOn(dataRepository, 'createResourceSubmission').mockImplementation(async (sub: any) => {
      const record = { ...sub, id: `sub_${mockSubmissions.length + 1}`, status: 'pending', createdAt: new Date().toISOString() };
      mockSubmissions.push(record);
      return record;
    });

    vi.spyOn(dataRepository, 'listResourceSubmissions').mockImplementation(async (filters: any) => {
      return mockSubmissions.filter((s) => (!filters?.status || s.status === filters.status));
    });

    vi.spyOn(dataRepository, 'reviewResourceSubmission').mockImplementation(async (id: string, reviewerId: string, status: any, reason?: string) => {
      const sub = mockSubmissions.find((s) => s.id === id);
      if (!sub) return null;
      sub.status = status;
      sub.rejectionReason = reason;
      if (status === 'approved') {
        mockResources.push({
          id: `res_verified_${id}`,
          resourceType: sub.resourceType,
          name: sub.name,
          address: sub.address,
          lat: sub.lat,
          lng: sub.lng,
          source: 'org_submission',
          origin: 'pilot_verified',
          verificationStatus: 'verified',
        });
      }
      return sub;
    });

    vi.spyOn(dataRepository, 'createDigitalProof').mockImplementation(async (p: any) => {
      const proof = {
        id: `proof_${mockProofs.size + 1}`,
        incidentId: p.incidentId,
        userId: p.userId,
        summary: p.summary,
        payloadHash: p.payloadHash,
        consentSnapshot: p.consentSnapshot,
        version: '1.0',
        legalDisclaimer: 'Căn cứ tham chiếu hỗ trợ hồ sơ theo TT 126/2026/TT-BCA; chưa có giá trị pháp lý cho đến khi cơ quan quản lý Quỹ công nhận.',
        createdAt: new Date().toISOString(),
      };
      mockProofs.set(p.payloadHash, proof);
      return proof;
    });

    vi.spyOn(dataRepository, 'getDigitalProofByHash').mockImplementation(async (hash: string) => {
      return mockProofs.get(hash) || null;
    });
  });

  describe('1. Safety Rule: Public & Nearby Map Isolation', () => {
    it('public / nearby API NEVER returns synthetic_seed or pending resources', async () => {
      const res = await request(app)
        .get('/api/resources/emergency')
        .expect(200);

      expect(Array.isArray(res.body.resources)).toBe(true);
      const resources = res.body.resources;

      // Must find the verified real resource
      const verified = resources.find((r: any) => r.id === 'res_verified_1');
      expect(verified).toBeDefined();

      // MUST NOT leak synthetic_seed
      const synthetic = resources.find((r: any) => r.origin === 'synthetic_seed' || r.id === 'res_synthetic_1');
      expect(synthetic).toBeUndefined();

      // MUST NOT leak pending/unverified
      const pending = resources.find((r: any) => r.verificationStatus === 'pending' || r.id === 'res_pending_1');
      expect(pending).toBeUndefined();
    });
  });

  describe('2. Resource Submissions Authorization Matrix', () => {
    it('guest cannot submit emergency resource without logging in (401)', async () => {
      await request(app)
        .post('/api/resources/submissions')
        .send({
          resourceType: 'aed',
          name: 'AED Khách sạn Rex',
          address: '141 Nguyễn Huệ, Quận 1',
          lat: 10.776,
          lng: 106.701,
        })
        .expect(401);
    });

    it('authenticated citizen can submit an AED proposal (201)', async () => {
      const res = await request(app)
        .post('/api/resources/submissions')
        .set('Authorization', `Bearer ${CITIZEN_TOKEN}`)
        .send({
          resourceType: 'aed',
          name: 'AED Khách sạn Rex',
          address: '141 Nguyễn Huệ, Quận 1',
          lat: 10.776,
          lng: 106.701,
          evidenceUrl: 'https://example.com/rex_aed.jpg',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.submission.status).toBe('pending');
      expect(res.body.submission.name).toBe('AED Khách sạn Rex');
    });

    it('citizen cannot access admin submission queue (403)', async () => {
      await request(app)
        .get('/api/admin/resources/submissions')
        .set('Authorization', `Bearer ${CITIZEN_TOKEN}`)
        .expect(403);
    });

    it('platform_admin can view and approve submission, creating verified resource', async () => {
      // 1. Citizen creates submission
      const subRes = await request(app)
        .post('/api/resources/submissions')
        .set('Authorization', `Bearer ${CITIZEN_TOKEN}`)
        .send({
          resourceType: 'aed',
          name: 'AED TTTM Vincom Đồng Khởi',
          address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1',
          lat: 10.778,
          lng: 106.702,
        })
        .expect(201);

      const subId = subRes.body.submission.id;

      // 2. Admin reviews and approves
      const reviewRes = await request(app)
        .post(`/api/admin/resources/submissions/${subId}/review`)
        .set('Authorization', `Bearer ${PLATFORM_ADMIN_TOKEN}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(reviewRes.body.success).toBe(true);
      expect(reviewRes.body.submission.status).toBe('approved');

      // 3. Now public emergency endpoint should include the newly verified AED
      const publicRes = await request(app)
        .get('/api/resources/emergency')
        .expect(200);

      const newlyAdded = publicRes.body.resources.find((r: any) => r.name === 'AED TTTM Vincom Đồng Khởi');
      expect(newlyAdded).toBeDefined();
      expect(newlyAdded.verificationStatus).toBe('verified');
    });

    it('regular user / volunteer / clinical_reviewer cannot review submissions (403)', async () => {
      await request(app)
        .post('/api/admin/resources/submissions/some_id/review')
        .set('Authorization', `Bearer ${VOLUNTEER_TOKEN}`)
        .send({ status: 'approved' })
        .expect(403);

      await request(app)
        .post('/api/admin/resources/submissions/some_id/review')
        .set('Authorization', `Bearer ${CLINICAL_REVIEWER_TOKEN}`)
        .send({ status: 'approved' })
        .expect(403);
    });
  });

  describe('3. Digital Proofs Cryptographic Generation & Public Verification', () => {
    it('authenticated user can generate immutable proof and anyone can verify by hash', async () => {
      const proofRes = await request(app)
        .post('/api/proofs')
        .set('Authorization', `Bearer ${CITIZEN_TOKEN}`)
        .send({
          incidentId: 'inc_training_99',
          summary: {
            scenario: 'cardiac_arrest',
            durationSec: 58,
            adiSec: 14,
            call115ElapsedSec: 28,
            compressionElapsedSec: 42,
          },
          consentSnapshot: {
            userConsented: true,
            version: '1.0',
            decree13Acknowledged: true,
          },
        })
        .expect(201);

      expect(proofRes.body.success).toBe(true);
      const hash = proofRes.body.proof.payloadHash;
      expect(hash).toHaveLength(64); // SHA-256

      // Anyone (guest/public) can verify this proof using the hash
      const verifyRes = await request(app)
        .get(`/api/proofs/${hash}`)
        .expect(200);

      expect(verifyRes.body.proof.payloadHash).toBe(hash);
      expect(verifyRes.body.proof.legalDisclaimer).toContain('TT 126/2026/TT-BCA');
      expect(verifyRes.body.proof.summary.scenario).toBe('cardiac_arrest');
    });

    it('returns 404 for unknown proof hash', async () => {
      await request(app)
        .get('/api/proofs/0000000000000000000000000000000000000000000000000000000000000000')
        .expect(404);
    });
  });

  describe('4. Regional ADI Metrics & K-Anonymity', () => {
    it('returns regional analytics with cell suppression for small samples (< 5)', async () => {
      const res = await request(app)
        .get('/api/analytics/regional-adi')
        .expect(200);

      expect(Array.isArray(res.body.regions)).toBe(true);
      const smallCell = res.body.regions.find((r: any) => r.incident_count < 5);
      if (smallCell) {
        expect(smallCell.suppressed).toBe(true);
        expect(smallCell.adi_avg).toBeNull();
      }
    });
  });
});
