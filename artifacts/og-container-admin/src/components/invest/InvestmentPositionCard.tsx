import { Ship, Package, MapPin, CalendarClock, Anchor, Download, Eye, CheckCircle2, Loader2 } from "lucide-react"
import { Link } from "wouter"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrency } from "@/lib/use-currency"
import { downloadInvestmentPdf } from "@/lib/investment-download"
import { notify } from "@/lib/notify"
import {
  CONTAINER_EXPORT_STAGES,
  containerProjectStageIndex,
  containerProjectStatusLabel,
  containerProjectUiStatus,
} from "@/lib/container-project-statuses"
import { formatContainerLabel, formatContainerType } from "@/lib/container-display"
import { investmentStatusLabel, investmentStatusBadgeClass } from "@/lib/investment-statuses"

export type InvestmentPositionData = {
  id: string
  investmentId: number
  projectId?: number
  plan: string
  projectReference?: string
  investmentReference?: string
  type: string
  commodity: string
  containerNo: string
  containerType: string
  shippingLine: string
  vessel: string
  voyage: string
  portOfLoading: string
  portOfDischarge: string
  incoterm: string
  investDate: string
  departureDate: string
  arrivalDate: string
  profitDate: string
  totalDays: number
  daysElapsed: number
  amount: number
  amountPkr?: number | null
  expectedProfit: number
  expectedProfitPkr?: number | null
  exchangeRate?: number | null
  roi: number
  status: string
  investmentStatus?: string
  projectStatus?: string
  projectType?: string
  investorName?: string
  investorEmail?: string
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: "Pending",    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  active:     { label: "Approved",   color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  cancelled:  { label: "Rejected",   color: "bg-destructive/15 text-destructive", dot: "bg-red-500" },
  in_transit: { label: "In Transit", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  customs:    { label: "Customs",    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  completed:  { label: "Settled",    color: "bg-muted text-muted-foreground", dot: "bg-green-600" },
}

function daysRemaining(arrivalDate: string) {
  if (arrivalDate === "—") return 0
  const arrival = new Date(arrivalDate)
  if (Number.isNaN(arrival.getTime())) return 0
  const diff = Math.ceil((arrival.getTime() - Date.now()) / 86400000)
  return diff > 0 ? diff : 0
}

export function mapRowToPosition(row: any): InvestmentPositionData | null {
  const project = row.project || {}
  const status = String(row.status || "")
  const projectType = String(project.type || "export").toLowerCase()
  const isProject = ["project", "plant", "ricemill", "feed", "produce"].includes(projectType)
  const isImport = projectType === "import"
  const uiStatus = containerProjectUiStatus(project.status, status)
  const amount = Number(row.amount) || 0
  const amountPkr = row.amount_pkr != null ? Number(row.amount_pkr) : null
  const roi = Number(project.expected_return_pct) || 0
  const expectedProfit = row.profit_amount != null
    ? Number(row.profit_amount)
    : Math.round(amount * (roi / 100) * 100) / 100
  const expectedProfitPkr = row.profit_amount_pkr != null
    ? Number(row.profit_amount_pkr)
    : amountPkr != null
      ? Math.round(amountPkr * (roi / 100) * 100) / 100
      : null
  const exchangeRate = row.exchange_rate != null ? Number(row.exchange_rate) : null

  const investDate = row.invested_at || row.created_at
  const etd = project.etd
  const eta = project.eta
  const totalDays = Number(project.investment_period_days) || 90
  const start = investDate ? new Date(investDate) : new Date()
  const daysElapsed = Math.max(0, Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86400000)))
  const meta = project.meta && typeof project.meta === "object" ? project.meta : {}
  const stageLabel = project.current_project_stage ? String(project.current_project_stage) : null

  const fmtDate = (d?: string | null) => {
    if (!d) return "—"
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return d
    }
  }

  return {
    id: String(row.id),
    investmentId: Number(row.id),
    projectId: Number(row.project_id || project.id || 0) || undefined,
    plan: project.title || "Investment",
    projectReference: project.reference || undefined,
    investmentReference: row.reference || undefined,
    type: isProject ? "project" : isImport ? "import" : "export",
    commodity: project.commodity || project.variety || project.description || stageLabel || "—",
    containerNo: meta.container_no || meta.container_number || meta.containerNumber || "—",
    containerType: formatContainerType(project.container_type) || (isProject ? "Fixed Asset" : "Container"),
    shippingLine: project.shipping_line || "—",
    vessel: project.vessel || stageLabel || "—",
    voyage: meta.voyage || project.current_project_stage || "—",
    portOfLoading: project.port_of_loading || project.origin || "—",
    portOfDischarge: project.port_of_discharge || project.destination || "—",
    incoterm: project.incoterm || "—",
    investDate: fmtDate(investDate),
    departureDate: fmtDate(etd),
    arrivalDate: fmtDate(eta),
    profitDate: fmtDate(eta),
    totalDays,
    daysElapsed,
    amount,
    amountPkr,
    expectedProfit,
    expectedProfitPkr,
    exchangeRate,
    roi,
    status: uiStatus,
    investmentStatus: status,
    projectStatus: project.status,
    projectType,
    investorName: row.investor?.name,
    investorEmail: row.investor?.email,
  }
}

