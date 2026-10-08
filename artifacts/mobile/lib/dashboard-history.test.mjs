import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dashboardHistoryParams,
  matchesHistoryDateRange,
  matchesHistoryStatus,
} from './dashboard-history.ts';

test('each account overview card opens its matching history filter', () => {
  const now = new Date('2026-10-08T12:00:00+05:00');

  assert.deepEqual(dashboardHistoryParams('total-deposits', now), { tab: 'Deposits' });
  assert.deepEqual(dashboardHistoryParams('pending-deposits', now), { tab: 'Deposits', status: 'pending' });
  assert.deepEqual(dashboardHistoryParams('total-withdrawals', now), { tab: 'Withdrawals' });
  assert.deepEqual(dashboardHistoryParams('pending-withdrawals', now), { tab: 'Withdrawals', status: 'pending' });
  assert.deepEqual(dashboardHistoryParams('total-investments', now), { tab: 'Investments' });
  assert.deepEqual(dashboardHistoryParams('active-investments', now), { tab: 'Investments', status: 'active' });
  assert.deepEqual(dashboardHistoryParams('total-profit-earned', now), { tab: 'Distributions', status: 'completed' });
  assert.deepEqual(dashboardHistoryParams('lifetime-roi', now), { tab: 'Distributions', status: 'completed' });
  assert.deepEqual(dashboardHistoryParams('monthly-profit', now), {
    tab: 'Distributions',
    status: 'completed',
    date_from: '2026-10-01',
    date_to: '2026-10-31',
  });
  assert.deepEqual(dashboardHistoryParams('completed-transactions', now), { tab: 'All', status: 'completed' });
  assert.deepEqual(dashboardHistoryParams('available-balance', now), { tab: 'All' });
  assert.deepEqual(dashboardHistoryParams('pending-distributions', now), { tab: 'Distributions', status: 'pending' });
});

test('completed history excludes approval-only states', () => {
  assert.equal(matchesHistoryStatus('completed', 'completed'), true);
  assert.equal(matchesHistoryStatus('Paid', 'completed'), true);
  assert.equal(matchesHistoryStatus('approved', 'completed'), false);
});

test('status and date filters match normalized records and reject missing dates', () => {
  assert.equal(matchesHistoryStatus('under review', 'review'), true);
  assert.equal(matchesHistoryStatus('in progress', 'active'), true);
  assert.equal(matchesHistoryStatus('pending', 'pending'), true);
  assert.equal(matchesHistoryStatus('rejected', 'pending'), false);
  assert.equal(matchesHistoryDateRange('2026-10-12T12:00:00+05:00', '2026-10-01', '2026-10-31'), true);
  assert.equal(matchesHistoryDateRange('2026-09-30T12:00:00Z', '2026-10-01', '2026-10-31'), false);
  assert.equal(matchesHistoryDateRange('', '2026-10-01', '2026-10-31'), false);
});
