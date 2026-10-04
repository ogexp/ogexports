import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useCurrency } from "@/lib/use-currency"
import { formatInvestorLedgerAmount } from "@/lib/format-investor-ledger"
import { Link } from "wouter"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCw, TrendingUp,
  ArrowUpRight, ArrowDownRight, Globe, Info, Loader2, ChevronLeft, ChevronRight, Download
} from "lucide-react"
import { api, unwrapPage, downloadAuthenticatedFile } from "@/lib/api"
import { notify } from "@/lib/notify"
import { paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/deposit-statuses"

const CURRENCY_META = [
  { code: "USD", name: "US Dollar",        symbol: "$",   flag: "🇺🇸" },
  { code: "GBP", name: "British Pound",    symbol: "£",   flag: "🇬🇧" },
  { code: "EUR", name: "Euro",             symbol: "€",   flag: "🇪🇺" },
  { code: "CNY", name: "Chinese Yuan",     symbol: "¥",   flag: "🇨🇳" },
  { code: "PKR", name: "Pakistani Rupee",  symbol: "₨",   flag: "🇵🇰" },
  { code: "SAR", name: "Saudi Riyal",      symbol: "ر.س", flag: "🇸🇦" },
  { code: "AED", name: "UAE Dirham",       symbol: "د.إ", flag: "🇦🇪" },
  { code: "OMR", name: "Omani Rial",       symbol: "ر.ع", flag: "🇴🇲" },
  { code: "QAR", name: "Qatari Riyal",     symbol: "ر.ق", flag: "🇶🇦" },
]

const TXN_PER_PAGE = 5

interface RateData { [key: string]: number }

interface DepositBreakdown {
  currency: string
  original_total: number
  converted_total: number
}

interface WalletTxn {
  id: string
  date: string
  ref: string
  type: string
  currency: string
  amount: number
  status: string
  desc: string
  originalAmount?: number
  originalCurrency?: string
}

function convertCurrency(amount: number, from: string, to: string, rates: RateData): number | null {
  const fromCode = String(from || "").toUpperCase()
  const toCode = String(to || "").toUpperCase()
  if (!fromCode || !toCode) return null
  if (fromCode === toCode) return amount
  const rFrom = fromCode === "USD" ? 1 : rates[fromCode]
  const rTo = toCode === "USD" ? 1 : rates[toCode]
  if (!rFrom || !rTo) return null
  const usd = fromCode === "USD" ? amount : amount / rFrom
  return toCode === "USD" ? usd : usd * rTo
}

function formatCurrencyAmount(amount: number, code: string, symbol: string): string {
  const formatted = amount.toLocaleString("en", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  if (code === "USD") return `$${formatted}`
  if (code === "PKR") return `PKR ${formatted}`
  return `${symbol}${formatted}`
}

function formatTxnDescription(t: any, walletCurrency: string): string {
  const type = String(t.type || "transaction").toLowerCase()
  const meta = t.meta || {}

  if (type === "exchange" || (meta.original_currency && meta.original_currency !== walletCurrency)) {
    const from = String(meta.original_currency || meta.from_currency || "").toUpperCase()
    const to = String(meta.target_currency || meta.to_currency || walletCurrency).toUpperCase()
    if (from && to) return `Currency exchange ${from} → ${to}`
  }

  const labels: Record<string, string> = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    investment: "Investment",
    profit: "Profit",
    distribution: "Distribution",
    dividend: "Dividend",
    bonus: "Bonus",
  }

  if (labels[type]) return labels[type]
  return String(t.type || "Transaction").replace(/_/g, " ")
}

function mapWalletTxn(t: any, walletCurrency: string): WalletTxn {
  const amount = Number(t.amount ?? 0)
  const direction = String(t.direction || "credit").toLowerCase()
  const signed = direction === "debit" ? -Math.abs(amount) : Math.abs(amount)
  const created = t.created_at ? new Date(t.created_at) : null
  const meta = t.meta || {}

  return {
    id: String(t.id),
    date: created
      ? created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    ref: t.reference || `TXN-${t.id}`,
    type: t.type || "Transaction",
    currency: walletCurrency,
    amount: signed,
    status: t.status || "completed",
    desc: formatTxnDescription(t, walletCurrency),
    originalAmount: meta.original_amount != null ? Number(meta.original_amount) : undefined,
    originalCurrency: meta.original_currency ? String(meta.original_currency).toUpperCase() : undefined,
  }
}

export default function InvestWallet() {
  const c = useCurrency()
  /** Strict USD-only UI when admin PKR display is off (or non-PK investor). */
  const usdOnly = !c.isPK
  const [selectedCurrency, setSelectedCurrency] = useState(c.isPK ? "PKR" : "USD")
  const [rates, setRates] = useState<RateData>({})
  const [ratesLoading, setRatesLoading] = useState(true)
  const [ratesError, setRatesError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState("")
  const [walletBalance, setWalletBalance] = useState(0)
  const [pendingBalance, setPendingBalance] = useState(0)
  const [walletCurrency, setWalletCurrency] = useState(c.walletCurrency)
  const fmtW = (amount: number, usdAmount?: number | null) =>
    formatInvestorLedgerAmount(c, amount, {
      usdAmount,
      ledgerCurrency: walletCurrency,
      // When display is USD-only, c.rate is 1 — omit so fmtWalletAmount uses live PKR cache.
      lockedRate: c.isPK && c.rate > 0 ? c.rate : null,
    })
  const [depositBreakdown, setDepositBreakdown] = useState<DepositBreakdown[]>([])
  const [txns, setTxns] = useState<WalletTxn[]>([])
  const [loading, setLoading] = useState(true)
  const initialCurrencySetRef = useRef(false)
  const [txnsLoading, setTxnsLoading] = useState(false)
  const [viewAll, setViewAll] = useState(false)
  const [txnPage, setTxnPage] = useState(1)
  const [txnMeta, setTxnMeta] = useState({ current_page: 1, last_page: 1, per_page: TXN_PER_PAGE, total: 0 })
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const breakdownMap = Object.fromEntries(
    depositBreakdown.map(b => [b.currency, b])
  )

  const currencies = CURRENCY_META.map(meta => ({
    ...meta,
    balance: breakdownMap[meta.code]?.original_total ?? 0,
    convertedTotal: breakdownMap[meta.code]?.converted_total ?? 0,
  }))

  const totalUSD = (() => {
    if (walletCurrency === "USD") return walletBalance
    const rate = rates[walletCurrency] || (walletCurrency === "PKR" ? c.rate : null)
    return rate ? walletBalance / rate : null
  })()

  const effectiveSelected = usdOnly ? "USD" : selectedCurrency
  const displayBalance = usdOnly
    ? (walletCurrency === "USD" ? walletBalance : totalUSD)
    : convertCurrency(walletBalance, walletCurrency, selectedCurrency, rates)
  const displayPending = usdOnly
    ? (walletCurrency === "USD"
      ? pendingBalance
      : convertCurrency(pendingBalance, walletCurrency, "USD", {
          ...rates,
          ...(walletCurrency === "PKR" && c.rate > 0 ? { PKR: c.rate } : {}),
        }))
    : convertCurrency(pendingBalance, walletCurrency, selectedCurrency, rates)
  const displayUSD = usdOnly
    ? displayBalance
    : (displayBalance != null
      ? convertCurrency(displayBalance, selectedCurrency, "USD", rates)
      : totalUSD)
  const curMeta = CURRENCY_META.find(x => x.code === effectiveSelected) || CURRENCY_META[0]

  async function fetchRates() {
    setRatesLoading(true)
    setRatesError(false)
    try {
      const res: any = await api.get("/api/investor/wallet/exchange-rates")
      const data = res?.data ?? res
      if (data?.rates) {
        setRates(data.rates)
        setLastUpdated(data.as_of ? new Date(data.as_of).toLocaleTimeString() : new Date().toLocaleTimeString())
      } else {
        setRatesError(true)
      }
    } catch {
      setRatesError(true)
      setRates({ GBP: 0.79, EUR: 0.92, CNY: 7.25, PKR: 278.5, SAR: 3.75, AED: 3.67, OMR: 0.385, QAR: 3.64 })
    } finally {
      setRatesLoading(false)
    }
  }

  const loadTransactions = useCallback(async (page: number, expanded: boolean, currencyFilter: string, baseCurrency: string) => {
    setTxnsLoading(true)
    try {
      const useClientFilter = currencyFilter !== baseCurrency
      const perPage = useClientFilter ? 100 : TXN_PER_PAGE
      const txnRes: any = await api.get("/api/investor/wallet/transactions", {
        page: useClientFilter ? 1 : page,
        per_page: perPage,
      })
      const pageData = unwrapPage(txnRes)
      const list = (pageData.data || []).map((t: any) => mapWalletTxn(t, baseCurrency))
      setTxns(list)

      if (useClientFilter) {
        const filtered = list.filter((t: WalletTxn) => t.originalCurrency === currencyFilter)
        const lastPage = Math.max(1, Math.ceil(filtered.length / TXN_PER_PAGE))
        setTxnMeta({
          current_page: page,
          last_page: lastPage,
          per_page: TXN_PER_PAGE,
          total: filtered.length,
        })
      } else {
        setTxnMeta(pageData.meta)
      }
    } catch {
      setTxns([])
      setTxnMeta({ current_page: 1, last_page: 1, per_page: TXN_PER_PAGE, total: 0 })
    } finally {
      setTxnsLoading(false)
    }
  }, [])

  async function loadWallet() {
    setLoading(true)
    try {
      const walletRes: any = await api.get("/api/investor/wallet")
      const wallet = walletRes?.data ?? walletRes
      const bal = Number(wallet?.available_balance ?? 0)
      const pending = Number(wallet?.pending_balance ?? 0)
      const cur = String(wallet?.currency || "USD").toUpperCase()
      setWalletBalance(bal)
      setPendingBalance(pending)
      setWalletCurrency(cur)
      if (!initialCurrencySetRef.current) {
        setSelectedCurrency(usdOnly ? "USD" : cur)
        initialCurrencySetRef.current = true
      }
      setDepositBreakdown(Array.isArray(wallet?.deposit_breakdown) ? wallet.deposit_breakdown : [])
    } catch {
      setWalletBalance(0)
      setPendingBalance(0)
      setDepositBreakdown([])
      setTxns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
    loadWallet()
  }, [])

  // Lock picker to USD when admin disables PKR display (or non-PK user).
  useEffect(() => {
    if (usdOnly) {
      setSelectedCurrency("USD")
    } else if (walletCurrency && initialCurrencySetRef.current) {
      setSelectedCurrency(walletCurrency)
    }
  }, [usdOnly, walletCurrency])

  useEffect(() => {
    if (loading) return
    const filterCurrency = usdOnly ? walletCurrency : selectedCurrency
    loadTransactions(viewAll ? txnPage : 1, viewAll, filterCurrency, walletCurrency)
  }, [viewAll, txnPage, selectedCurrency, walletCurrency, loading, loadTransactions, usdOnly])

  useEffect(() => {
    setTxnPage(1)
    setViewAll(false)
  }, [selectedCurrency])

  const cur = currencies.find(x => x.code === effectiveSelected) || currencies[0]

  const filteredTxns = useMemo(() => {
    if (usdOnly) {
      const start = (txnPage - 1) * TXN_PER_PAGE
      return viewAll ? txns.slice(start, start + TXN_PER_PAGE) : txns.slice(0, TXN_PER_PAGE)
    }
    const filtered = txns.filter(t => {
      if (selectedCurrency === walletCurrency) return true
      return t.originalCurrency === selectedCurrency
    })

    if (selectedCurrency !== walletCurrency) {
      const start = (txnPage - 1) * TXN_PER_PAGE
      return viewAll ? filtered.slice(start, start + TXN_PER_PAGE) : filtered.slice(0, TXN_PER_PAGE)
    }

    return filtered
  }, [txns, selectedCurrency, walletCurrency, viewAll, txnPage, usdOnly])

  const displayCount = usdOnly
    ? txnMeta.total
    : selectedCurrency === walletCurrency
      ? txnMeta.total
      : txns.filter(t => t.originalCurrency === selectedCurrency).length

  async function handleDownloadPdf(txn: WalletTxn) {
    setDownloadingId(txn.id)
    try {
      await downloadAuthenticatedFile(`/api/investor/wallet/transactions/${txn.id}/pdf`, txn.ref)
    } catch {
      notify.error("Could not download PDF. Please try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <InvestPortalLayout title="Multi-Currency Wallet" subtitle="Manage balances, exchange rates and transactions">
      <div className="space-y-8">

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading wallet…
          </div>
        )}

        {/* Top stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card border-accent/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#C6A96920" }}>
                <Wallet className="w-5 h-5" style={{ color: "#C6A969" }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  Available Balance ({usdOnly ? "USD" : effectiveSelected})
                </p>
                <p className="text-xl font-heading font-bold">
                  {usdOnly
                    ? fmtW(walletBalance)
                    : displayBalance != null
                      ? formatCurrencyAmount(displayBalance, selectedCurrency, curMeta.symbol)
                      : ratesLoading ? "…" : "—"}
                </p>
                {pendingBalance > 0 && (
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Pending: {usdOnly
                      ? fmtW(pendingBalance)
                      : displayPending != null
                        ? formatCurrencyAmount(displayPending, selectedCurrency, curMeta.symbol)
                        : fmtW(pendingBalance)}
                  </p>
                )}
                {!usdOnly && displayBalance == null && !ratesLoading && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rates unavailable</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {usdOnly || effectiveSelected === "USD" ? "Portfolio Value" : "USD Equivalent"}
                </p>
                <p className="text-xl font-heading font-bold">
                  {displayUSD != null
                    ? `$${Number(displayUSD).toLocaleString("en", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Exchange Rate Feed</p>
                <p className="text-sm font-semibold">
                  {ratesLoading ? "Fetching..." : ratesError ? "Cached" : `Live · ${lastUpdated}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Rates Banner — hidden in USD-only mode */}
        {!usdOnly && (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent" /> Live Exchange Rates
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">1 USD equals — {ratesLoading ? "loading..." : ratesError ? "using cached rates" : `updated ${lastUpdated}`}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { fetchRates(); loadWallet() }} disabled={ratesLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${ratesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {CURRENCY_META.filter(x => x.code !== "USD").map(meta => {
                  const rate = rates[meta.code]
                  return (
                    <div key={meta.code} className="flex flex-col gap-1 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                      <span className="text-lg">{meta.flag}</span>
                      <span className="text-xs font-bold text-foreground">{meta.code}</span>
                      <span className="text-sm font-mono font-semibold text-accent">
                        {ratesLoading ? "—" : rate ? rate.toFixed(meta.code === "PKR" ? 1 : 4) : "—"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{meta.name}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className={`grid gap-6 ${usdOnly ? "" : "lg:grid-cols-3"}`}>
          {!usdOnly && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Deposit Breakdown</h3>
              {currencies.map(meta => {
                const rate = rates[meta.code]
                const usd = meta.code === "USD" ? meta.balance : rate ? meta.balance / rate : null
                const isActive = selectedCurrency === meta.code
                const hasDeposits = meta.balance > 0
                return (
                  <button
                    key={meta.code}
                    onClick={() => setSelectedCurrency(meta.code)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-accent bg-accent/8 shadow-sm"
                        : "border-border hover:border-accent/40 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-2xl shrink-0">{meta.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{meta.code}</span>
                        <span className={`text-sm font-bold font-mono ${isActive ? "text-accent" : hasDeposits ? "text-foreground" : "text-muted-foreground"}`}>
                          {meta.symbol}{meta.balance.toLocaleString("en", { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">{meta.name}</span>
                        {hasDeposits && meta.code !== walletCurrency && meta.convertedTotal > 0 && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            ≈ {fmtW(meta.convertedTotal)}
                          </span>
                        )}
                        {c.dualEnabled && usd !== null && meta.code !== "USD" && hasDeposits && (
                          <span className="text-[10px] text-muted-foreground shrink-0">≈ ${usd.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className={usdOnly ? "space-y-5" : "lg:col-span-2 space-y-5"}>
            <Card className="glass-card border-accent/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {usdOnly ? "USD Wallet Balance" : `${effectiveSelected} Wallet Balance`}
                    </p>
                    <p className="text-4xl font-heading font-bold mt-1">
                      {usdOnly
                        ? fmtW(walletBalance)
                        : displayBalance != null
                          ? formatCurrencyAmount(displayBalance, selectedCurrency, cur.symbol)
                          : ratesLoading ? "…" : "—"}
                    </p>
                    {!usdOnly && selectedCurrency !== walletCurrency && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Ledger: {fmtW(walletBalance)}
                      </p>
                    )}
                    {!usdOnly && c.dualEnabled && selectedCurrency === walletCurrency && displayUSD != null && walletCurrency !== "USD" && (
                      <p className="text-sm text-muted-foreground mt-1">≈ ${Number(displayUSD).toLocaleString("en", { maximumFractionDigits: 2 })} USD</p>
                    )}
                    {!usdOnly && c.dualEnabled && selectedCurrency !== walletCurrency && displayBalance != null && displayUSD != null && selectedCurrency !== "USD" && (
                      <p className="text-sm text-muted-foreground mt-1">≈ ${Number(displayUSD).toLocaleString("en", { maximumFractionDigits: 2 })} USD</p>
                    )}
                    {!usdOnly && displayBalance == null && !ratesLoading && (
                      <p className="text-xs text-muted-foreground mt-2">Rates unavailable for conversion.</p>
                    )}
                    {!usdOnly && selectedCurrency !== walletCurrency && cur.balance > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Deposits in {selectedCurrency}: {cur.symbol}{cur.balance.toLocaleString("en", { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <span className="text-4xl">{usdOnly ? "🇺🇸" : cur.flag}</span>
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1" asChild>
                    <Link href="/invest/deposit">
                      <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit
                    </Link>
                  </Button>
                  <Button className="flex-1" variant="outline" asChild>
                    <Link href="/invest/withdraw">
                      <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {!usdOnly && selectedCurrency !== "USD" && (
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold">Exchange Rate — {selectedCurrency}/USD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Buy Rate (USD → {cur.code})</p>
                      <p className="text-xl font-heading font-bold text-accent font-mono">
                        {ratesLoading ? "—" : rates[cur.code] ? `${cur.symbol}${rates[cur.code].toFixed(4)}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sell Rate ({cur.code} → USD)</p>
                      <p className="text-xl font-heading font-bold font-mono">
                        {ratesLoading ? "—" : rates[cur.code] ? `$${(1 / rates[cur.code]).toFixed(6)}` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    Indicative rate. Final rate confirmed at transaction time.
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="font-heading text-base">
                    {usdOnly
                      ? "Transactions"
                      : selectedCurrency === walletCurrency
                        ? `${walletCurrency} Transactions`
                        : `${cur.code} Deposit History`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {txnsLoading ? "Loading…" : `${displayCount} transaction${displayCount !== 1 ? "s" : ""} found`}
                  </p>
                </div>
                {!viewAll && displayCount > TXN_PER_PAGE && (
                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setViewAll(true)}>
                    View All ({displayCount})
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {txnsLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTxns.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No transactions{usdOnly ? "" : ` in ${cur.code}`} yet.
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-border">
                      {filteredTxns.map(t => {
                        const isCredit = t.amount > 0
                        const amountLabel = usdOnly || selectedCurrency === walletCurrency
                          ? fmtW(Math.abs(t.amount))
                          : formatCurrencyAmount(Math.abs(t.amount), selectedCurrency, cur.symbol)
                        return (
                          <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isCredit ? "bg-emerald-500/15" : "bg-red-500/15"
                            }`}>
                              {isCredit
                                ? <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                                : <ArrowUpRight className="w-4 h-4 text-red-400" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{t.desc}</p>
                              <p className="text-xs text-muted-foreground">
                                {t.date} · {t.ref} · ID: {t.id}
                                {!usdOnly && t.originalCurrency && t.originalCurrency !== walletCurrency && t.originalAmount != null && (
                                  <> · {t.originalCurrency} {t.originalAmount.toLocaleString()}</>
                                )}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end gap-1">
                              <p className={`text-sm font-bold font-mono ${isCredit ? "text-emerald-500" : "text-red-400"}`}>
                                {amountLabel}
                              </p>
                              <div className="flex items-center gap-1">
                                <Badge className={`text-[10px] border-0 capitalize ${paymentStatusBadgeClass(t.status)}`}>
                                  {paymentStatusLabel(t.status)}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={downloadingId === t.id}
                                  onClick={() => handleDownloadPdf(t)}
                                  title="Download PDF"
                                >
                                  {downloadingId === t.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Download className="w-3.5 h-3.5" />
                                  }
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {viewAll && txnMeta.last_page > 1 && (
                      <div className="flex items-center justify-center gap-3 py-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={txnPage <= 1}
                          onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {txnMeta.current_page} of {txnMeta.last_page}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={txnPage >= txnMeta.last_page}
                          onClick={() => setTxnPage(p => p + 1)}
                        >
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            {usdOnly
              ? "Amounts are shown in USD. Your ledger may be stored in another currency; conversions use the current exchange rate."
              : `Your wallet balance is stored in ${walletCurrency}. Deposits in other currencies are converted at prevailing exchange rates on approval and summed into your ${walletCurrency} balance. Rates are indicative; final conversion uses the rate at approval time.`}
          </span>
        </div>
      </div>
    </InvestPortalLayout>
  )
}
