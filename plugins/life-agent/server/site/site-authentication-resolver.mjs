import { IdentityProviderCatalog } from '../auth/identity-provider.mjs';

export const SiteAuthenticationMode = Object.freeze({
  SSO_LINKED: 'SSO_LINKED',
  SSO_AVAILABLE: 'SSO_AVAILABLE',
  USER_PASSWORD_HANDOFF: 'USER_PASSWORD_HANDOFF',
  UNAVAILABLE: 'UNAVAILABLE',
});

function providerPriority() {
  return [...IdentityProviderCatalog].sort((left, right) => {
    if (left.recommended !== right.recommended) return left.recommended ? -1 : 1;
    if (left.optional !== right.optional) return left.optional ? 1 : -1;
    return 0;
  });
}

export function resolveSiteAuthentication({ siteCapability, linkedIdentities = [] } = {}) {
  if (!siteCapability) throw new Error('siteCapability is required');
  const supported = new Set(siteCapability.identityProviders || []);
  const linksByProvider = new Map(linkedIdentities.map(identity => [identity.provider, identity]));

  for (const descriptor of providerPriority()) {
    if (!supported.has(descriptor.id)) continue;
    const linkedIdentity = linksByProvider.get(descriptor.id);
    if (linkedIdentity) {
      return Object.freeze({
        mode: SiteAuthenticationMode.SSO_LINKED,
        origin: siteCapability.origin,
        identityProvider: descriptor.id,
        linkedIdentity,
        passwordRequiredByLifeAgent: false,
      });
    }
  }

  for (const descriptor of providerPriority()) {
    if (!supported.has(descriptor.id)) continue;
    return Object.freeze({
      mode: SiteAuthenticationMode.SSO_AVAILABLE,
      origin: siteCapability.origin,
      identityProvider: descriptor.id,
      linkedIdentity: null,
      passwordRequiredByLifeAgent: false,
    });
  }

  if (siteCapability.passwordFallback) {
    return Object.freeze({
      mode: SiteAuthenticationMode.USER_PASSWORD_HANDOFF,
      origin: siteCapability.origin,
      identityProvider: null,
      linkedIdentity: null,
      passwordRequiredByLifeAgent: false,
    });
  }

  return Object.freeze({
    mode: SiteAuthenticationMode.UNAVAILABLE,
    origin: siteCapability.origin,
    identityProvider: null,
    linkedIdentity: null,
    passwordRequiredByLifeAgent: false,
  });
}
