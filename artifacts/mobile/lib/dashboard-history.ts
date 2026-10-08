export type DashboardHistoryScope =
  | 'total-deposits'
  | 'pending-deposits'
  | 'total-withdrawals'
  | 'pending-withdrawals'
  | 'total-investments'
  | 'active-investments'
  | 'total-profit-earned'
  | 'monthly-profit'
  | 'lifetime-roi'
  | 'completed-transactions'
  | 'available-balance'
  | 'pending-distributions';

export type DashboardHistoryParams = {
  tab: 'All' | 'Deposits' | 'Investments' | 'Withdrawals' | 'Distributions';
  status?: string;
  date_from?: string;
  date_to?: string;
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dashboardHistoryParams(
  scope: DashboardHistoryScope,
  now = new Date(),
): DashboardHistoryParams {
  switch (scope) {
    case 'total-deposits':
      return { tab: 'Deposits' };
    case 'pending-deposits':
      return { tab: 'Deposits', status: 'pending' };
    case 'total-withdrawals':
      return { tab: 'Withdrawals' };
    case 'pending-withdrawals':
      return { tab: 'Withdrawals', status: 'pending' };
    case 'total-investments':
      return { tab: 'Investments' };
    case 'active-investments':
      return { tab: 'Investments', status: 'active' };
    case 'total-profit-earned':
    case 'lifetime-roi':
      return { tab: 'Distributions', status: 'completed' };
    case 'monthly-profit':
      return {
        tab: 'Distributions',
        status: 'completed',
        date_from: localDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
        date_to: localDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case 'completed-transactions':
      return { tab: 'All', status: 'completed' };
    case 'available-balance':
      return { tab: 'All' };
    case 'pending-distributions':
      return { tab: 'Distributions', status: 'pending' };
  }
}

function normalizedStatus(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function matchesHistoryStatus(actual: string, expected: string) {
  if (!expected) return true;

  const status = normalizedStatus(actual);
  const filter = normalizedStatus(expected);
  if (!status) return false;

  if (filter === 'completed') {
    return ['complete', 'completed', 'paid', 'settled', 'credited', 'distributed', 'success', 'successful'].includes(status);
  }

  if (filter === 'active') {
    return ['active', 'in_progress', 'inprogress', 'ongoing', 'running'].includes(status);
  }

  if (filter === 'pending') {
    return ['pending', 'pending_credit'].includes(status);
  }

  if (filter === 'review') {
    return ['review', 'under_review'].includes(status);
  }

  return status === filter;
}

function localDateForRecord(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? localDateString(new Date(timestamp)) : '';
}

export function matchesHistoryDateRange(value: string, from: string, to: string) {
  if (!from && !to) return true;
  const date = localDateForRecord(value);
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
}
