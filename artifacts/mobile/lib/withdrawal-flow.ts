export const FALLBACK_WITHDRAWAL_FEE_USD = 2;
export const FALLBACK_WITHDRAWAL_PROCESSING_TIME = '1 to 2 working days';

export function resolveWithdrawalDisplayTerms({
  apiFee,
  apiFeeUsd,
  apiFeeCurrency,
  apiProcessingTime,
  walletCurrency,
}: {
  apiFee: number | null;
  apiFeeUsd: number | null;
  apiFeeCurrency: string;
  apiProcessingTime: string;
  walletCurrency: string;
}) {
  const normalizedWalletCurrency = walletCurrency.trim().toUpperCase();
  const normalizedFeeCurrency = apiFeeCurrency.trim().toUpperCase();
  const normalizedProcessingTime = apiProcessingTime.trim();
  const processingTime = normalizedProcessingTime && normalizedProcessingTime !== '—'
    ? normalizedProcessingTime
    : FALLBACK_WITHDRAWAL_PROCESSING_TIME;

  return {
    fee: apiFee ?? (normalizedWalletCurrency === 'USD' ? FALLBACK_WITHDRAWAL_FEE_USD : null),
    feeUsd: apiFeeUsd ?? FALLBACK_WITHDRAWAL_FEE_USD,
    feeCurrency: normalizedFeeCurrency || normalizedWalletCurrency,
    processingTime,
    serverConfirmed:
      apiFee !== null
      && apiFeeUsd === FALLBACK_WITHDRAWAL_FEE_USD
      && normalizedWalletCurrency !== ''
      && normalizedFeeCurrency === normalizedWalletCurrency,
  };
}

export function maximumWithdrawalPayout(
  availableBalance: number | null,
  withdrawalFee: number | null,
): number | null {
  if (
    availableBalance == null
    || withdrawalFee == null
    || !Number.isFinite(availableBalance)
    || !Number.isFinite(withdrawalFee)
    || availableBalance < 0
    || withdrawalFee < 0
  ) {
    return null;
  }

  return Math.max(0, Math.round((availableBalance - withdrawalFee) * 100) / 100);
}

export function parseWithdrawalAmount(
  value: string,
  availableBalance: number | null,
  withdrawalFee = 0,
): number | null {
  if (availableBalance == null || !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isFinite(withdrawalFee) || withdrawalFee < 0 || amount <= 0) return null;
  if (Math.round((amount + withdrawalFee) * 100) > Math.round(availableBalance * 100)) return null;
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
