export interface SessionProfile {
  sameSite: 'lax' | 'strict' | 'no_restriction';
  session: boolean;
  secure: boolean;
  httpOnly: boolean;
}
export const sessionProfiles: readonly string[];
export const crossSiteSessionProfiles: readonly string[];
export function parseSessionProfile(id: string | undefined): SessionProfile | undefined;
export function parseCrossSiteSessionProfile(id: string | undefined): SessionProfile | undefined;
export function applySessionProfile(headers: string[], cookieName: string, profile: SessionProfile): string[];
export function matchesSessionProfile(cookie: {sameSite: string; session: boolean; secure: boolean; httpOnly: boolean} | undefined, profile: SessionProfile): boolean;
