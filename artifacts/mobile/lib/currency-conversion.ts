export function convertCurrencyAmount(
  value: number | null,
  sourceCurrency: string,
  targetCurrency: string,
  rates: Record<string, number>,
  usdToPkrRate: number | null = null,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;

  const source = sourceCurrency.trim().toUpperCase();
  const target = targetCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(source) || !/^[A-Z]{3}$/.test(target)) return null;
  if (source === target) return value;

  if (usdToPkrRate != null && Number.isFinite(usdToPkrRate) && usdToPkrRate > 0) {
    if (source === 'USD' && target === 'PKR') return finiteResult(value * usdToPkrRate);
    if (source === 'PKR' && target === 'USD') return finiteResult(value / usdToPkrRate);
  }

  const sourceRate = rates[source];
  const targetRate = rates[target];
  if (sourceRate == null || targetRate == null || sourceRate <= 0 || targetRate <= 0) return null;
  return finiteResult(value / sourceRate * targetRate);
}

function finiteResult(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}
