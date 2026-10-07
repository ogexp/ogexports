export interface InvestorWithdrawalTerms {
  fee: number | null
  feeUsd: number | null
  feeCurrency: string
  processingTime: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {}
}

function parseAmount(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function parseCurrency(value: unknown): string {
  const currency = String(value ?? "").trim().toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : ""
}

export function parseInvestorWithdrawalTerms(response: unknown): InvestorWithdrawalTerms {
  const envelope = asRecord(response)
  const dashboard = asRecord(envelope.data ?? response)
  const wallet = asRecord(dashboard.wallet)

  return {
    fee: parseAmount(dashboard.withdrawal_fee) ?? parseAmount(wallet.withdrawal_fee),
    feeUsd: parseAmount(dashboard.withdrawal_fee_usd) ?? parseAmount(wallet.withdrawal_fee_usd),
    feeCurrency: parseCurrency(dashboard.withdrawal_fee_currency ?? wallet.withdrawal_fee_currency),
    processingTime: String(
      dashboard.estimated_processing_time
      ?? wallet.estimated_processing_time
      ?? "",
    ).trim(),
  }
}

export function withdrawalFeeTermsConfirmed(
  terms: InvestorWithdrawalTerms,
  walletCurrency: string,
): boolean {
  const currency = parseCurrency(walletCurrency)
  return currency !== ""
    && terms.fee != null
    && terms.fee >= 0
    && terms.feeUsd != null
    && terms.feeUsd >= 0
    && terms.feeCurrency === currency
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
    return null
  }

  return Math.max(0, Math.round((availableBalance - withdrawalFee) * 100) / 100)
}
