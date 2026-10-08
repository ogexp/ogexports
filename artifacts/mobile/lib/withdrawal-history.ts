export function savedUsdEquivalentForRecordedAmount(
  recordedAmount: number | null,
  currency: string,
  storedUsdAmount: number | null,
  exchangeRate: number | null,
): number | null {
  if (recordedAmount == null || !Number.isFinite(recordedAmount)) return null;
  if (storedUsdAmount != null && Number.isFinite(storedUsdAmount)) return storedUsdAmount;
  if (currency.trim().toUpperCase() !== 'PKR') return null;
  if (exchangeRate == null || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return null;

  return Math.round((recordedAmount / exchangeRate) * 100) / 100;
}

export function withdrawalPaymentMethod(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const candidate = String(value).trim();
    if (!candidate || /^(?:[-–—]+|not recorded|not provided|not available|not applicable|n\/a|null|undefined)$/i.test(candidate)) {
      continue;
    }

    return candidate
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  return 'Bank Transfer';
}
