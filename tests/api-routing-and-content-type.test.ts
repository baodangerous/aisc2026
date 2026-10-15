import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server/app';
import { dataRepository } from '../server/repository';

describe('API Routing & Content-Type Integrity', () => {
  it('/api/health returns JSON and status 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.status).toBe('ok');
    expect(res.body.app).toBeDefined();
  });

  it('/api/facilities returns JSON and status 200', async () => {
    vi.spyOn(dataRepository, 'getFacilities').mockResolvedValueOnce([
      {
        id: 'fac_1',
        name: 'Bệnh viện Cấp cứu Trưng Vương',
        type: 'hospital',
        address: '266 Lý Thường Kiệt, Q.10, TP.HCM',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 10',
        lat: 10.771,
        lng: 106.657,
        regionCell: 'HCM_D10',
        isPublicAccess: true,
        operatingHours: '24/7',
        status: 'verified',
        disclaimer: 'Dữ liệu xác thực',
      },
    ]);

    const res = await request(app).get('/api/facilities');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(res.body.facilities)).toBe(true);
    expect(res.body.facilities.length).toBe(1);
  });

  it('unmatched /api/* returns JSON 404 and NEVER falls back to HTML', async () => {
    const res = await request(app).get('/api/non-existent-endpoint-xyz');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.code).toBe('API_ENDPOINT_NOT_FOUND');
    expect(res.body.message).toContain("API endpoint '/api/non-existent-endpoint-xyz' không tồn tại");
  });

  it('/healthz returns JSON 200 for container liveness probe', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.status).toBe('ok');
  });

  it('/readyz returns JSON for container readiness probe', async () => {
    vi.spyOn(dataRepository, 'probe').mockResolvedValueOnce({ ok: true, database: 'supabase_postgres' });
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.status).toBe('ready');
  });
});
