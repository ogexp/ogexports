export function findFinancialDetailRecord(
  records: readonly Record<string, unknown>[],
  id: string,
  idFields: readonly string[],
): Record<string, unknown> | undefined {
  const expectedId = id.trim();
  if (!expectedId) return undefined;
  return records.find(item => idFields.some(field => {
    const value = item[field];
    return (typeof value === 'string' || typeof value === 'number')
      && String(value).trim() === expectedId;
  }));
}

export function findCachedTransactionDetail(
  kind: 'investment' | 'wallet',
  id: string,
  sources: {
    investments?: readonly Record<string, unknown>[];
    walletTransactions?: readonly Record<string, unknown>[];
  },
): Record<string, unknown> | undefined {
  return kind === 'investment'
    ? findFinancialDetailRecord(sources.investments ?? [], id, ['id', 'investment_id'])
    : findFinancialDetailRecord(sources.walletTransactions ?? [], id, ['id', 'transaction_id', 'wallet_transaction_id']);
}
