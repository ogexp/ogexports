import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeDepositRequests, resolveActivityTransactionTarget } from './deposit-activity.ts';
import { latestRecords } from './latest-records.ts';

const walletSource = readFileSync(new URL('../app/(tabs)/wallet.tsx', import.meta.url), 'utf8');
const recent = (ledger, deposits) =>
  latestRecords(mergeDepositRequests(ledger, deposits), ['created_at', 'date', 'submitted_at'], 5);
const row = (id, type, day, fields = {}) => ({
  id, type, created_at: `2026-11-${String(day).padStart(2, '0')}T12:00:00Z`, ...fields,
});

test('Wallet combines unposted pending deposits with every ledger category before selecting five newest entries', () => {
  const ledger = [
    row(81000001, 'deposit', 1),
    row(81000002, 'investment', 9),
    row(81000003, 'withdrawal', 10),
    row(81000004, 'profit', 11),
    row(81000005, 'bonus', 12),
    row(81000006, 'deposit', 4),
  ];
  const deposits = [row(81000007, 'deposit', 14, { status: 'pending', amount: 250, currency: 'USD' })];
  const before = structuredClone({ ledger, deposits });
  const result = recent(ledger, deposits);
  assert.deepEqual(result.map(item => item.id), [81000007, 81000005, 81000004, 81000003, 81000002]);
  assert.equal(result[0].status, 'pending');
  assert.equal(result[0].amount, 250);
  assert.deepEqual(resolveActivityTransactionTarget(result[0]), { id: '81000007', kind: 'deposit' });
  assert.deepEqual({ ledger, deposits }, before, 'server records and balance data are never mutated');
});

test('posting an approved deposit never creates a duplicate preview row', () => {
  for (const link of [
    { reference: 'OGDEP-080' },
    { meta: { deposit_id: 81000080 } },
    { metadata: { depositId: '81000080' } },
  ]) {
    const result = recent(
      [row(81000081, 'deposit', 15, { ...link, status: 'completed' })],
      [row(81000080, 'deposit', 14, { reference: 'ogdep-080', status: 'approved' })],
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'completed');
  }
});

test('a ledger primary ID is never mistaken for an unrelated deposit request ID', () => {
  const result = recent(
    [row(81000090, 'deposit', 10, { reference: 'OGDEP-OTHER' })],
    [row(81000090, 'deposit', 14, { reference: 'OGDEP-NEW', status: 'pending' })],
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].reference, 'OGDEP-NEW');
});

test('fewer than five, pending-only, rejected and cancelled records stay real and visible', () => {
  const deposits = [
    row(81000012, 'deposit', 12, { status: 'pending' }),
    row(81000013, 'deposit', 13, { status: 'rejected' }),
    row(81000014, 'deposit', 14, { status: 'cancelled' }),
  ];
  assert.equal(recent([], []).length, 0);
  assert.deepEqual(recent([], deposits).map(item => item.status), ['cancelled', 'rejected', 'pending']);
});

test('deposit category previews can include older deposits without showing more than five', () => {
  const ledger = Array.from({ length: 8 }, (_, index) => row(81000100 + index, 'profit', 14));
  const deposits = Array.from({ length: 7 }, (_, index) => row(81000200 + index, 'deposit', index + 1, { status: 'pending' }));
  const merged = mergeDepositRequests(ledger, deposits);
  const selected = latestRecords(merged.filter(item => item.type === 'deposit'), ['created_at', 'date', 'submitted_at'], 5);
  assert.deepEqual(selected.map(item => item.id), [81000206, 81000205, 81000204, 81000203, 81000202]);
});

test('Wallet wires the merged sources, filtering and five-record limit to source-correct details', () => {
  assert.match(walletSource, /const recentLimit = 5;/);
  assert.match(walletSource, /mergeDepositRequests\(list\(transactions\.data\), list\(deposits\.data\)\)/);
  assert.match(walletSource, /ledger\.filter\(item => categoryFor\(item\) === category\)/);
  assert.match(walletSource, /latestRecords\(filteredLedger, \['created_at', 'date', 'submitted_at'\], recentLimit\)/);
  assert.match(walletSource, /resolveActivityTransactionTarget\(item\)/);
  assert.match(walletSource, /pathname: '\/account\/transaction\/\[id\]', params: target/);
  assert.match(walletSource, /title="View All Transactions"/);
});

test('focus and manual refresh include both sources, and a failed source never becomes a false empty state', () => {
  for (const source of ['wallet', 'dashboard', 'transactions', 'deposits']) {
    assert.ok(walletSource.includes(`${source}.refetch({ cancelRefetch: false })`));
  }
  assert.match(walletSource, /useFocusEffect[\s\S]*?void refreshWallet\(\)/);
  assert.match(walletSource, /onPress=\{\(\) => void refreshWallet\(\)\}/);
  assert.match(walletSource, /activityLoading = transactions\.isLoading \|\| deposits\.isLoading/);
  assert.match(walletSource, /activityError = transactions\.isError \|\| deposits\.isError/);
  assert.match(walletSource, /!activityLoading && !activityError && visibleTransactions\.length === 0/);
  assert.match(walletSource, /deposits\.isError \? <ErrorState/);
});

test('pending deposit total uses the full dashboard summary, never the preview sum or available balance', () => {
  assert.match(walletSource, /pendingDeposits = amount\(record\(unwrap\(dashboard\.data\)\.summary\), \['pending_deposits_amount', 'pending_deposits'\]\)/);
  assert.match(walletSource, /balanceLabel\(pendingDeposits, currency, dashboard\.isLoading, dashboard\.isError\)/);
  assert.match(walletSource, /available = availableBalanceFromDashboard\(dashboard\.data\)/);
  assert.match(walletSource, /withdrawable = available;/);
  assert.match(walletSource, /params: \{ tab: 'Deposits', status: 'pending' \}/);
  assert.match(walletSource, /Not included in your available balance/);
});
