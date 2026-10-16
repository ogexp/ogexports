import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWithdrawalRequest,
  FALLBACK_WITHDRAWAL_FEE_USD,
  FALLBACK_WITHDRAWAL_PROCESSING_TIME,
  maximumWithdrawalPayout,
  MINIMUM_WITHDRAWAL_USD,
  parseWithdrawalAmount,
  resolveWithdrawalDisplayTerms,
  withSubmittedWithdrawalBreakdown,
} from './withdrawal-flow.ts';

test('shows the confirmed policy as display-only when the API omits withdrawal terms', () => {
  const terms = resolveWithdrawalDisplayTerms({
    apiFee: null,
    apiFeeUsd: null,
    apiFeeCurrency: '',
    apiProcessingTime: '',
    apiMinimumWithdrawal: null,
    apiMinimumWithdrawalUsd: null,
    apiMinimumWithdrawalCurrency: '',
    walletCurrency: 'USD',
  });

  assert.equal(FALLBACK_WITHDRAWAL_FEE_USD, 2);
  assert.equal(FALLBACK_WITHDRAWAL_PROCESSING_TIME, '2 Working days');
  assert.equal(MINIMUM_WITHDRAWAL_USD, 100);
  assert.deepEqual(terms, {
    fee: 2,
    feeUsd: 2,
    feeCurrency: 'USD',
    processingTime: '2 Working days',
    minimumWithdrawalUsd: 100,
    minimumWithdrawalAmount: 100,
    minimumWithdrawalCurrency: 'USD',
    serverConfirmed: false,
  });
});

test('only treats server-returned USD 2 terms as confirmed for a USD wallet', () => {
  const terms = resolveWithdrawalDisplayTerms({
    apiFee: 2,
    apiFeeUsd: 2,
    apiFeeCurrency: 'USD',
    apiProcessingTime: '2 Working days',
    apiMinimumWithdrawal: 100,
    apiMinimumWithdrawalUsd: 100,
    apiMinimumWithdrawalCurrency: 'USD',
    walletCurrency: 'USD',
  });
  const staleTerms = resolveWithdrawalDisplayTerms({
    apiFee: 0,
    apiFeeUsd: 0,
    apiFeeCurrency: 'USD',
    apiProcessingTime: '2 Working days',
    apiMinimumWithdrawal: 0,
    apiMinimumWithdrawalUsd: 0,
    apiMinimumWithdrawalCurrency: 'USD',
    walletCurrency: 'USD',
  });

  assert.equal(terms.serverConfirmed, true);
  assert.equal(staleTerms.serverConfirmed, false);
});

test('fills omitted fee and wallet debit on a newly submitted withdrawal confirmation', () => {
  const confirmation = withSubmittedWithdrawalBreakdown(
    { amount: '200.00', status: 'pending', reference: 'OGWITH-INV-012' },
    200,
    2,
  );

  assert.equal(confirmation.amount, 200);
  assert.equal(confirmation.fee, 2);
  assert.equal(confirmation.fee_usd, 2);
  assert.equal(confirmation.total_debit, 202);
  assert.equal(confirmation.total_debit_usd, 202);
  assert.equal(confirmation.currency, 'USD');
});

test('preserves the server-recorded breakdown when it is present', () => {
  const confirmation = withSubmittedWithdrawalBreakdown(
    { amount: 200, fee: 2, total_debit: 202, currency: 'USD', status: 'pending' },
    100,
    9,
  );

  assert.equal(confirmation.amount, 200);
  assert.equal(confirmation.fee, 2);
  assert.equal(confirmation.total_debit, 202);
});

test('reads nested breakdown fields without estimating historical withdrawals', () => {
  const confirmation = withSubmittedWithdrawalBreakdown(
    { amount: 200, withdrawal_breakdown: { fee: 2, total_debit: 202, currency: 'USD' } },
    200,
    2,
  );

  assert.equal(confirmation.fee, 2);
  assert.equal(confirmation.total_debit, 202);
});

