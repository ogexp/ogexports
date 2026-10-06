export type OpportunityStatusGroup = 'Open' | 'Shipping' | 'Completed';
export type OpportunityStatusFilter = 'All' | OpportunityStatusGroup;
export type ProjectDetailRoute = {
  pathname: '/project/[id]';
  params: { id: string };
};

export function tradeStatus(item: Record<string, unknown>) {
  for (const key of ['trade_status', 'project_status', 'status', 'state']) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

export function opportunityStatusGroup(item: Record<string, unknown>): OpportunityStatusGroup | null {
  const normalized = tradeStatus(item).toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(complete|completed|settled|delivered|disbursed)\b/.test(normalized)) return 'Completed';
  if (/\b(ship|shipping|shipped|transit|cargo loaded|custom clearance|customs|investment confirmed|ready to ship|funded|active)\b/.test(normalized)) return 'Shipping';
  if (/\b(open|funding|fundrais(?:e|ing)|available)\b/.test(normalized)) return 'Open';
  return null;
}

export function matchesOpportunityStatus(item: Record<string, unknown>, filter: OpportunityStatusFilter) {
  return filter === 'All' || opportunityStatusGroup(item) === filter;
}

function projectId(item: Record<string, unknown>) {
  for (const key of ['id', 'project_id']) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

export function createOpportunityPressHandler(
  item: Record<string, unknown>,
  navigate: (route: ProjectDetailRoute) => void,
) {
  const id = projectId(item);
  if (!id) return undefined;
  return () => navigate({ pathname: '/project/[id]', params: { id } });
}
