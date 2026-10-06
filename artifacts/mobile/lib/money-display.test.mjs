import test from 'node:test';
import assert from 'node:assert/strict';
import { configureMoneyDisplay, displayCurrencyCode, money, moneyInSourceCurrency } from './data.ts';

test('USD is the default display target while source-specific formatting stays available', () => {
  configureMoneyDisplay({ language: 'en', currency: 'USD', rates: { USD: 1, PKR: 278.52 } });

  assert.match(money(530, 'USD'), /530\.00/);
  assert.match(money(147615.6, 'PKR'), /530\.00/);
  assert.equal(displayCurrencyCode('PKR'), 'USD');
  assert.match(moneyInSourceCurrency(147615.6, 'PKR'), /147,615\.60/);
});

test('the selected profile currency converts other screens using authenticated rates', () => {
  configureMoneyDisplay({ language: 'en', currency: 'PKR', rates: { USD: 1, PKR: 278.52 } });

  assert.match(money(530, 'USD'), /147,615\.60/);
  assert.match(moneyInSourceCurrency(530, 'USD'), /530\.00/);
});

test('unavailable FX keeps the source amount and marks the missing conversion', () => {
  configureMoneyDisplay({ language: 'en', currency: 'USD', rates: { USD: 1 } });

  assert.match(money(100, 'PKR'), /PKR/);
  assert.match(money(100, 'PKR'), /Currency conversion unavailable/);
});
