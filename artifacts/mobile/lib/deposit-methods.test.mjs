import test from 'node:test';
import assert from 'node:assert/strict';
import { DEPOSIT_PAYMENT_METHODS } from './deposit-methods.ts';

test('mobile deposit methods contain the four supported choices without OG Wallet', () => {
  assert.deepEqual(
    DEPOSIT_PAYMENT_METHODS.map(({ id, label }) => [id, label]),
    [
      ['bank', 'Bank Transfer'],
      ['wire', 'Wire Transfer'],
      ['swift', 'SWIFT Transfer'],
      ['online', 'Online Banking'],
    ],
  );
});

test('each deposit method includes its description and visible transfer details', () => {
  for (const method of DEPOSIT_PAYMENT_METHODS) {
    assert.ok(method.description);
    assert.ok(method.minimumUsd > 0);
    assert.ok(method.maximumUsd > method.minimumUsd);
    assert.ok(method.processing);
    assert.ok(method.currency);
    assert.equal(method.feePercent, 0);
    assert.ok(method.fees);
  }
});
