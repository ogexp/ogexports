import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWithdrawalRequest, parseWithdrawalAmount } from './withdrawal-flow.ts';

test('withdrawal amount must be positive and within the server-reported available balance', () => {
  assert.equal(parseWithdrawalAmount('125.50', 200), 125.5);
  assert.equal(parseWithdrawalAmount('200', 200), 200);
  assert.equal(parseWithdrawalAmount('0.01', 200), 0.01);
  assert.equal(parseWithdrawalAmount('0', 200), null);
  assert.equal(parseWithdrawalAmount('200.01', 200), null);
  assert.equal(parseWithdrawalAmount('abc', 200), null);
  assert.equal(parseWithdrawalAmount('25', null), null);
});

test('withdrawal fee is added on top of the requested payout and must fit the available balance', () => {
  assert.equal(parseWithdrawalAmount('100', 102, 2), 100);
  assert.equal(parseWithdrawalAmount('100', 101.99, 2), null);
  assert.equal(parseWithdrawalAmount('100', 102, 2.01), null);
});

test('withdrawal request uses the website bank-details contract and includes purpose only when selected', () => {
  const bankDetails = {
    bank_name: '  Example Bank ',
    account_holder: '  A. Investor ',
    account_number: '  0123456789 ',
    iban: ' PK00EXAMPLE ',
    swift: ' EXAMPLEPK ',
    branch: ' Main ',
  };

  assert.deepEqual(buildWithdrawalRequest(20, ' 123456 ', 'secret-value', bankDetails, true, ' Profit Withdrawal ', ' usd '), {
    amount: 20,
    otp: '123456',
    transaction_password: 'secret-value',
    save_bank_details: true,
    bank_details: {
      bank_name: 'Example Bank',
      account_holder: 'A. Investor',
      account_number: '0123456789',
      iban: 'PK00EXAMPLE',
      swift: 'EXAMPLEPK',
      branch: 'Main',
      purpose: 'Profit Withdrawal',
      currency: 'USD',
    },
    note: 'Profit Withdrawal',
  });

  assert.deepEqual(buildWithdrawalRequest(20, '123456', 'secret-value', bankDetails, false, '', 'EUR'), {
    amount: 20,
    otp: '123456',
    transaction_password: 'secret-value',
    save_bank_details: false,
    bank_details: {
      bank_name: 'Example Bank',
      account_holder: 'A. Investor',
      account_number: '0123456789',
      iban: 'PK00EXAMPLE',
      swift: 'EXAMPLEPK',
      branch: 'Main',
      purpose: '',
      currency: 'EUR',
    },
  });
});
