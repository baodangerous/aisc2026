import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';

describe('/readyz Readiness Probe Verification', () => {
  it('returns 200 and status: ready with memory_fallback when Firestore Admin is not enabled', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('memory_fallback');
    expect(res.body.degraded).toBe(true);
  });
});
