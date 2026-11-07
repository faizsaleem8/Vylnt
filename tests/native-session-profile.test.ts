import {describe, expect, it} from 'vitest';
import {applySessionProfile, crossSiteSessionProfiles, matchesSessionProfile, parseCrossSiteSessionProfile, parseSessionProfile, sessionProfiles} from '../scripts/native-session-profile.mjs';

describe('native session acquisition profiles', () => {
  it('enumerates twelve distinct browser-attribute combinations', () => {
    const combinations = sessionProfiles.map(parseSessionProfile);
    expect(new Set(combinations.map(profile => JSON.stringify(profile))).size).toBe(12);
    expect(combinations.every(Boolean)).toBe(true);
    expect(parseSessionProfile('session-lax-transient-secure-httponly')).toBeUndefined();
  });

  it('rewrites only the selected issued cookie and preserves its value and scope', () => {
    const profile = parseSessionProfile('session-strict-persistent-secure-readable')!;
    const unrelated = 'other=signed; SameSite=Lax; HttpOnly';
    const removed = 'sid=cleared; Path=/app; Max-Age=0';
    const expired = 'sid=cleared; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const empty = 'sid=; Path=/app';
    expect(applySessionProfile([
      'sid=opaque=value; Path=/app; Domain=localhost; SameSite=Lax; HttpOnly; Max-Age=1200',
      unrelated, removed, expired, empty,
    ], 'sid', profile)).toEqual([
      'sid=opaque=value; Path=/app; Domain=localhost; SameSite=Strict; Max-Age=900; Secure',
      unrelated, removed, expired, empty,
    ]);
  });

  it('requires every observed attribute to match before crediting a scenario', () => {
    const profile = parseSessionProfile('session-lax-transient-insecure-httponly')!;
    expect(matchesSessionProfile({...profile}, profile)).toBe(true);
    expect(matchesSessionProfile(undefined, profile)).toBe(false);
    expect(matchesSessionProfile({...profile, httpOnly: false}, profile)).toBe(false);
    expect(matchesSessionProfile({...profile, secure: true}, profile)).toBe(false);
    expect(matchesSessionProfile({...profile, session: false}, profile)).toBe(false);
    expect(matchesSessionProfile({...profile, sameSite: 'strict'}, profile)).toBe(false);
  });

  it('permits SameSite=None only with Secure in the cross-site profiles', () => {
    expect(crossSiteSessionProfiles).toHaveLength(4);
    expect(parseCrossSiteSessionProfile('session-none-transient-insecure-httponly')).toBeUndefined();
    for (const id of crossSiteSessionProfiles) {
      expect(parseSessionProfile(id)).toBeUndefined();
      const profile = parseCrossSiteSessionProfile(id)!;
      expect(profile.sameSite).toBe('no_restriction');
      expect(profile.secure).toBe(true);
      expect(applySessionProfile(['sid=opaque; SameSite=Strict'], 'sid', profile)[0]).toMatch(/; SameSite=None;.*Secure/);
    }
  });
});
