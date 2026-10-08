import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTransactionPaymentMethod } from './transaction-payment-method.ts';

test('direct withdrawal details preserve an explicit API payment method', () => {
  assert.equal(
    resolveTransactionPaymentMethod([{ payment_method: 'Wire Transfer' }], true),
    'Wire Transfer',
  );
});

test('direct withdrawal details use Bank Transfer when payment method is missing or blank', () => {
  assert.equal(resolveTransactionPaymentMethod([{ amount: 100 }], true), 'Bank Transfer');
  assert.equal(resolveTransactionPaymentMethod([{ payment_method: '' }], true), 'Bank Transfer');
  assert.equal(resolveTransactionPaymentMethod([{ method: '   ' }], true), 'Bank Transfer');
});

test('wallet-ledger withdrawal details preserve explicit methods in the record or metadata', () => {
  assert.equal(
    resolveTransactionPaymentMethod([{ type: 'withdrawal', method: 'bank_transfer' }, {}], true),
    'bank_transfer',
  );
  assert.equal(
    resolveTransactionPaymentMethod([{ type: 'withdrawal' }, { payment_method: 'Wise' }], true),
    'Wise',
  );
});

test('wallet-ledger withdrawal details default when payment methods are missing or blank', () => {
  assert.equal(
    resolveTransactionPaymentMethod([{ type: 'withdrawal' }, { payment_method: '' }], true),
    'Bank Transfer',
  );
  assert.equal(
    resolveTransactionPaymentMethod([{ type: 'payout' }, { method: '  ' }], true),
    'Bank Transfer',
  );
});
