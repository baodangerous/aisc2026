import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';

describe('/readyz Readiness Probe Verification', () => {
  it('returns 503 without claiming persistent storage is ready when Supabase is disabled', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.database).toBeUndefined();
  });
});
