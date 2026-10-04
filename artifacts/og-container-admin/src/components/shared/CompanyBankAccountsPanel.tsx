import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertCircle, ChevronRight, Copy, Landmark, Loader2, RefreshCw, ShieldCheck,
} from "lucide-react"
import { fetchInvestorPaymentBankAccounts, type BankAccount } from "@/lib/bank-accounts"
import { notify } from "@/lib/notify"

export interface CompanyBankAccountsPanelProps {
  selectedId: string
  onSelect: (id: string, account?: BankAccount) => void
  title?: string
  description?: string
  footerHint?: string
  queryKey?: string[]
}

export function CompanyBankAccountsPanel({
  selectedId,
  onSelect,
  title = "Send funds to an OG Exports account",
  description = "Transfer the exact amount to one of the active company accounts below, then upload proof of payment.",
  footerHint = "Use your payment reference in the bank transfer description. Funds are credited after finance verification.",
  queryKey = ["payment-bank-accounts"],
}: CompanyBankAccountsPanelProps) {
  const [expandedId, setExpandedId] = useState("")

  const {
    data: bankAccounts = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<BankAccount[]>({
    queryKey,
    queryFn: () => fetchInvestorPaymentBankAccounts(),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (bankAccounts.length === 0) {
      setExpandedId("")
      return
    }
    const defaultId = bankAccounts.find(a => a.isDefault)?.id || bankAccounts[0].id
    const validSelected = selectedId && bankAccounts.some(a => a.id === selectedId)
    if (!validSelected) {
      onSelect(defaultId, bankAccounts.find(a => a.id === defaultId))
      setExpandedId(defaultId)
      return
    }
    setExpandedId(prev => (prev && bankAccounts.some(a => a.id === prev) ? prev : selectedId))
    // Intentionally omit onSelect from deps — parent may pass an inline handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccounts, selectedId])

  function copyBankDetail(value: string, label: string) {
    if (!navigator.clipboard) {
      notify.error("Clipboard is unavailable in this browser")
      return
    }
    void navigator.clipboard.writeText(value)
      .then(() => notify.success(`${label} copied`))
      .catch(() => notify.error(`Unable to copy ${label.toLowerCase()}`))
  }

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 via-background to-amber-500/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Landmark className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold">{title}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="h-3 w-3" /> Verified account
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background/70 p-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading verified payment accounts…
        </div>
      ) : bankAccounts.length === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700">
          Payment accounts are temporarily unavailable. Please refresh before continuing.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bankAccounts.map(account => {
            const selected = selectedId === account.id
            const expanded = expandedId === account.id
            return (
              <div
                key={account.id}
                className={`overflow-hidden rounded-xl border bg-background transition-all ${
                  selected
                    ? "border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm"
                    : account.isDefault
                      ? "border-amber-500/40"
                      : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelect(account.id, account)
                    setExpandedId(expanded ? "" : account.id)
                  }}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/30"
                  aria-expanded={expanded}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-emerald-600" : "border-muted-foreground/40"}`}>
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-bold">{account.bankName}</div>
                        {account.isDefault && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">Recommended</span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {account.accountTitle} · {account.currency}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700">Active</span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border/70 bg-muted/20 p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["Bank name", account.bankName],
                        ["Account title", account.accountTitle],
                        ["Account number", account.accountNumber],
                        ["IBAN", account.iban],
                        ["SWIFT / BIC", account.swift],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                            <div className="truncate font-mono text-xs font-semibold">{value}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyBankDetail(value, label)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                            aria-label={`Copy ${label}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {account.notes && (
                      <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">{account.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {footerHint && (
        <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{footerHint}</span>
        </div>
      )}
    </div>
  )
}
