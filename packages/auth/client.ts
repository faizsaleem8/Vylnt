import { createClient } from '@supabase/supabase-js';
export interface SupabaseConfig { url: string; publishableKey: string }
export const memoryAuthOptions = { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } as const;
export function createMemoryClient(config: SupabaseConfig) {
  return createClient(config.url, config.publishableKey, { auth: memoryAuthOptions });
}