test('uses the server-converted PKR minimum while keeping the policy threshold at USD 100', () => {
  const terms = resolveWithdrawalDisplayTerms({
    apiFee: 557,
    apiFeeUsd: 2,
    apiFeeCurrency: 'PKR',
    apiProcessingTime: '2 Working days',
    apiMinimumWithdrawal: 27850,
    apiMinimumWithdrawalUsd: 100,
    apiMinimumWithdrawalCurrency: 'PKR',
    walletCurrency: 'PKR',
  });

  assert.equal(terms.minimumWithdrawalUsd, 100);
  assert.equal(terms.minimumWithdrawalAmount, 27850);
  assert.equal(terms.minimumWithdrawalCurrency, 'PKR');
  assert.equal(terms.serverConfirmed, true);
  assert.equal(parseWithdrawalAmount('27849.99', 50000, 557, terms.minimumWithdrawalAmount), null);
  assert.equal(parseWithdrawalAmount('27850', 50000, 557, terms.minimumWithdrawalAmount), 27850);
});

test('does not apply USD-denominated terms directly to a PKR wallet', () => {
  const terms = resolveWithdrawalDisplayTerms({
    apiFee: 2,
    apiFeeUsd: 2,
    apiFeeCurrency: 'USD',
    apiProcessingTime: '2 Working days',
    apiMinimumWithdrawal: 100,
    apiMinimumWithdrawalUsd: 100,
    apiMinimumWithdrawalCurrency: 'USD',
    walletCurrency: 'PKR',
  });

  assert.equal(terms.fee, null);
  assert.equal(terms.minimumWithdrawalAmount, null);
  assert.equal(terms.serverConfirmed, false);
});

test('maximum payout is the available wallet balance less the fee', () => {
  assert.equal(maximumWithdrawalPayout(1750.33, 2), 1748.33);
  assert.equal(maximumWithdrawalPayout(1.5, 2), 0);
  assert.equal(maximumWithdrawalPayout(1750.33, null), null);
});

test('withdrawal amount must be positive and within the server-reported available balance', () => {
  assert.equal(parseWithdrawalAmount('125.50', 200, 0, 100), 125.5);
  assert.equal(parseWithdrawalAmount('100', 200, 0, 100), 100);
  assert.equal(parseWithdrawalAmount('99.99', 200, 0, 100), null);
  assert.equal(parseWithdrawalAmount('0', 200, 0, 100), null);
  assert.equal(parseWithdrawalAmount('200.01', 200, 0, 100), null);
  assert.equal(parseWithdrawalAmount('abc', 200, 0, 100), null);
  assert.equal(parseWithdrawalAmount('25', null, 0, 100), null);
});

test('withdrawal fee is added on top of the requested payout and must fit the available balance', () => {
  assert.equal(parseWithdrawalAmount('100', 102, 2, 100), 100);
  assert.equal(parseWithdrawalAmount('500', 502, 2, 100), 500);
  assert.equal(parseWithdrawalAmount('500', 501.99, 2, 100), null);
  assert.equal(parseWithdrawalAmount('99.99', 102, 2, 100), null);
  assert.equal(parseWithdrawalAmount('100', 101.99, 2, 100), null);
  assert.equal(parseWithdrawalAmount('100', 102, 2.01, 100), null);
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

test('withdrawal request carries the app wallet currency through bank details', () => {
  const request = buildWithdrawalRequest(
    27850,
    '123456',
    'transaction-password',
    {
      bank_name: 'Example Bank',
      account_holder: 'A. Investor',
      account_number: '1234567890',
      iban: '',
      swift: '',
      branch: '',
    },
    true,
    '',
    'pkr',
  );

  assert.equal(request.amount, 27850);
  assert.equal(request.bank_details.currency, 'PKR');
});
