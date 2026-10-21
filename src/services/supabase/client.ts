import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { createDemoSupabase } from '../demo/mockSupabase';

const env = import.meta.env as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const host = typeof window !== 'undefined' ? window.location.hostname : '';
const queryDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
export const isDemoMode = queryDemo || (import.meta.env.PROD && host.endsWith('.vercel.app'));
export const isSupabaseConfigured = Boolean(url && key);
export const supabase: SupabaseClient | null = isDemoMode
  ? createDemoSupabase()
  : isSupabaseConfigured
    ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

export type SupabaseUser = User;

export async function getSupabaseProfile(user: SupabaseUser) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.from('profiles').select('id,display_name,role,preferred_language,onboarding_completed,created_at,updated_at,deletion_requested_at').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || user.phone || user.email?.split('@')[0] || 'Người dùng';
  const { data: created, error: createError } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName, role: 'user', preferred_language: 'vi', onboarding_completed: false }).select('id,display_name,role,preferred_language,onboarding_completed,created_at,updated_at,deletion_requested_at').single();
  if (createError) throw createError;
  return created;
}

export function mapProfile(row: any) {
  return { uid: row.id, displayName: row.display_name, role: row.role, preferredLanguage: row.preferred_language, onboardingCompleted: row.onboarding_completed, createdAt: row.created_at, updatedAt: row.updated_at, deletionRequestedAt: row.deletion_requested_at };
}