type InvestmentPositionCardProps = {
  inv: InvestmentPositionData
  adminActions?: React.ReactNode
  showInvestor?: boolean
  hideDownloadActions?: boolean
}

export function InvestmentPositionCard({ inv, adminActions, showInvestor, hideDownloadActions }: InvestmentPositionCardProps) {
  const c = useCurrency()
  const [pdfLoading, setPdfLoading] = useState(false)
  const pct = inv.totalDays > 0 ? Math.min(100, Math.round((inv.daysElapsed / inv.totalDays) * 100)) : 0
  const rem = daysRemaining(inv.arrivalDate)
  const meta = STATUS_META[inv.status] ?? STATUS_META.active
  const isImport = inv.type === "import"
  const isProject = inv.type === "project"
  const stage = containerProjectStageIndex(inv.projectStatus, inv.investmentStatus)
  const statusContext = { projectType: inv.projectType, projectStatus: inv.projectStatus }
  const projectBadgeLabel = containerProjectStatusLabel(inv.projectStatus) !== "—"
    ? containerProjectStatusLabel(inv.projectStatus)
    : meta.label
  const investmentLabel = investmentStatusLabel(inv.investmentStatus, statusContext)
  const showInvestmentBadge = Boolean(
    inv.investmentStatus
    && investmentLabel !== projectBadgeLabel
    && investmentLabel.toLowerCase() !== projectBadgeLabel.toLowerCase(),
  )

  async function handleDownloadPdf() {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      await downloadInvestmentPdf(
        inv.investmentId,
        inv.investmentReference || inv.projectReference,
      )
    } catch (error) {
      notify.error(
        "Download failed",
        error instanceof Error ? error.message : "Could not export this investment.",
      )
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Card className="glass-card overflow-hidden">
      <div className={`h-1 w-full ${inv.status === "completed" ? "bg-emerald-500" : isImport ? "bg-blue-500" : isProject ? "bg-accent" : "bg-primary"}`} />
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isImport ? "bg-blue-500/15" : isProject ? "bg-accent/15" : "bg-primary/10"}`}>
              {isProject ? <Package className="w-5 h-5 text-accent" /> : <Ship className={`w-5 h-5 ${isImport ? "text-blue-500" : "text-primary"}`} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="font-heading font-bold text-base">{inv.plan}</span>
                <Badge className={`text-[10px] font-bold uppercase tracking-wider border-0 ${isProject ? "bg-accent/15 text-amber-700 dark:text-amber-400" : isImport ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"}`}>
                  {isProject ? "Project" : isImport ? "↓ Import" : "↑ Export"}
                </Badge>
                <Badge className={`text-[10px] font-semibold border-0 flex items-center gap-1 ${meta.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} inline-block`} />
                  {projectBadgeLabel}
                </Badge>
                {showInvestmentBadge && (
                  <Badge className={`text-[10px] border-0 ${investmentStatusBadgeClass(inv.investmentStatus, statusContext)}`}>
                    {investmentLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{inv.commodity}</p>
              {showInvestor && inv.investorName && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{inv.investorName}{inv.investorEmail ? ` · ${inv.investorEmail}` : ""}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {inv.investmentReference && (
              <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground border border-primary/25 bg-primary/5 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ref</span>
                {inv.investmentReference}
              </span>
            )}
            {adminActions}
            {!adminActions && (
              <>
                {!hideDownloadActions && (
                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Download PDF"
                    disabled={pdfLoading}
                    onClick={() => void handleDownloadPdf()}
                  >
                    {pdfLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                  </button>
                )}
                <Link
                  href={`/invest/positions/${inv.investmentId}`}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex"
                  title="View details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shipment Details</p>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Container</p>
                <p className="text-sm font-mono font-semibold">
                  {formatContainerLabel(
                    inv.containerNo !== "—" ? inv.containerNo : null,
                    inv.containerType !== "Container" && inv.containerType !== "Fixed Asset" ? inv.containerType : null,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{inv.commodity}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Anchor className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vessel / Voyage</p>
                <p className="text-sm font-semibold">{inv.vessel}</p>
                <p className="text-xs text-muted-foreground">{inv.shippingLine} · {inv.voyage}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Route · {inv.incoterm}</p>
                <p className="text-xs font-medium">{inv.portOfLoading}</p>
                <p className="text-[10px] text-muted-foreground">↓</p>
                <p className="text-xs font-medium">{inv.portOfDischarge}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trade Progress</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Day {inv.daysElapsed} of {inv.totalDays}</span>
                <span>{pct}% complete</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${inv.status === "completed" ? "bg-emerald-500" : isImport ? "bg-blue-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              {CONTAINER_EXPORT_STAGES.map((s, i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold
                    ${i < stage ? "bg-emerald-500 text-white"
                      : i === stage ? (inv.status === "completed" ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground ring-2 ring-primary/30")
                      : "bg-muted text-muted-foreground"}`}>
                    {i < stage || (i === stage && inv.status === "completed") ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ${i === stage && inv.status !== "completed" ? "font-semibold text-foreground" : i < stage ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Invested", date: inv.investDate },
                { label: "ETD", date: inv.departureDate },
                { label: "ETA", date: inv.arrivalDate },
              ].map(({ label, date }) => (
                <div key={label} className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-[10px] font-semibold">{date}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Investment Financials</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/40 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Invested</p>
                <p className="text-sm font-bold leading-snug">{c.fmtDual(inv.amount, inv.amountPkr, inv.exchangeRate)}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/8 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Exp. Profit</p>
                <p className="text-sm font-bold text-emerald-500 leading-snug">+{c.fmtDual(inv.expectedProfit, inv.expectedProfitPkr, inv.exchangeRate)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI</p>
                <p className="text-base font-bold text-primary">{inv.roi}%</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Days Left</p>
                <p className={`text-base font-bold ${rem === 0 ? "text-emerald-500" : ""}`}>
                  {inv.status === "completed" ? "Done" : rem === 0 ? "Due" : `${rem}d`}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${inv.status === "completed" ? "border-emerald-500/30 bg-emerald-500/8" : "border-accent/30 bg-accent/5"}`}>
              <CalendarClock className={`w-4 h-4 shrink-0 ${inv.status === "completed" ? "text-emerald-500" : "text-accent"}`} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Profit Payout Date</p>
                <p className={`text-sm font-bold ${inv.status === "completed" ? "text-emerald-500" : "text-accent"}`}>{inv.profitDate}</p>
              </div>
              {inv.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
            </div>
            <div className="flex items-center justify-between gap-2 px-1 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground shrink-0">Total Return</span>
              <span className="text-sm font-bold text-right">
                {c.fmtDual(
                  inv.amount + inv.expectedProfit,
                  inv.amountPkr != null && inv.expectedProfitPkr != null
                    ? inv.amountPkr + inv.expectedProfitPkr
                    : null,
                  inv.exchangeRate,
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
