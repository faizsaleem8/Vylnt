const variants = ['insecure-httponly', 'insecure-readable', 'secure-readable'];
export const sessionProfiles = ['lax', 'strict'].flatMap(sameSite =>
  ['transient', 'persistent'].flatMap(lifetime => variants.map(variant =>
    `session-${sameSite}-${lifetime}-${variant}`)));
export const crossSiteSessionProfiles = ['transient', 'persistent'].flatMap(lifetime =>
  ['httponly', 'readable'].map(access => `session-none-${lifetime}-secure-${access}`));
const sameSiteValues = {lax: 'Lax', strict: 'Strict', no_restriction: 'None'};

export function parseSessionProfile(id) {
  return sessionProfiles.includes(id) ? parseProfile(id) : undefined;
}

export function parseCrossSiteSessionProfile(id) {
  return crossSiteSessionProfiles.includes(id) ? parseProfile(id) : undefined;
}

function parseProfile(id) {
  const [, sameSite, lifetime, transport, access] = id.split('-');
  return {sameSite: sameSite === 'none' ? 'no_restriction' : sameSite,
    session: lifetime === 'transient', secure: transport === 'secure', httpOnly: access === 'httponly'};
}

/** Change only the selected native session's browser attributes. Keep the
 * signed value, scope, and server-side session lifetime intact. */
export function applySessionProfile(headers, cookieName, profile) {
  return headers.map(header => {
    const [pair, ...attributes] = header.split(';');
    if (!pair.startsWith(cookieName + '=') || pair === cookieName + '=') return header;
    const removal = attributes.some(attribute => {
      const [name, value = ''] = attribute.trim().split('=');
      return (/^max-age$/i.test(name) && Number(value) <= 0)
        || (/^expires$/i.test(name) && Date.parse(value) <= Date.now());
    });
    if (removal) return header;
    const retained = attributes.filter(attribute => !/^\s*(samesite|secure|httponly|expires|max-age)\s*(?:=|$)/i.test(attribute));
    return [pair, ...retained.map(attribute => attribute.trim()),
      `SameSite=${sameSiteValues[profile.sameSite]}`,
      ...(profile.session ? [] : ['Max-Age=900']),
      ...(profile.secure ? ['Secure'] : []),
      ...(profile.httpOnly ? ['HttpOnly'] : []),
    ].join('; ');
  });
}

export function matchesSessionProfile(cookie, profile) {
  return cookie?.sameSite === profile.sameSite && cookie.session === profile.session
    && cookie.secure === profile.secure && cookie.httpOnly === profile.httpOnly;
}
