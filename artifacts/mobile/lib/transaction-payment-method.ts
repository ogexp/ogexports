type TransactionRecord = Record<string, unknown>;

function usableMethod(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const method = String(value);
  return method.trim() ? method : '';
}

export function resolveTransactionPaymentMethod(
  sources: TransactionRecord[],
  isWithdrawalTransaction: boolean,
  nonWithdrawalFallback = '—',
): string {
  for (const source of sources) {
    for (const key of ['payment_method', 'method']) {
      const method = usableMethod(source[key]);
      if (method) return method;
    }
  }
  return isWithdrawalTransaction ? 'Bank Transfer' : nonWithdrawalFallback;
}
