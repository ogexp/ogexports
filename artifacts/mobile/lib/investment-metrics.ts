export function calculateExpectedProfitFromRoi(
  investedAmount: number | null,
  roiPercent: number | null,
): number | null {
  if (
    investedAmount == null
    || roiPercent == null
    || !Number.isFinite(investedAmount)
    || !Number.isFinite(roiPercent)
    || investedAmount < 0
  ) return null;

  return investedAmount * roiPercent / 100;
}

export function ensurePortfolioValueIncludesAvailableBalance(
  totalValue: number | null,
  availableBalance: number | null,
  sameCurrency: boolean,
): number | null {
  if (!sameCurrency || availableBalance == null || !Number.isFinite(availableBalance)) {
    return totalValue;
  }
  if (totalValue == null || !Number.isFinite(totalValue)) return availableBalance;
  return Math.max(totalValue, availableBalance);
}

export function calculatePortfolioValueWithEstimates(
  reportedTotal: number | null,
  availableBalance: number | null,
  openInvestmentValue: number,
  pendingCredits: number | null,
  activeTradeProfit: number,
  sameCurrency: boolean,
): number | null {
  if (!sameCurrency) return reportedTotal;

  const safeAmount = (value: number | null) =>
    value != null && Number.isFinite(value) ? Math.max(0, value) : 0;
  const capitalAndCredits = safeAmount(availableBalance)
    + safeAmount(openInvestmentValue)
    + safeAmount(pendingCredits);

  const estimatedTotal = capitalAndCredits + safeAmount(activeTradeProfit);
  return Math.max(safeAmount(reportedTotal), estimatedTotal);
}

export function pendingDistributionWithEstimates(
  pendingCredits: number | null,
  activeTradeProfit: number,
  sameCurrency: boolean,
): number | null {
  if (!sameCurrency) return pendingCredits;

  const safeAmount = (value: number | null) =>
    value != null && Number.isFinite(value) ? Math.max(0, value) : 0;
  return safeAmount(pendingCredits) + safeAmount(activeTradeProfit);
}

export function resolveDistributedReturns(
  totalProfitEarned: number | null,
  totalProfitEarnedUsd: number | null,
  distributedReturns: number | null,
  distributedReturnsUsd: number | null,
  fallbackCurrency: string,
): { value: number | null; currency: string } {
  if (totalProfitEarned != null) return { value: totalProfitEarned, currency: fallbackCurrency };
  if (totalProfitEarnedUsd != null) return { value: totalProfitEarnedUsd, currency: 'USD' };
  if (distributedReturns != null) return { value: distributedReturns, currency: fallbackCurrency };
  if (distributedReturnsUsd != null) return { value: distributedReturnsUsd, currency: 'USD' };
  return { value: null, currency: fallbackCurrency };
}

export function parseRoiPercentageLabel(value: string): number | null {
  const matches = value.match(/-?\d+(?:[.,]\d+)?\s*%/g);
  if (!matches || matches.length !== 1) return null;
  const parsed = Number(matches[0].replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

const targetReturnNumberFields = [
  'expected_return_pct',
  'projected_return_pct',
  'projected_return_percentage',
  'expected_return_percentage',
  'estimated_return_percentage',
  'target_return_percentage',
  'roi',
] as const;

const targetReturnLabelFields = [
  'roi_label',
  'target_return',
  'projected_return',
  'expected_return',
  'return_rate',
] as const;

function parseTargetReturnValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;
  if (/^-?\d+(?:[.,]\d+)?\s*%?$/.test(normalized)) {
    const parsed = Number(normalized.replace('%', '').replace(',', '.').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return parseRoiPercentageLabel(normalized);
}

export function targetReturnPercentage(sources: unknown[]): number | null {
  const records = sources.filter(
    (source): source is Record<string, unknown> => source !== null && typeof source === 'object' && !Array.isArray(source),
  );

  // The admin-managed numeric field is authoritative. Check it across sources
  // before considering legacy display labels that may be stale.
  for (const key of targetReturnNumberFields) {
    for (const source of records) {
      const value = parseTargetReturnValue(source[key]);
      if (value != null) return value;
    }
  }

  for (const key of targetReturnLabelFields) {
    for (const source of records) {
      const value = parseTargetReturnValue(source[key]);
      if (value != null) return value;
    }
  }

  return null;
}

export function formatTargetReturnPercentage(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Number(value.toFixed(2))}%`;
}

export function formatContainerStatus(value: string): string {
  const normalized = value.trim().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (!normalized || normalized === '—') return 'Not reported';
  return normalized.split(' ')
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

export function formatReportedPayoutDate(value: string): string | null {
  const raw = value.trim();
  if (!raw || raw === '—') return null;

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  let date: Date;
  if (dateParts) {
    const [, year, month, day] = dateParts;
    date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() !== Number(year)
      || date.getUTCMonth() !== Number(month) - 1
      || date.getUTCDate() !== Number(day)
    ) return null;
  } else {
    date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function estimateDistributionDateIso(
  cycleDays: number | null,
  fromDate = new Date(),
): string | null {
  if (
    cycleDays == null
    || !Number.isSafeInteger(cycleDays)
    || cycleDays <= 0
    || !Number.isFinite(fromDate.getTime())
  ) return null;

  const estimated = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  estimated.setDate(estimated.getDate() + cycleDays);
  const year = estimated.getFullYear();
  const month = String(estimated.getMonth() + 1).padStart(2, '0');
  const day = String(estimated.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function estimateDistributionDateFromInvestment(
  cycleDays: number | null,
  investedAt: string,
): string | null {
  const raw = investedAt.trim();
  if (!raw) return null;

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const date = dateParts
    ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]), 12)
    : new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;

  return estimateDistributionDateIso(cycleDays, date);
}

export function formatEstimatedDistributionDate(
  reportedDate: string,
  cycleDays: number | null,
  fromDate = new Date(),
): string {
  const reported = formatReportedPayoutDate(reportedDate);
  if (reported) return reported;

  const estimate = estimateDistributionDateIso(cycleDays, fromDate);
  return formatReportedPayoutDate(estimate ?? '') ?? '—';
}

export function formatDistributionStatus(value: string, distributedAt = ''): string {
  const normalized = value.trim().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (distributedAt.trim()) return 'Distributed';
  if (['distributed', 'completed', 'complete', 'paid', 'settled'].includes(normalized.toLowerCase())) {
    return 'Awaiting update';
  }
  if (!normalized || normalized === '—' || /^not reported$/i.test(normalized)) return 'Awaiting update';
  return normalized
    .split(' ')
    .map(word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}
