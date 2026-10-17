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

export function parseRoiPercentageLabel(value: string): number | null {
  const matches = value.match(/-?\d+(?:[.,]\d+)?\s*%/g);
  if (!matches || matches.length !== 1) return null;
  const parsed = Number(matches[0].replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
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
