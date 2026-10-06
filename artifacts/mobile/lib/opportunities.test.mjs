import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOpportunityPressHandler,
  matchesOpportunityStatus,
  opportunityStatusGroup,
} from './opportunities.ts';

const statusVariants = [
  { status: 'open', group: 'Open' },
  { status: 'open_for_funding', group: 'Open' },
  { status: 'fundraising', group: 'Open' },
  { status: 'available', group: 'Open' },
  { status: 'active', group: 'Shipping' },
  { status: 'in_transit', group: 'Shipping' },
  { status: 'ready_to_ship', group: 'Shipping' },
  { status: 'cargo_loaded', group: 'Shipping' },
  { status: 'customs_clearance', group: 'Shipping' },
  { status: 'shipped', group: 'Shipping' },
  { status: 'complete', group: 'Completed' },
  { status: 'completed', group: 'Completed' },
  { status: 'settled', group: 'Completed' },
  { status: 'delivered', group: 'Completed' },
  { status: 'disbursed', group: 'Completed' },
  { status: 'pending_review', group: null },
  { status: 'cancelled', group: null },
  { status: 'canceled', group: null },
];

const opportunities = statusVariants.map(({ status }, index) => ({
  id: `project-${index + 1}`,
  trade_status: status,
}));

test('classifies server status variants consistently, leaving unknown and cancelled trades ungrouped', () => {
  for (const { status, group } of statusVariants) {
    assert.equal(opportunityStatusGroup({ trade_status: status }), group, status);
  }
});

test('status tabs keep every opportunity in All and only show matching known statuses in each group', () => {
  assert.deepEqual(
    opportunities.filter(item => matchesOpportunityStatus(item, 'All')),
    opportunities,
  );

  for (const group of ['Open', 'Shipping', 'Completed']) {
    const expected = opportunities
      .filter((item, index) => statusVariants[index].group === group);
    assert.deepEqual(
      opportunities.filter(item => matchesOpportunityStatus(item, group)),
      expected,
      `${group} tab`,
    );
  }

  for (const item of opportunities.filter((_, index) => statusVariants[index].group === null)) {
    assert.equal(matchesOpportunityStatus(item, 'Open'), false, item.trade_status);
    assert.equal(matchesOpportunityStatus(item, 'Shipping'), false, item.trade_status);
    assert.equal(matchesOpportunityStatus(item, 'Completed'), false, item.trade_status);
    assert.equal(matchesOpportunityStatus(item, 'All'), true, item.trade_status);
  }
});

test('each opportunity press handler opens the detail route with that project ID', () => {
  const routes = [];
  const navigate = route => routes.push(route);

  opportunities.forEach(item => createOpportunityPressHandler(item, navigate)?.());

  assert.deepEqual(
    routes,
    opportunities.map(item => ({
      pathname: '/project/[id]',
      params: { id: item.id },
    })),
  );
});

test('uses project_id when id is missing and disables navigation when both IDs are absent', () => {
  const routes = [];
  const navigate = route => routes.push(route);

  createOpportunityPressHandler({ project_id: 'fallback-project' }, navigate)?.();
  assert.equal(createOpportunityPressHandler({ trade_status: 'open' }, navigate), undefined);
  assert.deepEqual(routes, [{
    pathname: '/project/[id]',
    params: { id: 'fallback-project' },
  }]);
});
