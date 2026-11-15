import test from 'node:test';
import assert from 'node:assert/strict';
import colors from '../constants/colors.ts';
import { resolveTradeProgress, TRADE_STAGE_COLOR_TOKENS, TRADE_STAGES } from './trade-progress.ts';

test('each project milestone uses its own distinct theme color', () => {
  const tokenNames = TRADE_STAGES.map(stage => TRADE_STAGE_COLOR_TOKENS[stage.key]);
  assert.equal(new Set(tokenNames).size, TRADE_STAGES.length);
  for (const appearance of ['light', 'dark']) {
    const stageColors = tokenNames.map(token => colors[appearance][token]);
    assert.equal(new Set(stageColors).size, TRADE_STAGES.length, `${appearance} milestone colors are distinct`);
  }
});

test('a Settled project status completes the ordered milestone timeline', () => {
  const progress = resolveTradeProgress([], 'Settled');

  assert.equal(progress.latestByStage.get('settled')?.status, 'completed');
  assert.equal(progress.latestByStage.get('settled')?.source, 'project_status');
  assert.equal(progress.latestByStage.get('settled')?.occurredAt, '');
  assert.equal(progress.latestByStage.get('funding')?.status, 'completed');
  assert.equal(progress.latestByStage.get('in_transit')?.status, 'completed');
  assert.equal(progress.completedCount, 6);
  assert.equal(TRADE_STAGES.length, 6);
});

test('fills milestones in order as the admin-reported stage advances', () => {
  for (const [index, stage] of TRADE_STAGES.entries()) {
    const settled = stage.key === 'settled';
    const progress = resolveTradeProgress(
      [],
      settled ? 'Settled' : '',
      settled ? '' : stage.label,
    );

    for (const [stageIndex, item] of TRADE_STAGES.entries()) {
      const entry = progress.latestByStage.get(item.key);
      if (stageIndex < index || (settled && stageIndex === index)) {
        assert.equal(entry?.status, 'completed', `${stage.label} should complete ${item.label}`);
      } else if (stageIndex === index) {
        assert.equal(entry?.status, 'in_progress', `${stage.label} should be active`);
      } else {
        assert.equal(entry, undefined, `${item.label} should remain unreported`);
      }
    }
    assert.equal(progress.completedCount, settled ? 6 : index);
  }
});

test('advancing the project status also fills earlier milestones', () => {
  const progress = resolveTradeProgress([], 'custom_clearance');
  assert.equal(progress.latestByStage.get('funding')?.status, 'completed');
  assert.equal(progress.latestByStage.get('cargo_loaded')?.status, 'completed');
  assert.equal(progress.latestByStage.get('custom_clearance')?.status, 'in_progress');
  assert.equal(progress.latestByStage.has('settled'), false);
  assert.equal(progress.completedCount, 4);
});

test('uses the furthest authoritative stage when project status and current stage differ', () => {
  const progress = resolveTradeProgress([], 'cargo_loaded', 'In Transit');
  assert.equal(progress.latestByStage.get('cargo_loaded')?.status, 'completed');
  assert.equal(progress.latestByStage.get('in_transit')?.status, 'in_progress');
  assert.equal(progress.latestByStage.has('custom_clearance'), false);
});

test('keeps the latest explicit stage record authoritative over project status', () => {
  const progress = resolveTradeProgress([
    { stage: 'Settled', status: 'In Progress', created_at: '2026-10-06T09:00:00Z' },
    { stage: 'settled', status: 'Completed', created_at: '2026-10-06T10:00:00Z' },
  ], 'settled');

  assert.equal(progress.latestByStage.get('settled')?.status, 'completed');
  assert.equal(progress.latestByStage.get('settled')?.source, 'stage_update');
  assert.equal(progress.completedCount, 6);
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

test('highlights the server-reported current milestone without marking earlier milestones complete', () => {
  const progress = resolveTradeProgress([], '', 'Funding');

  assert.equal(progress.latestByStage.get('funding')?.status, 'in_progress');
  assert.equal(progress.latestByStage.get('funding')?.statusLabel, 'Current milestone');
  assert.equal(progress.latestByStage.get('funding')?.source, 'current_project_stage');
  assert.equal(progress.latestByStage.has('investment_confirmed'), false);
  assert.equal(progress.completedCount, 0);
});

test('explicit stage records stay authoritative over derived project progress', () => {
  const explicit = resolveTradeProgress([
    { stage: 'Funding', status: 'not_started' },
  ], 'in_transit');
  const settled = resolveTradeProgress([], 'Settled', 'Funding');

  assert.equal(explicit.latestByStage.get('funding')?.status, 'not_started');
  assert.equal(settled.latestByStage.get('settled')?.status, 'completed');
  assert.equal(settled.latestByStage.get('funding')?.status, 'completed');
});
