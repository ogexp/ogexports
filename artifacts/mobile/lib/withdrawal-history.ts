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
