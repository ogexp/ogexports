import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { investmentTransactionTarget } from './transaction-detail-route.ts';

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

test('transaction history and detail screen use the investor investment endpoint', () => {
  const history = readFileSync(new URL('../app/account/transactions.tsx', import.meta.url), 'utf8');
  const detail = readFileSync(new URL('../app/account/transaction/[id].tsx', import.meta.url), 'utf8');

  assert.match(history, /investmentTransactionTarget\(row\.detailId, row\.transactionId\)/);
  assert.match(history, /params: \{ \.\.\.target, page: String\(page\) \}/);
  assert.match(detail, /useGetInvestorInvestment/);
  assert.match(detail, /kind === 'investment'/);
});
