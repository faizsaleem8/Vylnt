export interface PublicSupabaseConfig { url: string; publishableKey: string }
export function readSupabaseConfig(env: NodeJS.ProcessEnv): PublicSupabaseConfig {
  const rawUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? '';
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('Set SUPABASE_URL to your HTTPS project origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('SUPABASE_URL must be an HTTPS origin without a path or credentials.');
  let publicKey = publishableKey.startsWith('sb_publishable_') && publishableKey.length > 20;
  if (!publicKey && publishableKey.split('.').length === 3) {
    // Classification only, not JWT authentication. Never expose a legacy service-role key.
    try { publicKey = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* invalid key */ }
  }
  if (!publicKey) throw new Error('Use a Supabase publishable key or legacy anon key. Secret/service-role keys are not supported.');
  return { url: url.origin, publishableKey };
}
