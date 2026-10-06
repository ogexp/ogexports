import test from 'node:test';
import assert from 'node:assert/strict';
import { latestRecords } from './latest-records.ts';

test('orders dated records newest-first and returns only the requested count', () => {
  const records = [
    { id: 'older', created_at: '2026-01-02T00:00:00Z' },
    { id: 'newest', created_at: '2026-03-01T00:00:00Z' },
    { id: 'middle', created_at: '2026-02-01T00:00:00Z' },
    { id: 'oldest', created_at: '2025-12-01T00:00:00Z' },
  ];

  assert.deepEqual(
    latestRecords(records, ['created_at'], 3).map(item => item.id),
    ['newest', 'middle', 'older'],
  );
});

test('keeps undated or invalid records after dated records in their original order', () => {
  const records = [
    { id: 'missing' },
    { id: 'dated', created_at: '2026-02-01T00:00:00Z' },
    { id: 'invalid', created_at: 'not-a-date' },
  ];

  assert.deepEqual(
    latestRecords(records, ['created_at'], 3).map(item => item.id),
    ['dated', 'missing', 'invalid'],
  );
});
