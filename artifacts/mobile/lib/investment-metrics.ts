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
