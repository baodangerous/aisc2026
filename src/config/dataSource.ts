/**
 * Selects where list/map/dashboard data comes from.
 * - "fixture": local structured fixtures in src/data/demo, used only for a deliberate demo build.
 * - "live": only Supabase/API data; fixtures are never loaded.
 * Production builds default to live. Set VITE_DATA_SOURCE=fixture only for a demo deployment.
 */
const env = import.meta.env as Record<string, string | undefined>;

export type DataSourceMode = 'fixture' | 'live';

export const DATA_SOURCE: DataSourceMode = env.VITE_DATA_SOURCE === 'fixture'
  ? 'fixture'
  : env.VITE_DATA_SOURCE === 'live' || import.meta.env.PROD
    ? 'live'
    : 'fixture';

export const useFixtures = DATA_SOURCE === 'fixture';
