import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExpectedProfitFromRoi,
  calculatePortfolioValueWithEstimates,
  estimateDistributionDateFromInvestment,
  formatContainerStatus,
  ensurePortfolioValueIncludesAvailableBalance,
  estimateDistributionDateIso,
  formatEstimatedDistributionDate,
  formatDistributionStatus,
  formatReportedPayoutDate,
  parseRoiPercentageLabel,
  pendingDistributionWithEstimates,
} from './investment-metrics.ts';

test('calculates expected profit from the invested amount and ROI percentage', () => {
  assert.equal(calculateExpectedProfitFromRoi(300, 4), 12);
});

test('does not invent expected profit when amount or ROI is missing', () => {
  assert.equal(calculateExpectedProfitFromRoi(null, 4), null);
  assert.equal(calculateExpectedProfitFromRoi(300, null), null);
});

test('portfolio value is never below its same-currency available wallet balance', () => {
  assert.equal(ensurePortfolioValueIncludesAvailableBalance(0, 800, true), 800);
  assert.equal(ensurePortfolioValueIncludesAvailableBalance(1_200, 800, true), 1_200);
  assert.equal(ensurePortfolioValueIncludesAvailableBalance(null, 800, true), 800);
});

test('does not compare available balance against portfolio value in a different currency', () => {
  assert.equal(ensurePortfolioValueIncludesAvailableBalance(1_000, 800, false), 1_000);
});

test('adds active investment profit estimates to pending distributions and portfolio value', () => {
  const estimatedProfit = calculateExpectedProfitFromRoi(2_500, 5);
  assert.equal(estimatedProfit, 125);
  assert.equal(pendingDistributionWithEstimates(0, estimatedProfit, true), 125);
  assert.equal(calculatePortfolioValueWithEstimates(2_500, 2_500, 2_500, 0, estimatedProfit, true), 5_125);
});

test('counts reported pending credits once and avoids estimates across currencies', () => {
  assert.equal(calculatePortfolioValueWithEstimates(5_050, 2_500, 2_500, 50, 125, true), 5_175);
  assert.equal(calculatePortfolioValueWithEstimates(5_175, 2_500, 2_500, 50, 125, true), 5_175);
  assert.equal(pendingDistributionWithEstimates(50, 125, true), 175);
  assert.equal(calculatePortfolioValueWithEstimates(2_500, 2_500, 2_500, 0, 125, false), 2_500);
  assert.equal(pendingDistributionWithEstimates(0, 125, false), 0);
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

test('estimates a target distribution date from the selected cycle days', () => {
  assert.equal(estimateDistributionDateIso(45, new Date(2026, 9, 17)), '2026-12-01');
  assert.equal(estimateDistributionDateIso(1, new Date(2026, 11, 31)), '2027-01-01');
  assert.equal(estimateDistributionDateIso(0, new Date(2026, 9, 17)), null);
  assert.equal(estimateDistributionDateIso(null, new Date(2026, 9, 17)), null);
});

test('estimates payout from the investment date and formats container statuses for display', () => {
  assert.equal(estimateDistributionDateFromInvestment(45, '2026-10-17T12:00:00Z'), '2026-12-01');
  assert.equal(estimateDistributionDateFromInvestment(null, '2026-10-17'), null);
  assert.equal(formatContainerStatus('in_transit'), 'In Transit');
  assert.equal(formatContainerStatus('—'), 'Not reported');
});

test('keeps a server-reported target date ahead of the cycle-based estimate', () => {
  const expected = formatReportedPayoutDate('2026-11-20');
  assert.equal(formatEstimatedDistributionDate('2026-11-20', 45, new Date(2026, 9, 17)), expected);
  assert.equal(formatEstimatedDistributionDate('', 45, new Date(2026, 9, 17)), formatReportedPayoutDate('2026-12-01'));
  assert.equal(formatEstimatedDistributionDate('', null, new Date(2026, 9, 17)), '—');
});

test('humanizes server distribution status and shows a clear fallback when it is absent', () => {
  assert.equal(formatDistributionStatus('awaiting_distribution'), 'Awaiting Distribution');
  assert.equal(formatDistributionStatus('—'), 'Awaiting update');
});

test('only reports a distribution as completed when its confirmation timestamp exists', () => {
  assert.equal(formatDistributionStatus('distributed'), 'Awaiting update');
  assert.equal(formatDistributionStatus('scheduled'), 'Scheduled');
  assert.equal(formatDistributionStatus('processing'), 'Processing');
  assert.equal(formatDistributionStatus('processing', '2026-10-06T12:00:00Z'), 'Distributed');
});
