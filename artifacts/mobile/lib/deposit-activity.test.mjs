import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeDepositRequests } from './deposit-activity.ts';

test('adds pending deposit requests as recent deposit activity with their review status', () => {
  const merged = mergeDepositRequests([], [{
    id: 52,
    amount: 1250,
    currency: 'USD',
    created_at: '2026-10-06T12:00:00Z',
    review_status: 'pending',
    reference: 'OGDEP-052',
  }]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 52);
  assert.equal(merged[0].type, 'deposit');
  assert.equal(merged[0].status, 'pending');
  assert.equal(merged[0].activity_source, 'deposit_request');
});

test('does not repeat a deposit already included in dashboard activity by reference or deposit ID', () => {
  const merged = mergeDepositRequests([
    { id: 'wallet-txn-8', type: 'deposit', reference: 'OGDEP-008' },
    { id: 'wallet-txn-9', type: 'wallet_credit', meta: { deposit_id: 9 } },
  ], [
    { id: 8, reference: 'ogdep-008', status: 'pending' },
    { id: 9, status: 'approved' },
    { id: 10, reference: 'OGDEP-010', status: 'pending' },
  ]);

  assert.deepEqual(merged.map(item => item.id), ['wallet-txn-8', 'wallet-txn-9', 10]);
});

test('does not duplicate repeated deposit requests in the deposits response', () => {
  const repeatedDeposit = { id: 12, reference: 'OGDEP-012', status: 'pending' };

  const merged = mergeDepositRequests([], [repeatedDeposit, { ...repeatedDeposit }]);

  assert.equal(merged.length, 1);
});
