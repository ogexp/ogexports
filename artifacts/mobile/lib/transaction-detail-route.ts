export type InvestmentTransactionTarget = {
  id: string;
  kind: 'investment' | 'wallet';
};

function positiveId(value: unknown): string {
  const id = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : '';
}

export function investmentTransactionTarget(
  investmentId: unknown,
  walletTransactionId: unknown,
): InvestmentTransactionTarget | null {
  const positionId = positiveId(investmentId);
  if (positionId) return { id: positionId, kind: 'investment' };

  const transactionId = positiveId(walletTransactionId);
  return transactionId ? { id: transactionId, kind: 'wallet' } : null;
}
