import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { investmentTransactionTarget } from './transaction-detail-route.ts';
import { findCachedTransactionDetail } from './financial-detail-record.ts';

test('investment rows open the investment record rather than a linked wallet posting', () => {
  assert.deepEqual(investmentTransactionTarget('17', '10000035'), {
    id: '17',
    kind: 'investment',
  });
});

test('investment rows use a wallet posting only when no investment ID is available', () => {
  assert.deepEqual(investmentTransactionTarget('', '10000035'), {
    id: '10000035',
    kind: 'wallet',
  });
});

test('invalid investment and wallet IDs do not create a transaction route', () => {
  assert.equal(investmentTransactionTarget('0', 'not-an-id'), null);
});

test('investment detail falls back to the already-loaded position list', () => {
  const investment = { id: 17, amount: 500, project: { title: 'Rice' } };
  assert.equal(findCachedTransactionDetail('investment', '17', {
    investments: [{ id: 5 }, investment],
  }), investment);
});

test('investment return detail falls back to the already-loaded wallet ledger', () => {
  const distribution = { transaction_id: 901, type: 'profit_distribution', amount: 90 };
  assert.equal(findCachedTransactionDetail('wallet', '901', {
    walletTransactions: [{ id: 40 }, distribution],
  }), distribution);
});

test('cached transaction detail does not cross investment and wallet ID namespaces', () => {
  assert.equal(findCachedTransactionDetail('wallet', '17', {
    investments: [{ id: 17, amount: 500 }],
  }), undefined);
  assert.equal(findCachedTransactionDetail('investment', '901', {
    walletTransactions: [{ id: 901, type: 'distribution' }],
  }), undefined);
});

test('transaction history and detail screen use the investor investment endpoint', () => {
  const history = readFileSync(new URL('../app/account/transactions.tsx', import.meta.url), 'utf8');
  const detail = readFileSync(new URL('../app/account/transaction/[id].tsx', import.meta.url), 'utf8');

  assert.match(history, /investmentTransactionTarget\(row\.detailId, row\.transactionId\)/);
  assert.match(history, /params: \{ \.\.\.target, page: String\(page\) \}/);
  assert.match(detail, /useGetInvestorInvestment/);
  assert.match(detail, /kind === 'investment'/);
  assert.match(detail, /getQueriesData\(\{ queryKey: \['investor-wallet-transactions'\] \}\)/);
  assert.match(detail, /getQueriesData\(\{ queryKey: \['investor-positions'\] \}\)/);
  assert.match(detail, /setTimeout\(\(\) => setDetailLoadingTimedOut\(true\), 12_000\)/);
});
