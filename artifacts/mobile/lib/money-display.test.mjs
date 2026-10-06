import test from 'node:test';
import assert from 'node:assert/strict';
import { configureMoneyDisplay, displayCurrencyCode, money } from './data.ts';

test('money formatting keeps each amount in its reported currency', () => {
  configureMoneyDisplay({ language: 'en' });

  assert.match(money(536, 'USD'), /536\.00/);
  assert.match(money(530, 'USD'), /530\.00/);
  assert.match(money(147615.6, 'PKR'), /147,615\.60/);
  assert.equal(displayCurrencyCode('PKR'), 'PKR');
});
