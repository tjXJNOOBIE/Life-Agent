import { normalizeIdentityProvider } from '../auth/identity-provider.mjs';

export const AuthLeaseState = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTHENTICATING: 'AUTHENTICATING',
  AUTHENTICATED: 'AUTHENTICATED',
  EXPIRED: 'EXPIRED',
  DESTROYED: 'DESTROYED',
});

function normalizeOrigin(value) {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'https:') throw new Error('auth lease origin must use https');
  if (parsed.username || parsed.password) throw new Error('auth lease origin may not contain credentials');
  return parsed.origin;
}

export class AuthLease {
  #state = AuthLeaseState.AUTH_REQUIRED;

  constructor({ taskId, browserRuntimeId, origin, identityProvider, createdAt = Date.now(), expiresAt }) {
    if (!taskId || !browserRuntimeId) throw new Error('taskId and browserRuntimeId are required');
    if (!Number.isFinite(createdAt)) throw new Error('createdAt must be finite');
    if (!Number.isFinite(expiresAt) || expiresAt <= createdAt) throw new Error('expiresAt must be after createdAt');
    this.taskId = String(taskId);
    this.browserRuntimeId = String(browserRuntimeId);
    this.origin = normalizeOrigin(origin);
    this.identityProvider = normalizeIdentityProvider(identityProvider);
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  get state() {
    return this.#state;
  }

  #refreshExpiry(now) {
    if (this.#state !== AuthLeaseState.DESTROYED && this.#state !== AuthLeaseState.EXPIRED && now >= this.expiresAt) {
      this.#state = AuthLeaseState.EXPIRED;
    }
  }

  beginAuthentication(now = Date.now()) {
    this.#refreshExpiry(now);
    if (this.#state !== AuthLeaseState.AUTH_REQUIRED) throw new Error(`cannot authenticate from ${this.#state}`);
    this.#state = AuthLeaseState.AUTHENTICATING;
    return this.snapshot(now);
  }

  markAuthenticated(now = Date.now()) {
    this.#refreshExpiry(now);
    if (this.#state !== AuthLeaseState.AUTHENTICATING) throw new Error(`cannot mark authenticated from ${this.#state}`);
    this.#state = AuthLeaseState.AUTHENTICATED;
    return this.snapshot(now);
  }

  expire(now = Date.now()) {
    if (this.#state === AuthLeaseState.DESTROYED) return this.snapshot(now);
    this.#state = AuthLeaseState.EXPIRED;
    return this.snapshot(now);
  }

  destroy(now = Date.now()) {
    this.#state = AuthLeaseState.DESTROYED;
    return this.snapshot(now);
  }

  isAuthenticatedFor({ taskId, browserRuntimeId, origin, identityProvider, now = Date.now() }) {
    this.#refreshExpiry(now);
    if (this.#state !== AuthLeaseState.AUTHENTICATED) return false;
    if (String(taskId) !== this.taskId || String(browserRuntimeId) !== this.browserRuntimeId) return false;
    if (normalizeOrigin(origin) !== this.origin) return false;
    if (identityProvider && normalizeIdentityProvider(identityProvider) !== this.identityProvider) return false;
    return true;
  }

  snapshot(now = Date.now()) {
    this.#refreshExpiry(now);
    return Object.freeze({
      taskId: this.taskId,
      browserRuntimeId: this.browserRuntimeId,
      origin: this.origin,
      identityProvider: this.identityProvider,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      state: this.#state,
    });
  }
}
