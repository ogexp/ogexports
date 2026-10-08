import assert from 'node:assert/strict';
import test from 'node:test';
import {
  savedUsdEquivalentForRecordedAmount,
  withdrawalPaymentMethod,
} from './withdrawal-history.ts';

test('prefers a stored USD equivalent over any rate', () => {
  assert.equal(savedUsdEquivalentForRecordedAmount(27850, 'PKR', 100, 300), 100);
});

test('uses only the saved PKR exchange-rate snapshot for a USD equivalent', () => {
  assert.equal(savedUsdEquivalentForRecordedAmount(27850, 'PKR', null, 278.5), 100);
  assert.equal(savedUsdEquivalentForRecordedAmount(27850, 'PKR', null, null), null);
});

test('does not expose a USD equivalent when the recorded amount is missing', () => {
  assert.equal(savedUsdEquivalentForRecordedAmount(null, 'PKR', 2, 278.5), null);
});

test('uses a recorded withdrawal payment method and ignores placeholder values', () => {
  assert.equal(withdrawalPaymentMethod('—', 'bank_transfer'), 'Bank Transfer');
  assert.equal(withdrawalPaymentMethod('Bank Transfer'), 'Bank Transfer');
});

test('defaults missing withdrawal payment methods to the verified bank-transfer route', () => {
  assert.equal(withdrawalPaymentMethod(null, 'Not recorded', ' - '), 'Bank Transfer');
});
