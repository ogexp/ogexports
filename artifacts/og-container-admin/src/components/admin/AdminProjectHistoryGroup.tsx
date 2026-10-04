import { useMemo } from "react"
import {
  Anchor, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock3,
  DollarSign, Factory, Mail, MapPin, Package, Ship, TrendingUp, UserRound, Wallet, XCircle,
} from "lucide-react"
import type { AdminProjectDeposit } from "@/lib/admin-data"
import { formatAdminUsd, formatProjectInvestmentAmount } from "@/lib/admin-currency"
import {
  INVESTMENT_STATUS_LABELS,
  INVESTMENT_STATUS_OPTIONS,
  investmentStatusBadgeStyle,
} from "@/lib/investment-statuses"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

type Props = {
  project: AdminProjectDeposit["project"]
  items: AdminProjectDeposit[]
  expanded: boolean
  onToggle: () => void
  actionId: string | null
  onApprove: (item: AdminProjectDeposit) => void
  onReject: (item: AdminProjectDeposit) => void
  onStatusChange: (item: AdminProjectDeposit, status: AdminProjectDeposit["status"]) => void
  onOpenProject: (projectId: string) => void
}

function money(value: number | undefined | null, currencyOrInvestor: string | any = "USD") {
  if (value == null || !Number.isFinite(Number(value))) return "—"
  if (currencyOrInvestor && typeof currencyOrInvestor === "object") {
    return formatProjectInvestmentAmount(Number(value), currencyOrInvestor)
  }
  const currency = String(currencyOrInvestor || "USD").toUpperCase()
  if (currency === "USD") return formatAdminUsd(Number(value))
  // Non-USD project totals stay single-currency; PK investor dual format uses investor object.
  return formatAdminUsd(Number(value))
}

function date(value?: string | null) {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function typeLabel(type?: string) {
  const normalized = String(type || "").toLowerCase()
  if (normalized === "container") return "Container Export"
  if (normalized === "feed") return "Feed Mill"
  if (normalized === "ricemill") return "Rice Mill"
  if (normalized === "plant") return "Processing Plant"
  return normalized ? normalized.replace(/_/g, " ") : "Investment Project"
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    funding: "Funding Open",
    fully_funded: "Fully Funded",
    investment_confirmed: "Investment Confirmed",
    cargo_loaded: "Cargo Loaded",
    in_transit: "In Transit",
    custom_clearance: "Customs Clearance",
    settled: "Settled",
    under_construction: "Under Construction",
    active: "Active",
    operational: "Operational",
    completed: "Completed",
    closed: "Closed",
    draft: "Draft",
    coming_soon: "Coming Soon",
  }
  return labels[String(status || "").toLowerCase()] || String(status || "—").replace(/_/g, " ")
}

function StatusPill({ status }: { status?: string }) {
  const normalized = String(status || "").toLowerCase()
  const palette = normalized === "completed" || normalized === "settled" || normalized === "operational"
    ? { bg: "#ecfdf5", color: "#047857" }
    : normalized === "active" || normalized === "in_transit" || normalized === "under_construction"
      ? { bg: "#eff6ff", color: "#2563eb" }
      : normalized === "closed" || normalized === "cancelled" || normalized === "rejected"
        ? { bg: "#fef2f2", color: "#dc2626" }
        : { bg: "#fffbeb", color: "#b45309" }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold" style={palette}>
      {statusLabel(status)}
    </span>
  )
}

function InvestmentStatusPill({ status }: { status: AdminProjectDeposit["status"] }) {
  const palette = investmentStatusBadgeStyle(status)
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap"
      style={{ background: palette.bg, color: palette.color }}
    >
      {INVESTMENT_STATUS_LABELS[status]}
    </span>
  )
}

function DetailValue({
  label,
  value,
  icon: Icon,
  emphasize,
}: {
  label: string
  value: string
  icon: typeof MapPin
  emphasize?: boolean
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={emphasize
          ? "truncate font-mono text-sm font-bold text-foreground"
          : "truncate text-xs font-semibold text-foreground"
        }>
          {value || "—"}
        </div>
      </div>
    </div>
  )
}

