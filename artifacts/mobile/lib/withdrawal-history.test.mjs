import assert from 'node:assert/strict';
import test from 'node:test';
import { savedUsdEquivalentForRecordedAmount } from './withdrawal-history.ts';

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
