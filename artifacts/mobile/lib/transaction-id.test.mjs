import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTransactionDisplayId } from './transaction-id.ts';

test('prefers the wallet transaction ID', () => {
  assert.equal(resolveTransactionDisplayId('  TX-204  ', 'deposit-18', 'DEP-204'), 'TX-204');
});

test('falls back to the server record ID and then its reference', () => {
  assert.equal(resolveTransactionDisplayId('', 18, 'DEP-204'), '18');
  assert.equal(resolveTransactionDisplayId('', '', 'DEP-204'), 'DEP-204');
});

test('shows an explicit placeholder when OG Exports supplied no identifier', () => {
  assert.equal(resolveTransactionDisplayId('', null, undefined), '—');
  assert.equal(resolveTransactionDisplayId('', null, undefined, 'Unavailable'), 'Unavailable');
});
