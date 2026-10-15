import { startServer } from './index';

// Safe crash defense: log background unhandled rejections without crashing reviewer server or leaking credentials
process.on('unhandledRejection', (reason: any) => {
  const errorMsg = typeof reason === 'object' && reason !== null ? reason.message || 'Unknown rejection' : String(reason);
  console.warn('[GoldenMinutes Defense] Background unhandled rejection caught safely:', errorMsg);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[GoldenMinutes Defense] Uncaught exception:', err?.message || err);
});

startServer().catch((err) => {
  console.error('[GoldenMinutes] Fatal startup error:', err?.message || err);
  process.exit(1);
});
