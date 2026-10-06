import test from 'node:test';
import assert from 'node:assert/strict';
import { convertCurrencyAmount } from './currency-conversion.ts';

test('keeps an amount unchanged when the source and target currencies match', () => {
  assert.equal(convertCurrencyAmount(147615.14, 'PKR', 'PKR', {}), 147615.14);
});

test('prefers the dashboard USD-to-PKR display rate when available', () => {
  assert.ok(Math.abs(convertCurrencyAmount(530, 'USD', 'PKR', { USD: 1, PKR: 280 }, 278.52) - 147615.6) < 1e-8);
  assert.ok(Math.abs(convertCurrencyAmount(147615.6, 'PKR', 'USD', {}, 278.52) - 530) < 1e-8);
});

test('uses authenticated currency rates for other currency pairs', () => {
  assert.ok(Math.abs(convertCurrencyAmount(100, 'EUR', 'PKR', { EUR: 1.08, PKR: 278.52 }) - 25788.88888888889) < 1e-8);
});

test('does not invent a conversion when usable rates are missing or invalid', () => {
  assert.equal(convertCurrencyAmount(100, 'USD', 'PKR', {}, null), null);
  assert.equal(convertCurrencyAmount(100, 'USD', 'PKR', { USD: 1, PKR: 0 }, null), null);
  assert.equal(convertCurrencyAmount(100, 'USD', 'PKR', {}, Number.NaN), null);
  assert.equal(convertCurrencyAmount(Number.POSITIVE_INFINITY, 'USD', 'PKR', { USD: 1, PKR: 278.52 }), null);
});
