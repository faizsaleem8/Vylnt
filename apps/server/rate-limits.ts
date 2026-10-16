import { createHmac, randomBytes } from 'node:crypto';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Identity } from './store';

export interface RateLimits { windowMs: number; ipMax: number; userMax: number; writeMax: number }
export const defaultRateLimits: Readonly<RateLimits> = { windowMs: 60000, ipMax: 600, userMax: 300, writeMax: 60 };
export function readRateLimits(env: NodeJS.ProcessEnv): RateLimits {
  const positive = (name: string, fallback: number, max: number) => {
    const raw = env[name];
    if (raw === undefined) return fallback;
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1 || Number(raw) > max) {
      throw new Error(`${name} must be an integer between 1 and ${max}`);
    }
    return Number(raw);
  };
  return {
    windowMs: positive('VYNLT_RATE_WINDOW_MS', defaultRateLimits.windowMs, 3600000),
    ipMax: positive('VYNLT_RATE_IP_MAX', defaultRateLimits.ipMax, 100000),
    userMax: positive('VYNLT_RATE_USER_MAX', defaultRateLimits.userMax, 100000),
    writeMax: positive('VYNLT_RATE_WRITE_MAX', defaultRateLimits.writeMax, 100000),
  };
}

/** Per-process counters, never an archive of addresses, credentials or requests. */
export function createRateLimits(config: RateLimits) {
  const salt = randomBytes(32);
  const key = (value: string) => createHmac('sha256', salt).update(value).digest('hex');
  const common = { windowMs: config.windowMs, standardHeaders: 'draft-8' as const, legacyHeaders: false };
  return {
    // Use the socket, not caller-controlled Forwarded/X-Forwarded-For headers.
    // IPv6 /64 grouping prevents rotating host addresses within that subnet.
    client: rateLimit({ ...common, identifier: 'client-requests', limit: config.ipMax,
      keyGenerator: req => key(ipKeyGenerator(req.socket.remoteAddress ?? 'unknown', 64)),
      message: { error: 'Too many requests from this connection. Wait before trying again.', code: 'RATE_LIMITED' } }),
    user: rateLimit({ ...common, identifier: 'workspace-requests', limit: config.userMax,
      keyGenerator: (_req, res) => key((res.locals.identity as Identity).ownerId),
      message: { error: 'Workspace request limit reached. Wait before trying again.', code: 'RATE_LIMITED' } }),
    writes: rateLimit({ ...common, identifier: 'workspace-writes', limit: config.writeMax,
      keyGenerator: (_req, res) => key((res.locals.identity as Identity).ownerId),
      skip: req => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
      message: { error: 'Workspace write limit reached. Wait before saving more changes.', code: 'RATE_LIMITED' } }),
  };
}
