import { AuthLease } from './auth-lease.mjs';

export const BrowserRuntimeState = Object.freeze({
  ACTIVE: 'ACTIVE',
  DESTROYING: 'DESTROYING',
  DESTROYED: 'DESTROYED',
  TEARDOWN_FAILED: 'TEARDOWN_FAILED',
});

export class TaskBrowserRuntime {
  #leases = new Map();
  #state = BrowserRuntimeState.ACTIVE;
  #destroyReason = null;
  #destroyedLeaseCount = 0;

  constructor({ taskId, browserRuntimeId, adapter, createdAt = Date.now() }) {
    if (!taskId || !browserRuntimeId) throw new Error('taskId and browserRuntimeId are required');
    if (!adapter || typeof adapter.teardown !== 'function') throw new Error('browser runtime adapter with teardown is required');
    this.taskId = String(taskId);
    this.browserRuntimeId = String(browserRuntimeId);
    this.createdAt = createdAt;
    this.adapter = adapter;
  }

  get state() {
    return this.#state;
  }

  createAuthLease({ origin, identityProvider, expiresAt, now = Date.now() }) {
    if (this.#state !== BrowserRuntimeState.ACTIVE) throw new Error(`browser runtime is ${this.#state.toLowerCase()}`);
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

  async destroy({ reason = 'root-task-complete', now = Date.now() } = {}) {
    if (this.#state === BrowserRuntimeState.DESTROYED) return this.snapshot(now);
    if (this.#state === BrowserRuntimeState.DESTROYING) throw new Error('browser runtime teardown is already in progress');

    this.#state = BrowserRuntimeState.DESTROYING;
    for (const lease of this.#leases.values()) lease.destroy(now);
    this.#destroyedLeaseCount = this.#leases.size;
    this.#leases.clear();
    this.#destroyReason = String(reason);

    try {
      await this.adapter.teardown({
        taskId: this.taskId,
        browserRuntimeId: this.browserRuntimeId,
        reason: this.#destroyReason,
      });
      this.#state = BrowserRuntimeState.DESTROYED;
      return this.snapshot(now);
    } catch (error) {
      this.#state = BrowserRuntimeState.TEARDOWN_FAILED;
      throw new Error(`browser runtime teardown failed: ${error?.message || error}`);
    }
  }

  snapshot(now = Date.now()) {
    return Object.freeze({
      taskId: this.taskId,
      browserRuntimeId: this.browserRuntimeId,
      createdAt: this.createdAt,
      state: this.#state,
      destroyReason: this.#destroyReason,
      destroyedLeaseCount: this.#destroyedLeaseCount,
      authLeases: Object.freeze([...this.#leases.values()].map(lease => lease.snapshot(now))),
      reusableSessionMaterialRetained: false,
    });
  }
}
