import { normalizeIdentityProvider } from '../auth/identity-provider.mjs';

export const BrowserApprovalMode = Object.freeze({
  AUTO_APPROVE: 'AUTO_APPROVE',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
});

export const BrowserApprovalDecision = Object.freeze({
  AUTO_APPROVED: 'AUTO_APPROVED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  NON_DELEGABLE_HANDOFF: 'NON_DELEGABLE_HANDOFF',
});

const NON_DELEGABLE = new Set([
  'LINK_EXTERNAL_IDENTITY',
  'GRANT_OAUTH_SCOPE',
  'ENTER_PASSWORD',
  'MFA_CHALLENGE',
  'ACCOUNT_RECOVERY',
  'CHANGE_CORE_SECURITY',
  'ACCEPT_MATERIAL_LEGAL_TERMS',
  'CHANGE_PAYMENT_METHOD',
]);

function normalizeOrigin(value) {
  const parsed = new URL(String(value || ''));
  if (parsed.protocol !== 'https:') throw new Error('approval origin must use https');
  if (parsed.username || parsed.password) throw new Error('approval origin may not contain credentials');
  return parsed.origin;
}

export function normalizeBrowserApprovalPolicy(policy = {}) {
  const mode = String(policy.approvalMode || BrowserApprovalMode.REQUIRE_APPROVAL).toUpperCase();
  if (!Object.hasOwn(BrowserApprovalMode, mode)) throw new Error(`unsupported approval mode: ${mode}`);
  const actionFamilies = [...new Set((policy.actionFamilies || []).map(value => String(value).trim().toUpperCase()).filter(Boolean))];
  return Object.freeze({
    origin: normalizeOrigin(policy.origin),
    target: policy.target == null ? null : String(policy.target).trim(),
    actionFamilies: Object.freeze(actionFamilies),
    identityProvider: policy.identityProvider ? normalizeIdentityProvider(policy.identityProvider) : null,
    constraints: Object.freeze({
      maxFinancialImpact: Number.isFinite(policy.constraints?.maxFinancialImpact) ? Number(policy.constraints.maxFinancialImpact) : null,
      maxPurchaseAmount: Number.isFinite(policy.constraints?.maxPurchaseAmount) ? Number(policy.constraints.maxPurchaseAmount) : null,
    }),
    approvalMode: mode,
  });
}

export function evaluateBrowserApproval({ policy, action, authLease, now = Date.now() }) {
  const actionFamily = String(action?.actionFamily || '').trim().toUpperCase();
  const origin = normalizeOrigin(action?.origin);
  if (NON_DELEGABLE.has(actionFamily) || action?.nonDelegable === true) {
    return { decision: BrowserApprovalDecision.NON_DELEGABLE_HANDOFF, reason: 'non-delegable-boundary' };
  }
  if (action?.materialTermsChanged === true || action?.termsChanged === true || action?.transactionTargetChanged === true || action?.targetChanged === true || action?.transactionAmountChanged === true || action?.purchaseAmountChanged === true || action?.priceChanged === true || action?.routeChanged === true || action?.recipientChanged === true) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'material-condition-changed' };
  }

  const normalizedPolicy = policy ? normalizeBrowserApprovalPolicy(policy) : null;
  const expectedProvider = normalizedPolicy?.identityProvider || action?.identityProvider || null;
  const authenticated = authLease?.isAuthenticatedFor?.({
    taskId: action?.taskId,
    browserRuntimeId: action?.browserRuntimeId,
    origin,
    identityProvider: expectedProvider,
    now,
  }) === true;
  if (!authenticated) {
    return { decision: BrowserApprovalDecision.AUTHENTICATION_REQUIRED, reason: 'task-scoped-auth-required' };
  }

  if (!normalizedPolicy || normalizedPolicy.approvalMode !== BrowserApprovalMode.AUTO_APPROVE) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'no-auto-approval-policy' };
  }
  if (normalizedPolicy.origin !== origin || !normalizedPolicy.actionFamilies.includes(actionFamily)) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'policy-scope-mismatch' };
  }
  if (normalizedPolicy.target !== null && String(action?.target || '') !== normalizedPolicy.target) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'target-scope-mismatch' };
  }
  if (normalizedPolicy.identityProvider && action?.identityProvider && normalizeIdentityProvider(action.identityProvider) !== normalizedPolicy.identityProvider) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'identity-provider-mismatch' };
  }
  const impact = Number.isFinite(action?.financialImpact) ? Number(action.financialImpact) : 0;
  if (normalizedPolicy.constraints.maxFinancialImpact !== null && impact > normalizedPolicy.constraints.maxFinancialImpact) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'financial-limit-exceeded' };
  }
  if (normalizedPolicy.constraints.maxPurchaseAmount !== null && impact > normalizedPolicy.constraints.maxPurchaseAmount) {
    return { decision: BrowserApprovalDecision.APPROVAL_REQUIRED, reason: 'purchase-limit-exceeded' };
  }
  return { decision: BrowserApprovalDecision.AUTO_APPROVED, reason: 'deterministic-policy-match' };
}
