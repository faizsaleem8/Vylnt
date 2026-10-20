import { createClient } from '@redis/client';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { Store } from 'express-rate-limit';

export type RateBucket = 'client' | 'user' | 'writes';
export interface RateBackend { secret?: string; store?: (bucket: RateBucket) => Store }
export type RateBackendConfig = { mode: 'memory' } | { mode: 'redis'; url: string; secret: string; namespace: string };
export class RateBackendUnavailable extends Error {
  constructor() { super('Request protection is temporarily unavailable. Retry shortly.'); }
}
export function readRateBackendConfig(env: NodeJS.ProcessEnv): RateBackendConfig {
  const mode = env.VYNLT_RATE_STORE ?? 'memory';
  if (!['memory', 'redis'].includes(mode)) throw new Error('VYNLT_RATE_STORE must be memory or redis');
  if (env.NODE_ENV === 'production' && mode !== 'redis') throw new Error('Production requires VYNLT_RATE_STORE=redis');
  if (mode === 'memory') return { mode };
  let url: URL;
  try { url = new URL(env.VYNLT_REDIS_URL ?? ''); } catch { throw new Error('Set VYNLT_REDIS_URL to a Redis connection URL'); }
  if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname || url.hash || url.search || !/^\/\d*$/.test(url.pathname || '/')) throw new Error('VYNLT_REDIS_URL must use redis/rediss with an optional database number');
  const secret = env.VYNLT_RATE_KEY_SECRET ?? '';
  if (secret.length < 32 || secret.length > 512 || /\s/.test(secret)) throw new Error('VYNLT_RATE_KEY_SECRET must be 32..512 characters without whitespace and identical across replicas');
  const namespace = env.VYNLT_RATE_NAMESPACE ?? 'vynlt';
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(namespace)) throw new Error('VYNLT_RATE_NAMESPACE must be 1..64 letters, digits, underscores or hyphens');
  return { mode: 'redis', url: url.toString(), secret, namespace };
}

export async function openRateBackend(config: RateBackendConfig, windowMs: number): Promise<{ backend: RateBackend; close: () => void }> {
  if (config.mode === 'memory') return { backend: {}, close: () => {} };
  const client = createClient({ url: config.url, disableOfflineQueue: true,
    socket: { connectTimeout: 3000, reconnectStrategy: retries => Math.min(250 * 2 ** Math.min(retries, 5), 5000) } });
  // Redis errors can include connection details; only sanitized API errors leave this adapter.
  client.on('error', () => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([client.connect(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new RateBackendUnavailable()), 5000); })]);
  } catch {
    if (client.isOpen) client.destroy();
    throw new RateBackendUnavailable();
  } finally { if (timer) clearTimeout(timer); }
  const sendCommand = async (...args: string[]): Promise<RedisReply> => {
    if (!client.isReady) throw new RateBackendUnavailable();
    try { return await client.sendCommand<RedisReply>(args, { timeout: 2000 }); }
    catch (error) {
      // The store handles script-cache reloads; preserve only that Redis signal.
      if (error instanceof Error && error.message.startsWith('NOSCRIPT')) throw error;
      throw new RateBackendUnavailable();
    }
  };
  return { backend: { secret: config.secret, store: bucket => new RedisStore({ sendCommand, prefix: `${config.namespace}:${windowMs}:${bucket}:` }) },
    close: () => { if (client.isOpen) client.destroy(); } };
}
