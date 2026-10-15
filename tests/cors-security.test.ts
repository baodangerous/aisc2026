import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';

describe('CORS Security Configuration', () => {
  it('allows requests from valid local/configured origins', async () => {
    const app = createApp({ isProduction: false });
    const res = await request(app)
      .get('/healthz')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('handles server-to-server or probe calls without Origin header safely', async () => {
    const app = createApp({ isProduction: true, corsOrigins: ['https://goldenminutes.org'] });
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  it('rejects unauthorized origins in production mode with 403 CORS_FORBIDDEN', async () => {
    const prodApp = createApp({
      isProduction: true,
      corsOrigins: ['https://goldenminutes.org', 'http://localhost:3000'],
    });

    const res = await request(prodApp)
      .get('/api/health')
      .set('Origin', 'https://malicious-site.evil');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CORS_FORBIDDEN');
    expect(res.body.message).toContain('CORS policy: Origin not allowed');
  });
});
