import { Ship, Package, MapPin, CalendarClock, Anchor, Download, Eye, CheckCircle2, Loader2 } from "lucide-react"
import { Link } from "wouter"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { downloadInvestmentPdf } from "@/lib/investment-download"
import { notify } from "@/lib/notify"
import {
  containerProjectStatusLabel,
  containerProjectUiStatus,
} from "@/lib/container-project-statuses"
import { formatContainerLabel, formatContainerType } from "@/lib/container-display"
import { investmentStatusLabel, investmentStatusBadgeClass } from "@/lib/investment-statuses"
import { formatInvestorProjectAmount } from "@/lib/invest-format"

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
  term: string | null
  currency: string
  amount: number | null
  expectedProfit: number | null
  roi: number | null
  currentStage: string | null
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
  unknown:    { label: "Not provided", color: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
}

function optionalNumber(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function mapRowToPosition(row: any): InvestmentPositionData | null {
  if (!row || row.id == null || !Number.isFinite(Number(row.id))) return null
  const project = row.project || {}
  const status = String(row.status || "")
  const projectType = String(project.type || "").toLowerCase()
  const isProject = ["project", "plant", "ricemill", "feed", "produce"].includes(projectType)
  const isImport = projectType === "import"
  const isExport = projectType === "export"
  const hasStatus = Boolean(project.status || status)
  const uiStatus = project.status
    ? containerProjectUiStatus(project.status, status)
    : status || "unknown"
  const amount = optionalNumber(row.amount)
  const expectedProfit = optionalNumber(row.profit_amount)
  const roi = optionalNumber(row.expected_return_pct ?? project.expected_return_pct)
  const currency = String(row.currency || project.currency || "").trim().toUpperCase()
  const investmentPeriodDays = optionalNumber(project.investment_period_days)
  const investmentPeriodMonths = optionalNumber(project.investment_period_months)
  const term = investmentPeriodDays != null
    ? `${investmentPeriodDays} days`
    : investmentPeriodMonths != null
      ? `${investmentPeriodMonths} months`
      : null
  const investDate = row.invested_at || row.created_at
  const etd = project.etd
  const eta = project.eta
  const meta = project.meta && typeof project.meta === "object" ? project.meta : {}
  const stageLabel = project.current_project_stage ? String(project.current_project_stage) : null

  const fmtDate = (d?: string | null) => {
    if (!d) return "Not provided"
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
    type: isProject ? "project" : isImport ? "import" : isExport ? "export" : "unknown",
    commodity: project.commodity || project.variety || project.description || "Not provided",
    containerNo: meta.container_no || meta.container_number || meta.containerNumber || "Not provided",
    containerType: formatContainerType(project.container_type) || "Not provided",
    shippingLine: project.shipping_line || "—",
    vessel: project.vessel || "Not provided",
    voyage: meta.voyage || project.voyage || "Not provided",
    portOfLoading: project.port_of_loading || project.origin || "—",
    portOfDischarge: project.port_of_discharge || project.destination || "—",
    incoterm: project.incoterm || "—",
    investDate: fmtDate(investDate),
    departureDate: fmtDate(etd),
    arrivalDate: fmtDate(eta),
    profitDate: fmtDate(row.profit_payout_date || project.profit_payout_date),
    term,
    currency,
    amount,
    expectedProfit,
    roi,
    currentStage: stageLabel,
    status: uiStatus,
    investmentStatus: status,
    projectStatus: project.status || undefined,
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
  const [pdfLoading, setPdfLoading] = useState(false)
  const meta = STATUS_META[inv.status] ?? STATUS_META.unknown
  const isImport = inv.type === "import"
  const isProject = inv.type === "project"
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
                  {isProject ? "Project" : isImport ? "↓ Import" : inv.type === "export" ? "↑ Export" : "Trade"}
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Update</p>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Project Stage</p>
              <p className="text-sm font-semibold mt-1">{inv.currentStage || "Not provided"}</p>
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
                <p className="text-sm font-bold leading-snug">{formatInvestorProjectAmount(inv.amount, inv.currency)}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/8 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Exp. Profit</p>
                <p className="text-sm font-bold text-emerald-500 leading-snug">
                  {formatInvestorProjectAmount(inv.expectedProfit, inv.currency)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI</p>
                <p className="text-base font-bold text-primary">{inv.roi == null ? "Not provided" : `${inv.roi}%`}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Investment Term</p>
                <p className="text-base font-bold">{inv.term || "Not provided"}</p>
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
              <span className="text-sm font-bold text-right">Not provided</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
