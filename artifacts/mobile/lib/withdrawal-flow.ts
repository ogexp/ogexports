export const FALLBACK_WITHDRAWAL_FEE_USD = 2;
export const FALLBACK_WITHDRAWAL_PROCESSING_TIME = '1 to 2 working days';
export const MINIMUM_WITHDRAWAL_USD = 100;

export function resolveWithdrawalDisplayTerms({
  apiFee,
  apiFeeUsd,
  apiFeeCurrency,
  apiProcessingTime,
  apiMinimumWithdrawal,
  apiMinimumWithdrawalUsd,
  apiMinimumWithdrawalCurrency,
  walletCurrency,
}: {
  apiFee: number | null;
  apiFeeUsd: number | null;
  apiFeeCurrency: string;
  apiProcessingTime: string;
  apiMinimumWithdrawal: number | null;
  apiMinimumWithdrawalUsd: number | null;
  apiMinimumWithdrawalCurrency: string;
  walletCurrency: string;
}) {
  const normalizedWalletCurrency = walletCurrency.trim().toUpperCase();
  const normalizedFeeCurrency = apiFeeCurrency.trim().toUpperCase();
  const normalizedMinimumCurrency = apiMinimumWithdrawalCurrency.trim().toUpperCase();
  const normalizedProcessingTime = apiProcessingTime.trim();
  const processingTime = normalizedProcessingTime && normalizedProcessingTime !== '—'
    ? normalizedProcessingTime
    : FALLBACK_WITHDRAWAL_PROCESSING_TIME;

  return {
    fee: apiFee ?? (normalizedWalletCurrency === 'USD' ? FALLBACK_WITHDRAWAL_FEE_USD : null),
    feeUsd: apiFeeUsd ?? FALLBACK_WITHDRAWAL_FEE_USD,
    feeCurrency: normalizedFeeCurrency || normalizedWalletCurrency,
    processingTime,
    minimumWithdrawalUsd: MINIMUM_WITHDRAWAL_USD,
    minimumWithdrawalAmount: normalizedWalletCurrency === 'USD'
      ? MINIMUM_WITHDRAWAL_USD
      : (apiMinimumWithdrawalUsd === MINIMUM_WITHDRAWAL_USD ? apiMinimumWithdrawal : null),
    minimumWithdrawalCurrency: normalizedMinimumCurrency || normalizedWalletCurrency,
    serverConfirmed:
      apiFee !== null
      && apiFeeUsd === FALLBACK_WITHDRAWAL_FEE_USD
      && normalizedWalletCurrency !== ''
      && normalizedFeeCurrency === normalizedWalletCurrency
      && apiMinimumWithdrawal !== null
      && apiMinimumWithdrawalUsd === MINIMUM_WITHDRAWAL_USD
      && normalizedMinimumCurrency === normalizedWalletCurrency
      && (normalizedWalletCurrency !== 'USD' || apiMinimumWithdrawal === MINIMUM_WITHDRAWAL_USD),
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
  minimumPayout = 0.01,
): number | null {
  if (availableBalance == null || !value.trim()) return null;
  const amount = Number(value);
  if (
    !Number.isFinite(amount)
    || !Number.isFinite(withdrawalFee)
    || !Number.isFinite(minimumPayout)
    || withdrawalFee < 0
    || minimumPayout <= 0
    || amount < minimumPayout
  ) return null;
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
