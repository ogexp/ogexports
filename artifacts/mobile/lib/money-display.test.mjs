import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableBalanceFromDashboard,
  configureMoneyDisplay,
  displayCurrencyCode,
  money,
  moneyInSourceCurrency,
} from './data.ts';

test('prefers dashboard summary available balance with wallet summary as fallback', () => {
  assert.equal(availableBalanceFromDashboard({
    data: {
      wallet: { available_balance: '526.00' },
      summary: { available_balance: 1.9 },
    },
  }), 1.9);

  assert.equal(availableBalanceFromDashboard({
    wallet: { available_balance: 0 },
    summary: { available_balance: 526 },
  }), 526);

  assert.equal(availableBalanceFromDashboard({
    wallet: { balance: 526 },
    summary: { available_balance: '1.90' },
  }), 1.9);

  assert.equal(availableBalanceFromDashboard({
    wallet: { available_balance: 0 },
    summary: { available_balance: 0 },
  }), 0);
});

test('USD is the default display currency while source formatting remains available', () => {
  configureMoneyDisplay({ language: 'en', currency: 'USD', rates: { USD: 1, PKR: 278.52 } });

  assert.match(money(536, 'USD'), /536\.00/);
  assert.match(money(147615.6, 'PKR'), /530\.00/);
  assert.equal(displayCurrencyCode('PKR'), 'USD');
  assert.match(moneyInSourceCurrency(147615.6, 'PKR'), /147,615\.60/);
});

test('a selected profile currency converts displayed amounts using authenticated rates', () => {
  configureMoneyDisplay({ language: 'en', currency: 'PKR', rates: { USD: 1, PKR: 278.52 } });

  assert.match(money(536, 'USD'), /149,286\.72/);
  assert.equal(displayCurrencyCode('USD'), 'PKR');
  assert.match(moneyInSourceCurrency(536, 'USD'), /536\.00/);

  configureMoneyDisplay({ language: 'en', currency: 'EUR', rates: { USD: 1, PKR: 278.52, EUR: 0.92 } });
  assert.match(money(536, 'USD'), /493\.12/);
});

test('unavailable rates keep the source amount and mark conversion unavailable', () => {
  configureMoneyDisplay({
    language: 'en',
    currency: 'PKR',
    rates: { USD: 1 },
    conversionUnavailableLabel: 'Currency conversion unavailable',
  });

  assert.match(money(536, 'USD'), /536\.00/);
  assert.match(money(536, 'USD'), /Currency conversion unavailable/);
  assert.equal(displayCurrencyCode('USD'), 'USD');
});
