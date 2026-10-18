import test from 'node:test';
import assert from 'node:assert/strict';
import { hasVerifiedStatus, isVerifiedStatus, normalizeInvestorKycStatus } from './kyc-status.ts';

test('unverified and explicitly not-verified statuses never pass the deposit gate', () => {
  for (const status of ['unverified', 'not_verified', 'not verified yet', 'not_approved']) {
    assert.notEqual(normalizeInvestorKycStatus(status), 'Verified', `${status} must not normalize to Verified`);
    assert.equal(isVerifiedStatus(status), false, `${status} must keep deposits locked`);
  }
});

test('deposit gate accepts an explicit verified KYC or profile verification status', () => {
  for (const status of ['verified', 'approved', 'passed', 'identity_verified']) {
    assert.equal(isVerifiedStatus(status), true, `${status} should be recognized as verified`);
  }
  assert.equal(hasVerifiedStatus(['under_review', 'verified']), true);
  assert.equal(hasVerifiedStatus(['unverified', 'not approved']), false);
});

test('a missing or in-progress status remains blocked', () => {
  assert.equal(isVerifiedStatus(''), false);
  assert.equal(isVerifiedStatus('in_progress'), false);
});
