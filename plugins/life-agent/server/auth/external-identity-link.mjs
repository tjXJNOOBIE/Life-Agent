import { normalizeIdentityProvider } from './identity-provider.mjs';

const FORBIDDEN_AUTH_FIELDS = new Set([
  'accessToken',
  'refreshToken',
  'idToken',
  'token',
  'cookie',
  'cookies',
  'password',
  'mfaSecret',
  'localStorage',
  'indexedDB',
  'indexedDb',
  'browserProfile',
  'session',
  'sessionToken',
]);

export function createExternalIdentityLink(input = {}, now = () => Date.now()) {
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_AUTH_FIELDS.has(key) && value != null) {
      throw new Error(`external identity link may not contain ${key}`);
    }
  }

  const stableProviderSubject = String(input.stableProviderSubject || '').trim();
  if (!stableProviderSubject) throw new Error('stableProviderSubject is required');

  return Object.freeze({
    provider: normalizeIdentityProvider(input.provider),
    stableProviderSubject,
    displayName: input.displayName ? String(input.displayName) : null,
    emailHint: input.emailHint ? String(input.emailHint) : null,
    linkedAt: Number.isFinite(input.linkedAt) ? Number(input.linkedAt) : now(),
  });
}
