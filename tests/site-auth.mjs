import assert from 'node:assert/strict';
import { createExternalIdentityLink } from '../plugins/life-agent/server/auth/external-identity-link.mjs';
import { createSiteAuthCapability } from '../plugins/life-agent/server/site/site-auth-capability.mjs';
import { SiteAuthenticationMode, resolveSiteAuthentication } from '../plugins/life-agent/server/site/site-authentication-resolver.mjs';

const linkedGoogle = createExternalIdentityLink({
  provider: 'GOOGLE',
  stableProviderSubject: 'provider-subject-1',
  displayName: 'TJ',
  emailHint: 'tj@example.test',
  linkedAt: 100,
});
assert.deepEqual(Object.keys(linkedGoogle).sort(), ['displayName', 'emailHint', 'linkedAt', 'provider', 'stableProviderSubject'].sort());
assert.throws(() => createExternalIdentityLink({ provider: 'GOOGLE', stableProviderSubject: 'x', refreshToken: 'forbidden' }), /may not contain refreshToken/);

const majorSso = createSiteAuthCapability({
  origin: 'https://booking.example/login',
  identityProviders: ['APPLE', 'MICROSOFT', 'GOOGLE'],
  passwordFallback: true,
  verification: 'VERIFIED',
  lastVerifiedAt: 100,
});
const linkedRoute = resolveSiteAuthentication({ siteCapability: majorSso, linkedIdentities: [linkedGoogle] });
assert.equal(linkedRoute.mode, SiteAuthenticationMode.SSO_LINKED);
assert.equal(linkedRoute.identityProvider, 'GOOGLE');
assert.equal(linkedRoute.passwordRequiredByLifeAgent, false);

const unlinkedRoute = resolveSiteAuthentication({ siteCapability: majorSso, linkedIdentities: [] });
assert.equal(unlinkedRoute.mode, SiteAuthenticationMode.SSO_AVAILABLE);
assert.equal(unlinkedRoute.identityProvider, 'MICROSOFT');

const passwordOnly = createSiteAuthCapability({ origin: 'https://legacy.example', identityProviders: [], passwordFallback: true, verification: 'OBSERVED' });
const passwordRoute = resolveSiteAuthentication({ siteCapability: passwordOnly, linkedIdentities: [] });
assert.equal(passwordRoute.mode, SiteAuthenticationMode.USER_PASSWORD_HANDOFF);
assert.equal(passwordRoute.passwordRequiredByLifeAgent, false);

const serialized = JSON.stringify({ linkedGoogle, majorSso, linkedRoute });
for (const forbidden of ['accessToken', 'refreshToken', 'sessionToken', 'cookies', 'browserProfile', 'localStorage']) {
  assert.equal(serialized.includes(forbidden), false);
}

console.log('Life Agent site authentication capability tests passed.');
