import { normalizeIdentityProvider } from './identity-provider.mjs';

const SAFE_FIELDS = new Set(['provider', 'stableProviderSubject', 'displayName', 'emailHint', 'linkedAt']);
const FORBIDDEN_AUTH_FIELDS = new Set([
  'accesstoken', 'refreshtoken', 'idtoken', 'token', 'cookie', 'cookies', 'password',
  'mfasecret', 'localstorage', 'indexeddb', 'browserprofile', 'session', 'sessiontoken',
  'authorization', 'rawheaders', 'credential', 'credentials', 'secret',
]);

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function createExternalIdentityLink(input = {}, now = () => Date.now()) {
  for (const [key, value] of Object.entries(input)) {
    const normalized = normalizedKey(key);
    if (FORBIDDEN_AUTH_FIELDS.has(normalized) || normalized.endsWith('token') || normalized.endsWith('secret') || normalized.includes('cookie')) {
      throw new Error(`external identity link may not contain ${key}`);
    }
    if (!SAFE_FIELDS.has(key)) throw new Error(`external identity link contains unsupported field ${key}`);
  }

  const stableProviderSubject = String(input.stableProviderSubject || '').trim();
  if (!stableProviderSubject) throw new Error('stableProviderSubject is required');

  return Object.freeze({
    provider: normalizeIdentityProvider(input.provider),
    stableProviderSubject,
    displayName: input.displayName ? String(input.displayName).slice(0, 256) : null,
    emailHint: input.emailHint ? String(input.emailHint).slice(0, 320) : null,
    linkedAt: Number.isFinite(input.linkedAt) ? Number(input.linkedAt) : now(),
  });
}
