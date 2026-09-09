import assert from 'node:assert/strict';
import { AuthLeaseState } from '../plugins/life-agent/server/browser/auth-lease.mjs';
import { BrowserRuntimeState, TaskBrowserRuntime } from '../plugins/life-agent/server/browser/task-browser-runtime.mjs';

const runtime = new TaskBrowserRuntime({ taskId: 'trip-1', browserRuntimeId: 'browser-1', createdAt: 100 });
const lease = runtime.createAuthLease({ origin: 'https://booking.example/path', identityProvider: 'google', expiresAt: 1_000, now: 100 });
assert.equal(lease.state, AuthLeaseState.AUTH_REQUIRED);
lease.beginAuthentication(110);
lease.markAuthenticated(120);
assert.equal(lease.isAuthenticatedFor({ taskId: 'trip-1', browserRuntimeId: 'browser-1', origin: 'https://booking.example', identityProvider: 'GOOGLE', now: 130 }), true);
assert.equal(lease.isAuthenticatedFor({ taskId: 'other-task', browserRuntimeId: 'browser-1', origin: 'https://booking.example', identityProvider: 'GOOGLE', now: 130 }), false);

const snapshotBefore = JSON.stringify(runtime.snapshot(130));
for (const forbidden of ['cookie', 'accessToken', 'refreshToken', 'password', 'localStorage', 'indexedDB']) {
  assert.equal(snapshotBefore.includes(forbidden), false);
}

const destroyed = runtime.destroy({ reason: 'root-task-complete', now: 200 });
assert.equal(destroyed.state, BrowserRuntimeState.DESTROYED);
assert.equal(destroyed.authLeases[0].state, AuthLeaseState.DESTROYED);
assert.equal(destroyed.reusableSessionMaterialRetained, false);
assert.throws(() => runtime.createAuthLease({ origin: 'https://other.example', identityProvider: 'MICROSOFT', expiresAt: 500, now: 250 }), /destroyed/);

const expiringRuntime = new TaskBrowserRuntime({ taskId: 'task-2', browserRuntimeId: 'browser-2', createdAt: 0 });
const expiring = expiringRuntime.createAuthLease({ origin: 'https://example.com', identityProvider: 'GITHUB', expiresAt: 10, now: 0 });
expiring.beginAuthentication(1);
expiring.markAuthenticated(2);
assert.equal(expiring.isAuthenticatedFor({ taskId: 'task-2', browserRuntimeId: 'browser-2', origin: 'https://example.com', identityProvider: 'GITHUB', now: 11 }), false);
assert.equal(expiring.state, AuthLeaseState.EXPIRED);

console.log('Life Agent task-scoped browser auth tests passed.');