export function AdminProjectHistoryGroup({
  project,
  items,
  expanded,
  onToggle,
  actionId,
  onApprove,
  onReject,
  onStatusChange,
  onOpenProject,
}: Props) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.investedAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.investedAt || b.createdAt || 0).getTime()
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    })
  }, [items])

  const stats = useMemo(() => {
    const currency = items.find(item => item.amountCurrency)?.amountCurrency || "USD"
    const approved = project.raised_amount ?? items.filter(item => item.status === "active").reduce((sum, item) => sum + item.amount, 0)
    const pending = project.pending_reserved ?? items.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0)
    const target = project.target_amount ?? 0
    const investorCount = project.investors_count ?? new Set(items.map(item => item.investor.id)).size
    return {
      currency,
      approved,
      pending,
      target,
      remaining: project.remaining_amount ?? Math.max(0, target - approved - pending),
      investorCount,
      roi: project.expected_return_pct ?? 0,
    }
  }, [items, project])

  const isContainer = project.type === "container"
  const Icon = isContainer ? Ship : Factory
  const projectStatus = statusLabel(project.status)

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border/80 bg-gradient-to-r from-[#f5f9f6] via-white to-[#fffaf0] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${isContainer ? "#2c6e53" : "#7d5b16"}, ${EMERALD})` }}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                  {project.reference || `PROJECT #${project.id}`}
                </span>
                <StatusPill status={project.status} />
              </div>
              <h2 className="truncate text-base font-bold text-foreground sm:text-lg">{project.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {typeLabel(project.type)} · {[project.commodity, project.variety].filter(Boolean).join(" · ") || project.description || "Investor funding history"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onOpenProject(project.id)} className="rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted">
              Open project controls
            </button>
            <button type="button" onClick={onToggle} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted" aria-label={expanded ? "Collapse project" : "Expand project"}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Target", value: money(stats.target, stats.currency), icon: TrendingUp, color: GOLD },
            { label: "Approved", value: money(stats.approved, stats.currency), icon: CheckCircle2, color: GREEN },
            { label: "Pending", value: money(stats.pending, stats.currency), icon: Clock3, color: "#d97706" },
            { label: "Remaining", value: money(stats.remaining, stats.currency), icon: DollarSign, color: EMERALD },
            { label: "Investors", value: String(stats.investorCount), icon: UserRound, color: "#2563eb" },
            { label: "Expected ROI", value: stats.roi ? `${stats.roi}%` : "—", icon: TrendingUp, color: "#7c3aed" },
          ].map(({ label, value, icon: StatIcon, color }) => (
            <div key={label} className="rounded-xl border border-border/70 bg-white/80 p-3">
              <StatIcon className="mb-1 h-3.5 w-3.5" style={{ color }} />
              <div className="truncate text-sm font-bold" style={{ color }}>{value}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-border/70 bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {isContainer ? (
            <>
              <DetailValue label="Route" value={[project.origin, project.destination].filter(Boolean).join(" → ")} icon={MapPin} />
              <DetailValue label="Vessel / Line" value={[project.vessel, project.shipping_line].filter(Boolean).join(" · ")} icon={Anchor} />
              <DetailValue label="Ports" value={[project.port_of_loading, project.port_of_discharge].filter(Boolean).join(" → ")} icon={Ship} />
              <DetailValue label="Schedule" value={[project.etd && `ETD ${date(project.etd)}`, project.eta && `ETA ${date(project.eta)}`].filter(Boolean).join(" · ")} icon={CalendarDays} />
            </>
          ) : (
            <>
              <DetailValue label="Facility Location" value={project.location || project.origin || "—"} icon={MapPin} />
              <DetailValue label="Current Stage" value={project.current_project_stage || projectStatus} icon={Factory} />
              <DetailValue label="Completion" value={date(project.completion || String(project.meta?.completion || ""))} icon={CalendarDays} />
              <DetailValue label="Investment Term" value={project.investment_period_days ? `${project.investment_period_days} days` : "—"} icon={Building2} />
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Investor deposit history</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Every wallet reservation and approval recorded against this project.</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{sortedItems.length} record{sortedItems.length === 1 ? "" : "s"}</span>
          </div>

          <div className="space-y-3">
            {sortedItems.map(item => {
              const expectedProfit = item.profitAmount ?? (item.amount * Number(project.expected_return_pct || 0) / 100)
              const expectedProfitPkr = item.profitAmountPkr
                ?? (item.amountPkr != null
                  ? item.amountPkr * Number(project.expected_return_pct || 0) / 100
                  : null)
              const totalReturn = item.totalReturn ?? (item.status === "completed" ? item.amount + expectedProfit : null)
              const totalReturnPkr = item.amountPkr != null && expectedProfitPkr != null
                ? item.amountPkr + expectedProfitPkr
                : null
              const busy = actionId?.startsWith(item.id)
              const investorForMoney = {
                ...item.investor,
                amount_currency: item.amountCurrency || item.investor.currency,
                display_pkr: item.investor.displayPkr ?? item.investor.display_pkr,
                country: item.investor.country,
                wallet_currency: item.investor.walletCurrency || item.investor.currency,
                amount_pkr: item.amountPkr,
              }
              return (
                <article key={item.id} className="rounded-xl border border-border/80 bg-background/70 p-3.5 transition-colors hover:border-primary/30 sm:p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f2ec] text-[#0f3d2e]">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold">{item.investor.name || "Unknown investor"}</h4>
                            <InvestmentStatusPill status={item.status} />
                            {item.reference && (
                              <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground border border-primary/25 bg-primary/5 px-3 py-1.5 rounded-lg">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ref</span>
                                {item.reference}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{item.investor.email || "No email"}</span>
                            {item.investor.country && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.investor.country}</span>}
                            {item.investor.id && <span className="font-mono">Investor ID: {item.investor.id}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailValue label="Investment Reference" value={item.reference} icon={Package} emphasize />
                        <DetailValue label="Payment Source" value={item.paymentSourceLabel || "—"} icon={Wallet} />
                        <DetailValue label="Submitted" value={date(item.investedAt || item.createdAt)} icon={CalendarDays} />
                        <DetailValue label="Approved" value={date(item.approvedAt)} icon={CheckCircle2} />
                        <DetailValue label="Project Lifecycle" value={projectStatus} icon={TrendingUp} />
                      </div>

                      {item.paymentSource === "wallet" && (item.walletFundingDeposits?.length ?? 0) > 0 && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wallet funded via</span>
                            {[...new Set(item.walletFundingDeposits!.map(dep => dep.methodLabel))].map(method => (
                              <span key={method} className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-[#0f3d2e]">{method}</span>
                            ))}
                          </div>
                          <div className="space-y-1.5">
                            {item.walletFundingDeposits!.map(dep => (
                              <div key={dep.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                <span className="font-semibold text-foreground">{dep.methodLabel}</span>
                                <span>·</span>
                                <span className="font-mono">{dep.reference}</span>
                                <span>·</span>
                                <span>{money(dep.amount, dep.currency)}</span>
                                {dep.reviewedAt && (
                                  <>
                                    <span>·</span>
                                    <span>{date(dep.reviewedAt)}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:min-w-[300px] sm:grid-cols-4 xl:w-[360px]">
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Deposit</div>
                        <div className="mt-1 text-xs font-bold">{item.amountFormatted || money(item.amount, investorForMoney)}</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Profit</div>
                        <div className="mt-1 text-xs font-bold text-emerald-700">
                          {item.profitAmountFormatted
                            || formatProjectInvestmentAmount(expectedProfit, investorForMoney, {
                              pkrAmount: expectedProfitPkr,
                              usdAmount: expectedProfit,
                            })}
                        </div>
                        <div className="text-[10px] text-emerald-700/70">{stats.roi || 0}% expected</div>
                      </div>
                      <div className="rounded-lg bg-[#fff8e6] p-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[#9a6c00]">Total Return</div>
                        <div className="mt-1 text-xs font-bold text-[#9a6c00]">
                          {totalReturn == null
                            ? "—"
                            : formatProjectInvestmentAmount(totalReturn, investorForMoney, {
                              pkrAmount: totalReturnPkr,
                              usdAmount: totalReturn,
                            })}
                        </div>
                        <div className="text-[10px] text-[#9a6c00]/70">{item.settlementDate ? date(item.settlementDate) : "On settlement"}</div>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Record</div>
                        <div className="mt-1 truncate font-mono text-xs font-bold">{item.id}</div>
                        <div className="text-[10px] text-muted-foreground">{item.paymentSourceLabel || (item.status === "active" ? "Approved funding" : "Wallet record")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <div className="text-[10px] text-muted-foreground">
                      {item.status === "completed" ? "Settlement completed" : item.status === "active" ? "Funds included in approved project funding" : item.status === "pending" ? "Awaiting admin approval" : "Reservation released"}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        aria-label={`Update status for ${item.reference}`}
                        value={item.status}
                        disabled={!!busy}
                        onChange={event => onStatusChange(item, event.target.value as AdminProjectDeposit["status"])}
                        className="rounded-lg border border-border bg-white px-2 py-1.5 text-[10px] font-semibold"
                      >
                        {INVESTMENT_STATUS_OPTIONS.map(option => <option key={option} value={option}>{INVESTMENT_STATUS_LABELS[option]}</option>)}
                      </select>
                      {item.status === "pending" && (
                        <>
                          <button type="button" disabled={!!busy} onClick={() => onApprove(item)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50" style={{ background: GREEN }}>
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button type="button" disabled={!!busy} onClick={() => onReject(item)} className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
