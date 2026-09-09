import assert from 'node:assert/strict';
import { TaskBrowserRuntime } from '../plugins/life-agent/server/browser/task-browser-runtime.mjs';
import { BrowserApprovalDecision, evaluateBrowserApproval } from '../plugins/life-agent/server/approval/browser-approval-policy.mjs';

const runtime = new TaskBrowserRuntime({ taskId: 'trip-1', browserRuntimeId: 'browser-1', createdAt: 0 });
const lease = runtime.createAuthLease({ origin: 'https://booking.example', identityProvider: 'GOOGLE', expiresAt: 1_000, now: 0 });
lease.beginAuthentication(1);
lease.markAuthenticated(2);

const policy = {
  origin: 'https://booking.example',
  actionFamilies: ['RESERVATION_CHANGE'],
  identityProvider: 'GOOGLE',
  constraints: { maxFinancialImpact: 100 },
  approvalMode: 'AUTO_APPROVE',
};
const action = {
  taskId: 'trip-1', browserRuntimeId: 'browser-1', origin: 'https://booking.example', identityProvider: 'GOOGLE',
  actionFamily: 'RESERVATION_CHANGE', financialImpact: 80,
};
assert.equal(evaluateBrowserApproval({ policy, action, authLease: lease, now: 10 }).decision, BrowserApprovalDecision.AUTO_APPROVED);
assert.equal(evaluateBrowserApproval({ policy, action: { ...action, financialImpact: 101 }, authLease: lease, now: 10 }).decision, BrowserApprovalDecision.APPROVAL_REQUIRED);
assert.equal(evaluateBrowserApproval({ policy, action: { ...action, transactionAmountChanged: true }, authLease: lease, now: 10 }).decision, BrowserApprovalDecision.APPROVAL_REQUIRED);
assert.equal(evaluateBrowserApproval({ policy, action: { ...action, actionFamily: 'MFA_CHALLENGE' }, authLease: lease, now: 10 }).decision, BrowserApprovalDecision.NON_DELEGABLE_HANDOFF);
assert.equal(evaluateBrowserApproval({ policy, action, authLease: null, now: 10 }).decision, BrowserApprovalDecision.AUTHENTICATION_REQUIRED);

console.log('Life Agent deterministic browser approval tests passed.');
