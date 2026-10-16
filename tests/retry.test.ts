import { expect, it } from 'vitest';
import { rateLimitMessage, retryDeadline } from '../packages/http/retry';

const now = Date.parse('2026-10-16T00:00:00Z');
it('interprets whole seconds and HTTP dates at response time', () => {
  expect(retryDeadline(' 60 ', now)).toBe(now + 60000);
  expect(retryDeadline('Fri, 16 Oct 2026 00:01:00 GMT', now)).toBe(now + 60000);
  expect(retryDeadline('Thu, 15 Oct 2026 23:59:00 GMT', now)).toBe(now);
  expect(retryDeadline('0', now)).toBe(now);
});
it('uses a conservative fallback for absent or malformed values and pauses extremely long waits', () => {
  for (const value of [null, '', '-1', '1.5', '2026', 'garbage']) {
    // 2026 is valid delta seconds, not a date.
    expect(retryDeadline(value, now)).toBe(now + (value === '2026' ? 2026000 : 30000));
  }
  expect(retryDeadline('999999999999999999999999999999', now)).toBe(Infinity);
  expect(retryDeadline('86400', now)).toBe(now + 86400000);
  expect(retryDeadline('86401', now)).toBe(Infinity);
  expect(rateLimitMessage(Infinity, now)).toContain('Reconnect later');
});
it('gives useful wait guidance without exposing response bodies', () => {
  expect(rateLimitMessage(now + 1500, now)).toContain('Wait 2 seconds');
});
