import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWithdrawalRequest, parseWithdrawalAmount } from './withdrawal-flow.ts';

test('withdrawal amount must be at least one and within the server-reported available balance', () => {
  assert.equal(parseWithdrawalAmount('125.50', 200), 125.5);
  assert.equal(parseWithdrawalAmount('200', 200), 200);
  assert.equal(parseWithdrawalAmount('0.99', 200), null);
  assert.equal(parseWithdrawalAmount('200.01', 200), null);
  assert.equal(parseWithdrawalAmount('abc', 200), null);
  assert.equal(parseWithdrawalAmount('25', null), null);
});

test('withdrawal request uses the verified bank account ID and only includes a purpose when selected', () => {
  assert.deepEqual(buildWithdrawalRequest(20, ' 123456 ', 'secret-value', 'bank-7', ' Profit Withdrawal '), {
    amount: 20,
    otp: '123456',
    transaction_password: 'secret-value',
    bank_account_id: 'bank-7',
    note: 'Profit Withdrawal',
  });

  assert.deepEqual(buildWithdrawalRequest(20, '123456', 'secret-value', 'bank-7', ''), {
    amount: 20,
    otp: '123456',
    transaction_password: 'secret-value',
    bank_account_id: 'bank-7',
  });
});
