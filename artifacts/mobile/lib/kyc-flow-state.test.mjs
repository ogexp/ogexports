import assert from 'node:assert/strict';
import test from 'node:test';
import { getInvestorKycFlowState } from './kyc-flow-state.ts';

test('pending review does not lock an incomplete application', () => {
  assert.deepEqual(getInvestorKycFlowState('Under Review', true, false), {
    isReadOnly: false,
    progressStep: 2,
    resumeStep: 2,
  });
});

test('the flow resumes at supporting documents after identity documents are present', () => {
  assert.deepEqual(getInvestorKycFlowState('Under Review', true, true), {
    isReadOnly: false,
    progressStep: 3,
    resumeStep: 3,
  });
});

test('rejected applications remain editable at the server-reported progress', () => {
  assert.deepEqual(getInvestorKycFlowState('Rejected', true, false), {
    isReadOnly: false,
    progressStep: 2,
    resumeStep: 2,
  });
});

test('only a server-confirmed verified status makes the flow read-only', () => {
  assert.deepEqual(getInvestorKycFlowState('Verified', false, false), {
    isReadOnly: true,
    progressStep: 4,
    resumeStep: 3,
  });
});
