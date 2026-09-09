import { normalizeIdentityProvider } from '../auth/identity-provider.mjs';

export const SiteAuthVerification = Object.freeze({
  VERIFIED: 'VERIFIED',
  OBSERVED: 'OBSERVED',
  UNVERIFIED: 'UNVERIFIED',
});

function normalizeOrigin(value) {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'https:') throw new Error('site auth origin must use https');
  if (parsed.username || parsed.password) throw new Error('site auth origin may not contain credentials');
  return parsed.origin;
}

export function createSiteAuthCapability(input = {}) {
  const verification = String(input.verification || SiteAuthVerification.UNVERIFIED).toUpperCase();
  if (!Object.hasOwn(SiteAuthVerification, verification)) throw new Error(`unsupported site auth verification: ${verification}`);

  const identityProviders = [...new Set((input.identityProviders || []).map(normalizeIdentityProvider))];
  return Object.freeze({
    origin: normalizeOrigin(input.origin),
    identityProviders: Object.freeze(identityProviders),
    passwordFallback: Boolean(input.passwordFallback),
    verification,
    lastVerifiedAt: Number.isFinite(input.lastVerifiedAt) ? Number(input.lastVerifiedAt) : null,
  });
}
