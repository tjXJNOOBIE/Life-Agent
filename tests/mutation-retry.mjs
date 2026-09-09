import assert from 'node:assert/strict';
import { MutationRetryDecision, MutationVerificationState, decideMutationRetry } from '../plugins/life-agent/server/execution/mutation-retry.mjs';

assert.equal(decideMutationRetry({ attempted: false }).decision, MutationRetryDecision.EXECUTE);
assert.equal(decideMutationRetry({ attempted: true, verificationState: MutationVerificationState.CONFIRMED_SUCCESS }).decision, MutationRetryDecision.DO_NOT_RETRY);
assert.equal(decideMutationRetry({ attempted: true, verificationState: MutationVerificationState.CONFIRMED_NOT_APPLIED }).decision, MutationRetryDecision.RETRY_ALLOWED);
assert.equal(decideMutationRetry({ attempted: true, verificationState: MutationVerificationState.UNKNOWN }).decision, MutationRetryDecision.VERIFY_BEFORE_RETRY);
assert.equal(decideMutationRetry({ attempted: true, verificationState: MutationVerificationState.PARTIAL }).decision, MutationRetryDecision.VERIFY_BEFORE_RETRY);
assert.equal(decideMutationRetry({ attempted: true, verificationState: MutationVerificationState.MATERIAL_CHANGE }).decision, MutationRetryDecision.USER_REVIEW_REQUIRED);

console.log('Life Agent mutation retry verification tests passed.');
