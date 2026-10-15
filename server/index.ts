import http from 'http';
import { createApp, app } from './app';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';

export interface StartedServer {
  server: http.Server;
  port: number;
  host: string;
  close: () => Promise<void>;
}

/**
 * Starts the production standalone HTTP server on 0.0.0.0:$PORT.
 * Registers graceful shutdown handlers.
 */
export async function startServer(port = PORT, host = HOST): Promise<StartedServer> {
  const currentApp = createApp();
  return new Promise((resolve, reject) => {
    const server = currentApp.listen(port, host, () => {
      console.log(`[GoldenMinutes] Production server listening on ${host}:${port}`);
      
      const close = () => {
        return new Promise<void>((res, rej) => {
          server.close((err) => (err ? rej(err) : res()));
        });
      };

      resolve({ server, port, host, close });
    });

    server.on('error', (err) => {
      console.error('[GoldenMinutes] HTTP server error:', err);
      reject(err);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`[GoldenMinutes] ${signal} signal received. Closing HTTP server...`);
      server.close(() => {
        console.log('[GoldenMinutes] HTTP server closed gracefully.');
        process.exit(0);
      });
      setTimeout(() => {
        console.warn('[GoldenMinutes] Forced shutdown timeout.');
        process.exit(0);
      }, 5000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  });
}

export { app };
