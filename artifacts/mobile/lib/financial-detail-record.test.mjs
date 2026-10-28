import assert from 'node:assert/strict';
import test from 'node:test';
import { findFinancialDetailRecord } from './financial-detail-record.ts';

test('finds deposit and withdrawal details by their server record ID aliases', () => {
  const deposit = { deposit_id: 10000421, reference: 'DEP-421' };
  const withdrawal = { withdrawal_id: '10000422', reference: 'WDR-422' };

  assert.equal(
    findFinancialDetailRecord([deposit], '10000421', ['id', 'deposit_id']),
    deposit,
  );
  assert.equal(
    findFinancialDetailRecord([withdrawal], '10000422', ['id', 'withdrawal_id', 'withdraw_id']),
    withdrawal,
  );
});

test('does not substitute a partial ID or a matching reference for the requested record', () => {
  const records = [
    { id: 421, reference: 'DEP-10000421' },
    { id: 10000421, reference: 'DEP-421' },
  ];

  assert.equal(findFinancialDetailRecord(records, '1000042', ['id']), undefined);
  assert.equal(findFinancialDetailRecord(records, 'DEP-421', ['id', 'deposit_id']), undefined);
});
