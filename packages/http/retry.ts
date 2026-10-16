/** Retry-After supports whole seconds or an HTTP date. Return an absolute deadline. */
export function retryDeadline(value: string | null, now = Date.now()): number {
  const raw = value?.trim() ?? '';
  let delay: number;
  if (/^\d+$/.test(raw)) delay = Number(raw) * 1000;
  else if (/^[A-Za-z]{3},/.test(raw) && Number.isFinite(Date.parse(raw))) delay = Date.parse(raw) - now;
  else delay = 30000;
  // Never retry earlier than a valid server delay. Very long delays need manual action.
  if (!Number.isFinite(delay) || delay > 86400000) return Infinity;
  return now + Math.max(0, delay);
}

export function rateLimitMessage(deadline: number, now = Date.now()): string {
  if (!Number.isFinite(deadline)) return 'The workspace requested a wait longer than one day. Reconnect later to try again.';
  return `Workspace request limit reached. Wait ${Math.max(1, Math.ceil((deadline - now) / 1000))} seconds before trying again.`;
}
