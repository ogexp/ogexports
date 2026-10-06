export function parseWithdrawalAmount(value: string, availableBalance: number | null): number | null {
  if (availableBalance == null || !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > availableBalance) return null;
  return amount;
}

export type WithdrawalBankDetails = {
  bank_name: string;
  account_holder: string;
  account_number: string;
  iban: string;
  swift: string;
  branch: string;
};

export function buildWithdrawalRequest(
  amount: number,
  otp: string,
  transactionPassword: string,
  bankDetails: WithdrawalBankDetails,
  saveBankDetails: boolean,
  purpose: string,
  currency: string,
) {
  const note = purpose.trim();
  return {
    amount,
    otp: otp.trim(),
    transaction_password: transactionPassword,
    save_bank_details: saveBankDetails,
    bank_details: {
      bank_name: bankDetails.bank_name.trim(),
      account_holder: bankDetails.account_holder.trim(),
      account_number: bankDetails.account_number.trim(),
      iban: bankDetails.iban.trim(),
      swift: bankDetails.swift.trim(),
      branch: bankDetails.branch.trim(),
      purpose: note,
      currency: currency.trim().toUpperCase(),
    },
    ...(note ? { note } : {}),
  };
}
