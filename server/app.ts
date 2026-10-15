import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { apiRouter } from './routes/api';
import { dataRepository } from './repository';
import { handleAIChat } from './routes/aiChat';

export interface AppOptions {
  corsOrigins?: string[];
  isProduction?: boolean;
}

let repoInitPromise: Promise<void> | null = null;

/**
 * Singleton repository initializer: runs exactly once.
 * Safe for both Vite dev middleware and standalone production server.
 */
export function initRepositoryOnce(): Promise<void> {
  if (!repoInitPromise) {
    repoInitPromise = dataRepository.init().catch((err) => {
      console.warn('[Repository] Initialization note (resilience store active):', err?.message || err);
      return;
    });
  }
  return repoInitPromise;
}

/**
 * Creates a configured Express application without listening on any port.
 * Completely side-effect free on import.
 */
export function createApp(options?: AppOptions): express.Express {
  const app = express();

  const isProduction = () => {
    if (options?.isProduction !== undefined) return options.isProduction;
    return process.env.NODE_ENV !== 'development';
  };

  const getConfiguredOrigins = () => {
    if (options?.corsOrigins) return options.corsOrigins;
    const rawCors = process.env.CORS_ORIGIN || '';
    return rawCors ? rawCors.split(',').map((o) => o.trim()).filter(Boolean) : [];
  };

  // Security and CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;

    // Allow requests with no origin (like mobile apps, curl, server-to-server, health probes)
    if (!origin) {
      return next();
    }

    if (!isProduction()) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Request-Id');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      return next();
    }

    const configuredOrigins = getConfiguredOrigins();
    let isAllowed = configuredOrigins.includes(origin);

    if (!isAllowed) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
          isAllowed = true;
        }
      } catch {
        // Invalid origin format
      }
    }

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Request-Id');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      return next();
    }

    // Explicitly reject unauthorized cross-origin requests
    return res.status(403).json({
      code: 'CORS_FORBIDDEN',
      message: 'CORS policy: Origin not allowed by CORS_ORIGIN',
      requestId: (req.headers['x-request-id'] as string) || 'req_cors',
    });
  });

  app.use(express.json({ limit: '2mb' }));

  // Secure HTTP Headers & Request ID
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProduction()) res.setHeader('Strict-Transport-Security', 'max-age=63072000');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Root healthz (liveness) for Cloud Run / Kubernetes / AI Studio
  app.get('/healthz', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'GoldenMinutes Response Lab Web App',
      version: '2.5.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Root readyz (readiness probe with safe fallback)
  app.get('/readyz', async (req: Request, res: Response) => {
    try {
      const probeResult = await dataRepository.probe(3500);
      if (!probeResult.ok) {
        return res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
      }
      return res.status(200).json({
        status: 'ready',
        database: 'supabase_postgres',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
    }
  });

  // API Routes
  app.use('/api', apiRouter);
  app.post('/api/ai/chat', handleAIChat);

  // Explicit 404 JSON for unmatched /api requests (Prevents returning HTML to API callers)
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      code: 'API_ENDPOINT_NOT_FOUND',
      message: `API endpoint '${req.originalUrl}' không tồn tại hoặc sai phương thức HTTP.`,
      requestId: req.headers['x-request-id'] || 'req_404',
    });
  });

  // Serve static frontend files in production
  const distPath = path.resolve(process.cwd(), 'dist/client');
  app.use((req, res, next) => {
    if (req.path === '/server.js' || req.path.endsWith('.map')) return res.sendStatus(404);
    next();
  });
  app.use(express.static(distPath, { dotfiles: 'deny' }));

  // Fallback for React Router SPA (non-API routes)
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head><title>GoldenMinutes Server</title></head>
            <body style="font-family: sans-serif; padding: 2rem;">
              <h2>GoldenMinutes API Backend is Running with Supabase</h2>
              <p>Health check: <a href="/api/health">/api/health</a></p>
            </body>
          </html>
        `);
      }
    });
  });

  // Global Error Handler - strictly returns JSON for API / CORS errors
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err?.message && err.message.includes('CORS policy')) {
      return res.status(403).json({
        code: 'CORS_FORBIDDEN',
        message: err.message,
        requestId: req.headers['x-request-id'] || 'req_cors',
      });
    }
    if (err?.name === 'ZodError') return res.status(400).json({ code: 'INVALID_DATA', message: 'Dữ liệu không hợp lệ.' });
    if (err?.status && Number.isInteger(err.status) && err.status >= 400 && err.status <= 503) {
      return res.status(err.status).json({ code: err.code || 'REQUEST_FAILED', message: 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại.' });
    }
    console.error('Unhandled server error', { requestId: req.headers['x-request-id'] });
    res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã xảy ra lỗi máy chủ nội bộ.',
      requestId: req.headers['x-request-id'] || 'req_err',
    });
  });

  return app;
}

// Default export instance (side-effect free)
export const app = createApp();
