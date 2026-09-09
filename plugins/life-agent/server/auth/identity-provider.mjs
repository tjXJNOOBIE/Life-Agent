const PROVIDERS = Object.freeze({
  GOOGLE: Object.freeze({ id: 'GOOGLE', displayName: 'Google', recommended: true }),
  MICROSOFT: Object.freeze({ id: 'MICROSOFT', displayName: 'Microsoft', recommended: true }),
  GITHUB: Object.freeze({ id: 'GITHUB', displayName: 'GitHub', recommended: true }),
  DISCORD: Object.freeze({ id: 'DISCORD', displayName: 'Discord', recommended: true }),
  APPLE: Object.freeze({ id: 'APPLE', displayName: 'Apple', recommended: false, optional: true }),
});

export const IdentityProvider = Object.freeze(Object.fromEntries(
  Object.entries(PROVIDERS).map(([key, value]) => [key, value.id]),
));

export const IdentityProviderCatalog = Object.freeze(Object.values(PROVIDERS));

export function normalizeIdentityProvider(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized || !Object.hasOwn(PROVIDERS, normalized)) {
    throw new Error(`unsupported identity provider: ${value || 'empty'}`);
  }
  return PROVIDERS[normalized].id;
}

export function identityProviderDescriptor(value) {
  const provider = normalizeIdentityProvider(value);
  return IdentityProviderCatalog.find(candidate => candidate.id === provider);
}
