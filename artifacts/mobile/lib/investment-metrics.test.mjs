import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExpectedProfitFromRoi,
  formatDistributionStatus,
  formatReportedPayoutDate,
  parseRoiPercentageLabel,
} from './investment-metrics.ts';

test('calculates expected profit from the invested amount and ROI percentage', () => {
  assert.equal(calculateExpectedProfitFromRoi(300, 4), 12);
});

test('does not invent expected profit when amount or ROI is missing', () => {
  assert.equal(calculateExpectedProfitFromRoi(null, 4), null);
  assert.equal(calculateExpectedProfitFromRoi(300, null), null);
});

test('extracts a single percentage from the API ROI label, not an ambiguous range', () => {
  assert.equal(parseRoiPercentageLabel('4.00%'), 4);
  assert.equal(parseRoiPercentageLabel('Target return: 4,5%'), 4.5);
  assert.equal(parseRoiPercentageLabel('4%–8%'), null);
});

test('formats ISO payout dates without shifting date-only values', () => {
  assert.match(formatReportedPayoutDate('2026-10-06') ?? '', /2026/);
  assert.equal(formatReportedPayoutDate('2026-02-30'), null);
});

test('humanizes server distribution status and shows a clear fallback when it is absent', () => {
  assert.equal(formatDistributionStatus('awaiting_distribution'), 'Awaiting Distribution');
  assert.equal(formatDistributionStatus('—'), 'Awaiting update');
});
