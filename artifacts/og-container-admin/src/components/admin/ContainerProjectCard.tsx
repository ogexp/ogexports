import { Ship, Package, MapPin, CalendarClock, Anchor, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  CONTAINER_EXPORT_STAGES,
  containerProjectStageIndex,
  containerProjectStatusBadgeStyle,
  containerProjectStatusLabel,
} from "@/lib/container-project-statuses"
import { formatContainerLabel } from "@/lib/container-display"
import type { AdminInvestProject } from "@/lib/admin-data"
import { formatAdminUsd } from "@/lib/admin-currency"

function fmtDate(d?: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return d
  }
}

type ContainerProjectCardProps = {
  project: AdminInvestProject
  adminActions?: React.ReactNode
}

export function ContainerProjectCard({ project, adminActions }: ContainerProjectCardProps) {
  const stage = containerProjectStageIndex(project.status)
  const badge = containerProjectStatusBadgeStyle(project.status)
  const pct = project.target > 0 ? Math.min(100, Math.round((project.raised / project.target) * 100)) : 0
  const roi = project.expectedReturnPct ?? (parseFloat(String(project.roi).replace("%", "")) || 0)
  const totalDays = project.investmentPeriodDays || 45
  const expProfit = Math.round(project.raised * (roi / 100))
  const isImport = project.tradeDirection === "import"

  return (
    <Card className="glass-card overflow-hidden">
      <div className="h-1 w-full bg-primary" />
      <CardContent className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
              <Ship className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="font-heading font-bold text-base">{project.title}</span>
                {isImport ? (
                  <Badge className="text-[10px] font-bold uppercase tracking-wider border-0 bg-sky-500/15 text-sky-700 dark:text-sky-400">
                    ↓ Import
                  </Badge>
                ) : (
                  <Badge className="text-[10px] font-bold uppercase tracking-wider border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    ↑ Export
                  </Badge>
                )}
                <Badge
                  className="text-[10px] font-semibold border-0"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {containerProjectStatusLabel(project.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {project.commodity || project.variety || project.description || (isImport ? "Container import project" : "Container export project")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">PRJ-{project.id}</span>
            {adminActions}
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
                <p className="text-sm font-mono font-semibold">{formatContainerLabel(project.containerNumber, project.containerType)}</p>
                <p className="text-xs text-muted-foreground">{project.commodity || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Anchor className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vessel / Voyage</p>
                <p className="text-sm font-semibold">{project.vessel || "—"}</p>
                <p className="text-xs text-muted-foreground">{project.shippingLine || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Route · {project.incoterm || "FOB"}</p>
                <p className="text-xs font-medium">{project.portOfLoading || project.origin || "—"}</p>
                <p className="text-[10px] text-muted-foreground">↓</p>
                <p className="text-xs font-medium">{project.portOfDischarge || project.destination || "—"}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trade Progress</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{pct}% funded</span>
                <span>{project.investors} investors</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="space-y-1.5">
              {CONTAINER_EXPORT_STAGES.map((label, i) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold
                    ${i < stage ? "bg-emerald-500 text-white"
                      : i === stage ? (project.status === "settled" ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground ring-2 ring-primary/30")
                      : "bg-muted text-muted-foreground"}`}>
                    {i < stage || (i === stage && project.status === "settled") ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs ${i === stage && project.status !== "settled" ? "font-semibold text-foreground" : i < stage ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Funding", date: fmtDate(project.fundingDeadlineDate) },
                { label: "ETD", date: fmtDate(project.etd) },
                { label: "ETA", date: fmtDate(project.eta) },
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Raised</p>
                <p className="text-base font-bold">{formatAdminUsd(project.raised)}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/8 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Exp. Profit</p>
                <p className="text-base font-bold text-emerald-500">+{formatAdminUsd(expProfit)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI</p>
                <p className="text-base font-bold text-primary">{roi}%</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Term</p>
                <p className="text-base font-bold">{totalDays}d</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-accent/30 bg-accent/5">
              <CalendarClock className="w-4 h-4 shrink-0 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</p>
                <p className="text-sm font-bold text-accent">{formatAdminUsd(project.target)}</p>
              </div>
              {project.status === "settled" && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />}
            </div>
            <div className="flex items-center justify-between px-1 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Total Return (est.)</span>
              <span className="text-sm font-bold">{formatAdminUsd(project.raised + expProfit)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
