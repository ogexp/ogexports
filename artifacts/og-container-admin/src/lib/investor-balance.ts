import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useCurrency } from "@/lib/use-currency"
import { parseInvestorWithdrawalTerms } from "@/lib/investor-withdrawal-terms"

export const INVESTOR_DASHBOARD_QUERY_KEY = ["investor", "dashboard"] as const

export interface InvestorDashboardBalance {
  availableBalance: number | null
  currency: string
  serverWalletCurrency: string
  withdrawalFee: number | null
  withdrawalFeeUsd: number | null
  withdrawalFeeCurrency: string
  withdrawalProcessingTime: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {}
}

function parseOptionalAmount(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function parseCurrency(value: unknown): string {
  const currency = String(value ?? "").trim().toUpperCase()
  return /^[A-Z]{3}$/.test(currency) ? currency : ""
}

export function parseInvestorDashboardBalance(response: unknown): InvestorDashboardBalance {
  const envelope = asRecord(response)
  const dashboard = asRecord(envelope.data ?? response)
  const summary = asRecord(dashboard.summary)
  const wallet = asRecord(dashboard.wallet)
  const withdrawalTerms = parseInvestorWithdrawalTerms(response)

  return {
    // Match the Home dashboard's precedence exactly.
    availableBalance:
      parseOptionalAmount(summary.available_balance)
      ?? parseOptionalAmount(wallet.available_balance),
    currency: parseCurrency(wallet.currency),
    serverWalletCurrency: parseCurrency(wallet.currency),
    withdrawalFee: withdrawalTerms.fee,
    withdrawalFeeUsd: withdrawalTerms.feeUsd,
    withdrawalFeeCurrency: withdrawalTerms.feeCurrency,
    withdrawalProcessingTime: withdrawalTerms.processingTime,
  }
}

export function useInvestorDashboardBalance(enabled = true) {
  const currencyContext = useCurrency()

  return useQuery({
    queryKey: INVESTOR_DASHBOARD_QUERY_KEY,
    queryFn: () => api.get<unknown>("/api/investor/dashboard"),
    select: (response) => {
      const balance = parseInvestorDashboardBalance(response)
      return {
        ...balance,
        currency: balance.currency || currencyContext.walletCurrency || "USD",
      }
    },
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  })
}
