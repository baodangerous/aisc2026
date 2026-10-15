import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../server/app';
import { startServer } from '../server/index';

describe('Production Server Entry Verification', () => {
  it('server/app.ts is side-effect free and does NOT call app.listen', () => {
    const appFile = fs.readFileSync(path.resolve(process.cwd(), 'server/app.ts'), 'utf-8');
    expect(appFile).not.toContain('app.listen(');
    expect(appFile).not.toContain('process.on(');
  });

  it('vite.config.ts is decoupled from server and does NOT import server backend', () => {
    const viteConfig = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');
    expect(viteConfig).not.toContain("server/app");
    expect(viteConfig).not.toContain("expressApiPlugin");
    expect(viteConfig).not.toContain("from './server/index'");
    expect(viteConfig).not.toContain("from './server/standalone'");
    expect(viteConfig).not.toContain("from './server'");
  });

  it('server/index.ts is completely side-effect free on import and does not call startServer() automatically', async () => {
    const serverFile = fs.readFileSync(path.resolve(process.cwd(), 'server/index.ts'), 'utf-8');
    expect(serverFile).not.toContain('startServer().catch');
    expect(serverFile).not.toContain('shouldAutoStart');
  });

  it('server/standalone.ts imports startServer and invokes it', () => {
    const standaloneFile = fs.readFileSync(path.resolve(process.cwd(), 'server/standalone.ts'), 'utf-8');
    expect(standaloneFile).toContain("import { startServer } from './index'");
    expect(standaloneFile).toContain('startServer()');
  });

  it('GET / and endpoints do NOT set X-Frame-Options: SAMEORIGIN or DENY to permit AI Studio shared iframe', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('startServer can start on a test port and close cleanly without leaking listeners', async () => {
    // Start on ephemeral port
    const started = await startServer(0, '127.0.0.1');
    expect(started.server).toBeDefined();
    expect(started.server.listening).toBe(true);

    await started.close();
    expect(started.server.listening).toBe(false);
  });
});

