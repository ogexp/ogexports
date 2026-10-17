import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableBalanceFromDashboard,
  configureMoneyDisplay,
  convertAmountToCurrency,
  displayCurrencyCode,
  money,
  moneyInSourceCurrency,
  moneyToCurrency,
  walletCurrencyFromDashboard,
  walletCurrencyFromSources,
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

test('balance display uses the server wallet currency before applying the selected display currency', () => {
  configureMoneyDisplay({ language: 'en', currency: 'USD', rates: { USD: 1, PKR: 277.2 } });

  const dashboard = {
    data: {
      wallet: { currency: 'PKR' },
      summary: { display_currency: 'USD', available_balance: 1150.33 },
    },
  };
  const sourceCurrency = walletCurrencyFromDashboard(dashboard);

  assert.equal(sourceCurrency, 'PKR');
  assert.equal(money(1150.33, sourceCurrency), '$4.15');
  assert.equal(money(1150.33, 'USD'), '$1,150.33');
  assert.equal(walletCurrencyFromDashboard({}, 'USD'), 'USD');
});

test('wallet currency never falls back to the dashboard display-currency preference', () => {
  assert.equal(walletCurrencyFromDashboard({
    data: {
      wallet: { currency: 'USD' },
      wallet_currency: 'PKR',
      summary: { display_currency: 'PKR' },
    },
  }), 'USD');
  assert.equal(walletCurrencyFromDashboard({
    data: { summary: { display_currency: 'PKR' } },
  }, 'USD'), 'USD');
  assert.equal(walletCurrencyFromDashboard({
    data: { wallet_currency: 'USD', summary: { display_currency: 'PKR' } },
  }), 'USD');
  assert.equal(walletCurrencyFromDashboard({
    data: { summary: { display_currency: 'PKR' } },
  }, ''), '');
});

test('wallet endpoint currency takes precedence over dashboard wallet currency', () => {
  const dashboard = {
    data: {
      wallet: { currency: 'PKR' },
      wallet_currency: 'PKR',
      summary: { display_currency: 'PKR', available_balance: 5200 },
    },
  };

  assert.equal(walletCurrencyFromSources({ currency: 'USD' }, dashboard), 'USD');
  assert.equal(walletCurrencyFromSources({ currency: 'PKR' }, {
    data: { wallet: { currency: 'USD' } },
  }), 'PKR');
});

test('missing monetary values use a display-only zero in the selected currency', () => {
  configureMoneyDisplay({ language: 'en', currency: 'USD', rates: { USD: 1, PKR: 278.52 } });

  assert.equal(money(null, 'PKR'), '$0.00');
  assert.equal(money(undefined, 'USD'), '$0.00');
  assert.equal(moneyInSourceCurrency(null, 'PKR'), '$0.00');
});

test('a selected profile currency converts displayed amounts using authenticated rates', () => {
  configureMoneyDisplay({ language: 'en', currency: 'PKR', rates: { USD: 1, PKR: 278.52 } });

  assert.match(money(536, 'USD'), /149,286\.72/);
  assert.equal(displayCurrencyCode('USD'), 'PKR');
  assert.match(moneyInSourceCurrency(536, 'USD'), /536\.00/);

  configureMoneyDisplay({ language: 'en', currency: 'EUR', rates: { USD: 1, PKR: 278.52, EUR: 0.92 } });
  assert.match(money(536, 'USD'), /493\.12/);
});

test('fixed-currency displays ignore the Profile selection and convert with authenticated rates', () => {
  configureMoneyDisplay({ language: 'en', currency: 'PKR', rates: { USD: 1, PKR: 278.52, EUR: 0.92 } });

  assert.match(moneyToCurrency(278.52, 'PKR', 'USD'), /\$1\.00/);
  assert.match(moneyToCurrency(536, 'USD', 'EUR'), /€493\.12/);
  assert.equal(convertAmountToCurrency(278.52, 'PKR', 'USD'), 1);
  assert.equal(convertAmountToCurrency(1, 'USD', 'EUR'), 0.92);
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
  assert.match(moneyToCurrency(536, 'USD', 'EUR'), /Currency conversion unavailable/);
  assert.equal(convertAmountToCurrency(536, 'USD', 'EUR'), null);
});
