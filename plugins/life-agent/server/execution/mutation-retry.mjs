export const MutationVerificationState = Object.freeze({
  CONFIRMED_SUCCESS: 'CONFIRMED_SUCCESS',
  CONFIRMED_NOT_APPLIED: 'CONFIRMED_NOT_APPLIED',
  PARTIAL: 'PARTIAL',
  UNKNOWN: 'UNKNOWN',
  MATERIAL_CHANGE: 'MATERIAL_CHANGE',
});

export const MutationRetryDecision = Object.freeze({
  EXECUTE: 'EXECUTE',
  DO_NOT_RETRY: 'DO_NOT_RETRY',
  RETRY_ALLOWED: 'RETRY_ALLOWED',
  VERIFY_BEFORE_RETRY: 'VERIFY_BEFORE_RETRY',
  USER_REVIEW_REQUIRED: 'USER_REVIEW_REQUIRED',
});

export function decideMutationRetry({ attempted = false, verificationState = MutationVerificationState.UNKNOWN } = {}) {
  if (!attempted) return { decision: MutationRetryDecision.EXECUTE, reason: 'not-attempted' };
  switch (verificationState) {
    case MutationVerificationState.CONFIRMED_SUCCESS:
      return { decision: MutationRetryDecision.DO_NOT_RETRY, reason: 'authoritative-success' };
    case MutationVerificationState.CONFIRMED_NOT_APPLIED:
      return { decision: MutationRetryDecision.RETRY_ALLOWED, reason: 'authoritative-non-application' };
    case MutationVerificationState.MATERIAL_CHANGE:
      return { decision: MutationRetryDecision.USER_REVIEW_REQUIRED, reason: 'conditions-changed' };
    case MutationVerificationState.PARTIAL:
    case MutationVerificationState.UNKNOWN:
      return { decision: MutationRetryDecision.VERIFY_BEFORE_RETRY, reason: 'duplicate-risk' };
    default:
      throw new Error(`unsupported verification state: ${verificationState}`);
  }
}
