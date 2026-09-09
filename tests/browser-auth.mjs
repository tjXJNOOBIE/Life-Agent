import assert from 'node:assert/strict';
import { AuthLeaseState } from '../plugins/life-agent/server/browser/auth-lease.mjs';
import { BrowserRuntimeState, TaskBrowserRuntime } from '../plugins/life-agent/server/browser/task-browser-runtime.mjs';
import { runWithTaskBrowserRuntime } from '../plugins/life-agent/server/browser/task-browser-scope.mjs';

const teardownEvents = [];
const runtime = new TaskBrowserRuntime({
  taskId: 'trip-1',
  browserRuntimeId: 'browser-1',
  createdAt: 100,
  adapter: { teardown: async event => teardownEvents.push(event) },
});
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

const destroyed = await runtime.destroy({ reason: 'root-task-complete', now: 200 });
assert.equal(destroyed.state, BrowserRuntimeState.DESTROYED);
assert.equal(destroyed.authLeases.length, 0);
assert.equal(destroyed.destroyedLeaseCount, 1);
assert.equal(destroyed.reusableSessionMaterialRetained, false);
assert.equal(teardownEvents.length, 1);
assert.equal(teardownEvents[0].reason, 'root-task-complete');
assert.throws(() => runtime.createAuthLease({ origin: 'https://other.example', identityProvider: 'MICROSOFT', expiresAt: 500, now: 250 }), /destroyed/);

const expiringRuntime = new TaskBrowserRuntime({
  taskId: 'task-2',
  browserRuntimeId: 'browser-2',
  createdAt: 0,
  adapter: { teardown: async () => {} },
});
const expiring = expiringRuntime.createAuthLease({ origin: 'https://example.com', identityProvider: 'GITHUB', expiresAt: 10, now: 0 });
expiring.beginAuthentication(1);
expiring.markAuthenticated(2);
assert.equal(expiring.isAuthenticatedFor({ taskId: 'task-2', browserRuntimeId: 'browser-2', origin: 'https://example.com', identityProvider: 'GITHUB', now: 11 }), false);
assert.equal(expiring.state, AuthLeaseState.EXPIRED);
await expiringRuntime.destroy({ reason: 'test-cleanup', now: 12 });

let scopedTeardown = 0;
const scoped = new TaskBrowserRuntime({
  taskId: 'task-3',
  browserRuntimeId: 'browser-3',
  adapter: { teardown: async () => { scopedTeardown += 1; } },
});
assert.equal(await runWithTaskBrowserRuntime(scoped, async () => 'done'), 'done');
assert.equal(scopedTeardown, 1);
assert.equal(scoped.state, BrowserRuntimeState.DESTROYED);

let failureTeardown = 0;
const failed = new TaskBrowserRuntime({
  taskId: 'task-4',
  browserRuntimeId: 'browser-4',
  adapter: { teardown: async () => { failureTeardown += 1; } },
});
await assert.rejects(() => runWithTaskBrowserRuntime(failed, async () => { throw new Error('operation failed'); }), /operation failed/);
assert.equal(failureTeardown, 1);
assert.equal(failed.state, BrowserRuntimeState.DESTROYED);

console.log('Life Agent task-scoped browser auth tests passed.');
