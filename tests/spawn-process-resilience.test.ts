import { describe, it, expect, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('Real Standalone Spawn Integration Test (Zero special env)', () => {
  let child: ChildProcess | null = null;
  // Use a dynamic test port to prevent EADDRINUSE collisions across test runs
  const testPort = 30000 + Math.floor(Math.random() * 20000);

  afterAll(async () => {
    if (child && child.pid) {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
  });

  it('spawns server with no env vars, readyz returns 200 memory_fallback, and server survives probe and malicious origin', async () => {
    // 1. Spawn node process running compiled dist/server.js (or standalone)
    const serverPath = path.resolve(process.cwd(), 'dist/server.js');
    child = spawn('node', [serverPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://goldenminutes.org,http://localhost:3000',
        PORT: String(testPort),
        // Explicitly ensuring no special Firestore Admin env
        ENABLE_FIRESTORE_ADMIN: undefined,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderrOutput = '';
    let stdoutOutput = '';

    child.stdout?.on('data', (d) => {
      stdoutOutput += d.toString();
    });

    child.stderr?.on('data', (d) => {
      stderrOutput += d.toString();
    });

    // Wait for server to start listening
    let serverStarted = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${testPort}/healthz`);
        if (res.status === 200) {
          serverStarted = true;
          break;
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(serverStarted).toBe(true);

    // 2. GET /healthz -> 200
    const health1 = await fetch(`http://127.0.0.1:${testPort}/healthz`);
    expect(health1.status).toBe(200);

    // 3. GET /readyz -> 200 memory_fallback
    const readyRes = await fetch(`http://127.0.0.1:${testPort}/readyz`);
    expect(readyRes.status).toBe(200);
    const readyJson = await readyRes.json();
    expect(readyJson.status).toBe('ready');
    expect(readyJson.database).toBe('memory_fallback');

    // 4. Wait 3 seconds
    await new Promise((r) => setTimeout(r, 3000));

    // 5. GET /healthz 2nd time -> still 200 (process is alive)
    const health2 = await fetch(`http://127.0.0.1:${testPort}/healthz`);
    expect(health2.status).toBe(200);

    // 6. Malicious Origin -> 403
    const maliciousRes = await fetch(`http://127.0.0.1:${testPort}/api/health`, {
      headers: {
        Origin: 'https://malicious-attacker.com',
      },
    });
    expect(maliciousRes.status).toBe(403);
    const maliciousJson = await maliciousRes.json();
    expect(maliciousJson.code).toBe('CORS_FORBIDDEN');

    // 7. Verify no unhandled crashes in stderr
    expect(stderrOutput).not.toContain('ERR_SYSTEM_ERROR');
    expect(stderrOutput).not.toContain('uv_interface_addresses');
    expect(child.exitCode).toBeNull();
  }, 15000);
});
