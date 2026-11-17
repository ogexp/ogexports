import assert from 'node:assert/strict';
import test from 'node:test';
import { formatIbanForDisplay } from './bank-detail-display.ts';

test('IBAN display groups long values without changing the copied source value', () => {
  const iban = 'PK80UNIL0109000376561691';
  assert.equal(formatIbanForDisplay(iban), 'PK80 UNIL 0109 0003 7656 1691');
  assert.equal(formatIbanForDisplay('PK80 UNIL 0109 0003 7656 1691'), 'PK80 UNIL 0109 0003 7656 1691');
});

test('IBAN display leaves a shorter value intact', () => {
  assert.equal(formatIbanForDisplay('GB29NWBK'), 'GB29 NWBK');
  assert.equal(formatIbanForDisplay(''), '');
});
