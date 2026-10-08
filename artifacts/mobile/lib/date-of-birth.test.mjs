import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDateOnly,
  getCalendarGrid,
  getDaysInMonth,
  isDateAfter,
  parseDateOnly,
  shiftCalendarMonth,
} from './date-of-birth.ts';

test('date-only parsing accepts leap days and keeps the API YYYY-MM-DD format', () => {
  const date = parseDateOnly('2000-02-29');
  assert.deepEqual(date, { year: 2000, month: 2, day: 29 });
  assert.equal(formatDateOnly(date), '2000-02-29');
});

test('date-only parsing rejects impossible dates and free-form input', () => {
  assert.equal(parseDateOnly('1900-02-29'), null);
  assert.equal(parseDateOnly('2026-04-31'), null);
  assert.equal(parseDateOnly('14/05/1990'), null);
});

test('calendar grid accounts for leap February and always renders six rows', () => {
  const grid = getCalendarGrid(2024, 2);
  assert.equal(grid.length, 42);
  assert.equal(grid[4], 1);
  assert.equal(grid[32], 29);
  assert.equal(grid[33], null);
  assert.equal(getDaysInMonth(2024, 2), 29);
});

test('calendar month navigation crosses year boundaries', () => {
  assert.deepEqual(shiftCalendarMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftCalendarMonth({ year: 2025, month: 12 }, 1), { year: 2026, month: 1 });
});

test('future dates can be identified without timezone conversion', () => {
  assert.equal(isDateAfter({ year: 2026, month: 10, day: 9 }, { year: 2026, month: 10, day: 8 }), true);
  assert.equal(isDateAfter({ year: 1990, month: 5, day: 14 }, { year: 2026, month: 10, day: 8 }), false);
});
