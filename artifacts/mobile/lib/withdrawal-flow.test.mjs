import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWithdrawalRequest,
  FALLBACK_WITHDRAWAL_FEE_USD,
  FALLBACK_WITHDRAWAL_PROCESSING_TIME,
  maximumWithdrawalPayout,
  parseWithdrawalAmount,
  resolveWithdrawalDisplayTerms,
} from './withdrawal-flow.ts';

test('shows the confirmed policy as display-only when the API omits withdrawal terms', () => {
  const terms = resolveWithdrawalDisplayTerms({
    apiFee: null,
    apiFeeUsd: null,
    apiFeeCurrency: '',
    apiProcessingTime: '',
    walletCurrency: 'USD',
  });

  assert.equal(FALLBACK_WITHDRAWAL_FEE_USD, 2);
  assert.equal(FALLBACK_WITHDRAWAL_PROCESSING_TIME, '1 to 2 working days');
  assert.deepEqual(terms, {
    fee: 2,
    feeUsd: 2,
    feeCurrency: 'USD',
    processingTime: '1 to 2 working days',
    serverConfirmed: false,
  });
});

test('only treats server-returned USD 2 terms as confirmed for a USD wallet', () => {
  const terms = resolveWithdrawalDisplayTerms({
    apiFee: 2,
    apiFeeUsd: 2,
    apiFeeCurrency: 'USD',
    apiProcessingTime: '1 to 2 working days',
    walletCurrency: 'USD',
  });
  const staleTerms = resolveWithdrawalDisplayTerms({
    apiFee: 0,
    apiFeeUsd: 0,
    apiFeeCurrency: 'USD',
    apiProcessingTime: '1 to 2 working days',
    walletCurrency: 'USD',
  });

  assert.equal(terms.serverConfirmed, true);
  assert.equal(staleTerms.serverConfirmed, false);
});

test('maximum payout is the available wallet balance less the fee', () => {
  assert.equal(maximumWithdrawalPayout(1750.33, 2), 1748.33);
  assert.equal(maximumWithdrawalPayout(1.5, 2), 0);
  assert.equal(maximumWithdrawalPayout(1750.33, null), null);
});

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
