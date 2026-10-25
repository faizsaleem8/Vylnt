import { isIP } from 'node:net';

export function readDeploymentConfig(env: NodeJS.ProcessEnv, port: number) {
  const proxySetting = env.VYLNT_TRUSTED_PROXIES ?? env.VYNLT_TRUSTED_PROXIES;
  const trustedProxies = proxySetting ? proxySetting.split(',').map(value => value.trim()) : [];
  for (const proxy of trustedProxies) {
    const [address, mask, extra] = proxy.split('/'), version = isIP(address);
    if (!version || extra !== undefined || (mask !== undefined && (!/^\d+$/.test(mask) || Number(mask) < 1 || Number(mask) > (version === 4 ? 32 : 128)))) throw new Error('VYLNT_TRUSTED_PROXIES must contain explicit IP addresses or nonzero CIDR ranges');
  }
  const origins = ((env.VYLNT_ALLOWED_ORIGINS ?? env.VYNLT_ALLOWED_ORIGINS) ?? `http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:5173,http://localhost:5173`).split(',').map(origin => origin.trim());
  for (const raw of origins) {
    let url: URL; try { url = new URL(raw); } catch { throw new Error('VYLNT_ALLOWED_ORIGINS must contain explicit HTTP(S) origins'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('VYLNT_ALLOWED_ORIGINS must contain explicit HTTP(S) origins');
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production origins must use HTTPS');
  }
  if (env.NODE_ENV === 'production' && (!(env.VYLNT_ALLOWED_ORIGINS ?? env.VYNLT_ALLOWED_ORIGINS) || (env.VYLNT_STORAGE ?? env.VYNLT_STORAGE) !== 'supabase')) throw new Error('Production requires Supabase storage and explicit HTTPS allowed origins');
  return { trustedProxies, origins: origins.map(origin => new URL(origin).origin) };
}

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
