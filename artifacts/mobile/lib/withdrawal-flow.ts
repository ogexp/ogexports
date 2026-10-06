export function parseWithdrawalAmount(value: string, availableBalance: number | null): number | null {
  if (availableBalance == null || !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 1 || amount > availableBalance) return null;
  return amount;
}

export function buildWithdrawalRequest(
  amount: number,
  otp: string,
  transactionPassword: string,
  bankAccountId: string,
  purpose: string,
) {
  const note = purpose.trim();
  return {
    amount,
    otp: otp.trim(),
    transaction_password: transactionPassword,
    bank_account_id: bankAccountId,
    ...(note ? { note } : {}),
  };
}
