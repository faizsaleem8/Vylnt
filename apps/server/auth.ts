import { timingSafeEqual } from 'node:crypto';
import type { Identity } from './store';
export interface Authenticator { authenticate(token: string): Promise<Identity | undefined> }
export const LOCAL_OWNER = '00000000-0000-4000-8000-000000000001';
export function localAuth(expected: string): Authenticator {
  if (expected.length < 32) throw new Error('VYLNT_API_TOKEN must contain at least 32 characters. Run npm run setup:local.');
  return { async authenticate(token) {
    const a = Buffer.from(expected), b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b) ? { ownerId: LOCAL_OWNER, token } : undefined;
  } };
}
export function supabaseAuth(url: string, anonKey: string): Authenticator {
  return { async authenticate(token) {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (response.status === 401 || response.status === 403) return;
    if (!response.ok) throw new Error('Authentication service unavailable');
    const user = await response.json() as { id?: string };
    return user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? { ownerId: user.id, token } : undefined;
  } };
}
