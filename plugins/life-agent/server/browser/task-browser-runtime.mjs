import { AuthLease } from './auth-lease.mjs';

export const BrowserRuntimeState = Object.freeze({
  ACTIVE: 'ACTIVE',
  DESTROYED: 'DESTROYED',
});

export class TaskBrowserRuntime {
  #leases = new Map();
  #state = BrowserRuntimeState.ACTIVE;
  #destroyReason = null;

  constructor({ taskId, browserRuntimeId, createdAt = Date.now() }) {
    if (!taskId || !browserRuntimeId) throw new Error('taskId and browserRuntimeId are required');
    this.taskId = String(taskId);
    this.browserRuntimeId = String(browserRuntimeId);
    this.createdAt = createdAt;
  }

  get state() {
    return this.#state;
  }

  createAuthLease({ origin, identityProvider, expiresAt, now = Date.now() }) {
    if (this.#state !== BrowserRuntimeState.ACTIVE) throw new Error('browser runtime is destroyed');
    const lease = new AuthLease({
      taskId: this.taskId,
      browserRuntimeId: this.browserRuntimeId,
      origin,
      identityProvider,
      createdAt: now,
      expiresAt,
    });
    const key = `${lease.origin}|${lease.identityProvider}`;
    const previous = this.#leases.get(key);
    if (previous) previous.destroy(now);
    this.#leases.set(key, lease);
    return lease;
  }

  findAuthLease({ origin, identityProvider }) {
    if (this.#state !== BrowserRuntimeState.ACTIVE) return null;
    const normalizedOrigin = new URL(String(origin || '')).origin;
    const provider = String(identityProvider || '').trim().toUpperCase();
    return this.#leases.get(`${normalizedOrigin}|${provider}`) || null;
  }

  destroy({ reason = 'root-task-complete', now = Date.now() } = {}) {
    if (this.#state === BrowserRuntimeState.DESTROYED) return this.snapshot(now);
    for (const lease of this.#leases.values()) lease.destroy(now);
    this.#state = BrowserRuntimeState.DESTROYED;
    this.#destroyReason = String(reason);
    return this.snapshot(now);
  }

  snapshot(now = Date.now()) {
    return Object.freeze({
      taskId: this.taskId,
      browserRuntimeId: this.browserRuntimeId,
      createdAt: this.createdAt,
      state: this.#state,
      destroyReason: this.#destroyReason,
      authLeases: Object.freeze([...this.#leases.values()].map(lease => lease.snapshot(now))),
      reusableSessionMaterialRetained: false,
    });
  }
}
