/**
 * Selects where list/map/dashboard data comes from.
 * - "fixture" (default): local structured fixtures in src/data/demo, merged with live rows when available.
 * - "live": only Supabase/API data; fixtures are never loaded.
 * Set VITE_DATA_SOURCE=live for operational deployments.
 */
const env = import.meta.env as Record<string, string | undefined>;

export type DataSourceMode = 'fixture' | 'live';

export const DATA_SOURCE: DataSourceMode = env.VITE_DATA_SOURCE === 'live' ? 'live' : 'fixture';

export const useFixtures = DATA_SOURCE === 'fixture';
