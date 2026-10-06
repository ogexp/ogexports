import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTradeProgress, TRADE_STAGES } from './trade-progress.ts';

test('reflects an explicit project-level Settled status on the final milestone only', () => {
  const progress = resolveTradeProgress([], 'Settled');

  assert.equal(progress.latestByStage.get('settled')?.status, 'completed');
  assert.equal(progress.latestByStage.get('settled')?.source, 'project_status');
  assert.equal(progress.latestByStage.get('settled')?.occurredAt, '');
  assert.equal(progress.latestByStage.has('funding'), false);
  assert.equal(progress.completedCount, 1);
  assert.equal(TRADE_STAGES.length, 6);
});

test('keeps the latest explicit stage record authoritative over project status', () => {
  const progress = resolveTradeProgress([
    { stage: 'Settled', status: 'In Progress', created_at: '2026-10-06T09:00:00Z' },
    { stage: 'settled', status: 'Completed', created_at: '2026-10-06T10:00:00Z' },
  ], 'settled');

  assert.equal(progress.latestByStage.get('settled')?.status, 'completed');
  assert.equal(progress.latestByStage.get('settled')?.source, 'stage_update');
  assert.equal(progress.completedCount, 1);
});

test('normalizes human-readable milestone labels and counts every milestone', () => {
  const progress = resolveTradeProgress([
    { stage: 'Custom Clearance', status: 'completed' },
    { stage: 'Funding', status: 'Completed' },
    { stage: 'In Transit', status: 'in-progress' },
  ]);

  assert.equal(progress.latestByStage.get('custom_clearance')?.status, 'completed');
  assert.equal(progress.latestByStage.get('funding')?.statusLabel, 'Completed');
  assert.equal(progress.latestByStage.get('in_transit')?.status, 'in_progress');
  assert.equal(progress.completedCount, 2);
});
