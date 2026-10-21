/**
 * Selects where list/map/dashboard data comes from.
 * - "fixture": local structured fixtures in src/data/demo, used only for a deliberate demo build.
 * - "live": only Supabase/API data; fixtures are never loaded.
 * Production builds default to live. Set VITE_DATA_SOURCE=fixture only for a demo deployment.
 */
const env = import.meta.env as Record<string, string | undefined>;

export type DataSourceMode = 'fixture' | 'live';

const demoHost = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
const demoQuery = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
const storedDemo = (() => {
  if (typeof window === 'undefined') return false;
  try {
    if (demoQuery) localStorage.setItem('goldenminutes.demo.enabled.v1', '1');
    return localStorage.getItem('goldenminutes.demo.enabled.v1') === '1';
  } catch { return false; }
})();
export const DATA_SOURCE: DataSourceMode = demoHost || demoQuery || storedDemo || env.VITE_DATA_SOURCE === 'fixture'
  ? 'fixture'
  : env.VITE_DATA_SOURCE === 'live' || import.meta.env.PROD
    ? 'live'
    : 'fixture';

export const useFixtures = DATA_SOURCE === 'fixture';
