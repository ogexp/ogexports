import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeDepositRequests, resolveActivityTransactionTarget } from './deposit-activity.ts';

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

test('repeated copies of one wallet record appear once while retaining its latest supplied version', () => {
  const merged = mergeDepositRequests([
    { id: 81000101, type: 'deposit', reference: 'OGDEP-101', status: 'pending' },
    { id: '81000101', type: 'deposit', reference: 'OGDEP-101', status: 'completed' },
  ], []);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'completed');
});

test('empty meta cannot hide the related deposit ID present in metadata', () => {
  const transaction = { id: 81000102, type: 'deposit', meta: {}, metadata: { deposit_id: 81000103 } };
  assert.equal(mergeDepositRequests([transaction], [{ id: 81000103, status: 'approved' }]).length, 1);
  assert.deepEqual(resolveActivityTransactionTarget(transaction), { id: '81000103', kind: 'deposit' });
});

test('a request already supplied in activity is not repeated beside its linked wallet posting', () => {
  const merged = mergeDepositRequests([
    { id: 81000104, activity_source: 'deposit_request', status: 'pending' },
    { id: 81000105, type: 'deposit', meta: { deposit_id: 81000104 }, status: 'completed' },
  ], [{ id: 81000104, status: 'approved' }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 81000105);
});

test('the fresh request status takes precedence over a stale request-shaped activity row', () => {
  const merged = mergeDepositRequests([
    { id: 81000106, activity_source: 'deposit_request', status: 'pending' },
  ], [{ id: 81000106, status: 'rejected' }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'rejected');
});

test('two real deposits never collapse merely because their amount or bank reference is equal', () => {
  const merged = mergeDepositRequests([], [
    { id: 81000107, reference: 'OGDEP-107', bank_reference: 'SHARED', amount: 250 },
    { id: 81000108, reference: 'OGDEP-108', bank_reference: 'SHARED', amount: 250 },
  ]);
  assert.equal(merged.length, 2);
});

test('distinct actual ledger postings stay visible even when they relate to the same deposit', () => {
  const merged = mergeDepositRequests([
    { id: 81000109, type: 'deposit', reference: 'OGDEP-110', meta: { deposit_id: 81000110 } },
    { id: 81000111, type: 'deposit', reference: 'OGDEP-110', meta: { deposit_id: 81000110 } },
  ], [{ id: 81000110, reference: 'OGDEP-110' }]);
  assert.deepEqual(merged.map(item => item.id), [81000109, 81000111]);
});
