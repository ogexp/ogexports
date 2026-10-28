import test from 'node:test';
import assert from 'node:assert/strict';
import { isDepositAwaitingCredit, mergeDepositRequests, resolveActivityTransactionTarget } from './deposit-activity.ts';

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

test('routes a wallet ledger deposit by its wallet transaction ID', () => {
  assert.deepEqual(
    resolveActivityTransactionTarget({ id: 81000001, type: 'deposit' }),
    { id: '81000001', kind: 'wallet' },
  );
});

test('routes a tagged deposit request by its deposit record ID', () => {
  assert.deepEqual(
    resolveActivityTransactionTarget({ id: 81000002, type: 'deposit', activity_source: 'deposit_request' }),
    { id: '81000002', kind: 'deposit' },
  );
});

test('uses explicit related financial IDs and never treats a reference as a record ID', () => {
  assert.deepEqual(
    resolveActivityTransactionTarget({
      id: 81000003,
      type: 'wallet_credit',
      meta: { deposit_id: 81000004 },
    }),
    { id: '81000004', kind: 'deposit' },
  );
  assert.equal(
    resolveActivityTransactionTarget({ type: 'deposit', reference: '20261008' }),
    null,
  );
});

test('keeps review, verified, and approved deposits visible until credit is confirmed', () => {
  for (const status of ['pending', 'under_review', 'verified', 'approved']) {
    assert.equal(isDepositAwaitingCredit({ status }), true, status);
  }
});

test('hides credited and closed deposit requests from the pending wallet section', () => {
  for (const status of ['credited', 'completed', 'settled', 'rejected', 'cancelled']) {
    assert.equal(isDepositAwaitingCredit({ status }), false, status);
  }
});

test('prioritizes a credited server status over a stale review label', () => {
  assert.equal(isDepositAwaitingCredit({
    review_status_label: 'Approved',
    status: 'credited',
  }), false);
  assert.equal(isDepositAwaitingCredit({
    status: 'pending',
    credited_at: '2026-10-28T09:00:00Z',
  }), false);
});
