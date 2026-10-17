import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) if (process.env[key] === undefined) process.env[key] = value;
  return {
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''),
    'import.meta.env.VITE_SUPABASE_REDIRECT_URL': JSON.stringify(env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || ''),
  },
  base: '/',
  build: { outDir: 'dist/client' },
  plugins: [react(), tailwindcss(), {
    name: 'goldenminutes-api',
    async configureServer(server) {
      const { createApp } = await import('./server/app');
      const app = createApp({ isProduction: false });
      server.middlewares.use((req, res, next) => {
        if (/^\/(api(?:\/|$)|healthz(?:\?|$)|readyz(?:\?|$))/.test(req.url || '')) app(req as import('express').Request, res as import('express').Response, next);
        else next();
      });
    },
  }],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  };
});
