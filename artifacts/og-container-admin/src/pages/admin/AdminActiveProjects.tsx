import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import {
  Activity,
  Anchor,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Container,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShipWheel,
  SlidersHorizontal,
  TrendingUp,
  Users,
  UserRound,
  WalletCards,
  History,
} from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import {
  fetchActiveProjects,
  updateProjectStatus,
  type AdminActiveProjectApiRow,
} from "@/lib/admin-data"
import {
  CONTAINER_EXPORT_STAGES,
  CONTAINER_PROJECT_STATUSES,
  containerProjectStageIndex,
  containerProjectStatusBadgeStyle,
  containerProjectStatusLabel,
  normalizeContainerProjectStatus,
  type ContainerProjectStatus,
} from "@/lib/container-project-statuses"
import { formatContainerLabel } from "@/lib/container-display"
import { formatAdminUsd } from "@/lib/admin-currency"

/**
 * The page deliberately consumes a small, display-ready contract. The wiring
 * pass can map AdminProjectDeposit/AdminProjectInvestment records into this
 * shape without coupling the operations UI to an API response envelope.
 */
export interface AdminActiveProjectRecord {
  id: string
  projectId?: string
  reference?: string
  projectTitle: string
  commodity?: string
  investors: AdminActiveInvestor[]
  investorCount: number
  pendingInvestorCount: number
  targetAmount: number
  raisedAmount: number
  pendingReserved: number
  remainingAmount: number
  fundingPercentage: number
  status: ContainerProjectStatus | string
  containerNumber?: string
  containerType?: string
  shippingLine?: string
  vessel?: string
  voyage?: string
  origin?: string
  destination?: string
  portOfLoading?: string
  portOfDischarge?: string
  incoterm?: string
  amount: number
  expectedProfit?: number
  roi?: number
  investedAt?: string
  etd?: string
  eta?: string
  settlementDate?: string
  daysElapsed?: number
  totalDays?: number
}

export interface AdminActiveInvestor {
  id: string
  name: string
  email?: string
  amount: number
  status: "active" | "pending" | "completed" | "cancelled"
  reference: string
  investedAt?: string
  approvedAt?: string
  paymentSourceLabel?: string
}

export interface AdminActiveProjectsPageProps {
  projects?: AdminActiveProjectRecord[]
  isLoading?: boolean
  error?: string | Error | null
  onRetry?: () => void
  onRefresh?: () => void
  onStatusChange?: (
    projectId: string,
    status: ContainerProjectStatus,
  ) => void | Promise<void>
}

const STATUS_OPTIONS = CONTAINER_PROJECT_STATUSES.filter(
  (status): status is ContainerProjectStatus =>
    status !== "pending" && status !== "cancelled",
)

const STATUS_FILTERS: Array<{ value: "all" | ContainerProjectStatus; label: string }> = [
  { value: "all", label: "All projects" },
  ...CONTAINER_PROJECT_STATUSES.map((status) => ({
    value: status,
    label: containerProjectStatusLabel(status),
  })),
]

function readInitialStatusFilter(): "all" | ContainerProjectStatus {
  if (typeof window === "undefined") return "all"
  const raw = new URLSearchParams(window.location.search).get("status")
  if (!raw) return "all"
  const normalized = normalizeContainerProjectStatus(raw)
  return CONTAINER_PROJECT_STATUSES.includes(normalized as ContainerProjectStatus)
    ? (normalized as ContainerProjectStatus)
    : "all"
}

const STAGE_ACCENTS = ["#C9952E", "#3D8A64", "#2476A8", "#D08B27", "#0F3D2E"]

function readMetaString(meta: Record<string, unknown> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = meta?.[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return undefined
}

function activeShipmentStatus(projectStatus: string | undefined): ContainerProjectStatus {
  const normalized = normalizeContainerProjectStatus(projectStatus)
  if (CONTAINER_PROJECT_STATUSES.includes(normalized as ContainerProjectStatus)) {
    return normalized as ContainerProjectStatus
  }
  return "funding"
}

function mapApiRowToActiveProject(row: AdminActiveProjectApiRow): AdminActiveProjectRecord {
  const project = row.project
  const meta = (project.meta && typeof project.meta === "object" ? project.meta : {}) as Record<string, unknown>
  const investments = row.investments || []
  const eligible = investments.filter((inv) => ["active", "pending"].includes(String(inv.status)))
  const activeInvestments = eligible.filter((inv) => inv.status === "active")
  const targetAmount = Number(row.capacity?.target_amount ?? project.target_amount) || 0
  const raisedAmount = Number(row.capacity?.active_raised ?? project.raised_amount) || 0
  const pendingReserved = Number(row.capacity?.pending_reserved ?? project.pending_reserved) || 0
  const remainingAmount = Number(row.capacity?.remaining_capacity ?? project.remaining_amount)
    ?? Math.max(0, targetAmount - raisedAmount - pendingReserved)
  const fundingPercentage = Number(project.funding_percentage) || (
    targetAmount > 0 ? Math.min(100, Math.round((raisedAmount / targetAmount) * 100)) : 0
  )
  const expectedReturnPct = Number(project.expected_return_pct ?? readMetaString(meta, "expected_return_pct", "expectedReturnPct") ?? 0)
  const investorIds = new Set(eligible.map((inv) => String(inv.investor?.id || inv.investor?.email || inv.id)))

  return {
    id: String(project.id),
    projectId: String(project.id),
    reference: String(project.reference || activeInvestments[0]?.reference || ""),
    projectTitle: String(project.title || "—"),
    commodity: [project.commodity, project.variety].filter(Boolean).join(" · ") || undefined,
    investors: eligible.map((inv) => ({
      id: String(inv.investor?.id || inv.investor?.email || inv.id),
      name: inv.investor?.name || "Unknown investor",
      email: inv.investor?.email,
      amount: Number(inv.amount) || 0,
      status: inv.status as AdminActiveInvestor["status"],
      reference: inv.reference,
      investedAt: inv.invested_at,
      approvedAt: inv.approved_at,
      paymentSourceLabel: undefined,
    })),
    investorCount: investorIds.size,
    pendingInvestorCount: eligible.filter((inv) => inv.status === "pending").length,
    targetAmount,
    raisedAmount,
    pendingReserved,
    remainingAmount,
    fundingPercentage,
    status: activeShipmentStatus(String(project.status)),
    containerNumber: readMetaString(meta, "container_no", "container_number", "containerNumber"),
    containerType: project.container_type ? String(project.container_type) : undefined,
    shippingLine: project.shipping_line ? String(project.shipping_line) : undefined,
    vessel: project.vessel ? String(project.vessel) : undefined,
    voyage: readMetaString(meta, "voyage", "vessel_voyage"),
    origin: project.origin ? String(project.origin) : undefined,
    destination: project.destination ? String(project.destination) : undefined,
    portOfLoading: project.port_of_loading ? String(project.port_of_loading) : undefined,
    portOfDischarge: project.port_of_discharge ? String(project.port_of_discharge) : undefined,
    incoterm: project.incoterm ? String(project.incoterm) : undefined,
    amount: raisedAmount,
    expectedProfit: raisedAmount > 0 && expectedReturnPct > 0
      ? raisedAmount * expectedReturnPct / 100
      : undefined,
    roi: expectedReturnPct || undefined,
    investedAt: activeInvestments[0]?.invested_at || investments[0]?.invested_at,
    etd: project.etd ? String(project.etd) : undefined,
    eta: project.eta ? String(project.eta) : undefined,
    settlementDate: readMetaString(meta, "settlement_date", "settlementDate", "completion"),
    totalDays: project.investment_period_days != null ? Number(project.investment_period_days) : undefined,
  }
}

function normalizeStatus(status: string): ContainerProjectStatus {
  const normalized = normalizeContainerProjectStatus(status)
  return CONTAINER_PROJECT_STATUSES.includes(normalized as ContainerProjectStatus)
    ? (normalized as ContainerProjectStatus)
    : "pending"
}

function displayDate(value?: string) {
  if (!value) return "Not scheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function displayDays(record: AdminActiveProjectRecord) {
  if (record.daysElapsed != null) return Math.max(0, record.daysElapsed)
  if (!record.investedAt) return 0
  const date = new Date(record.investedAt)
  if (Number.isNaN(date.getTime())) return 0
  return Math.max(0, Math.ceil((Date.now() - date.getTime()) / 86400000))
}

function projectStatusStyle(status: string) {
  const style = containerProjectStatusBadgeStyle(status)
  return { backgroundColor: style.bg, color: style.color }
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
      style={projectStatusStyle(normalized)}
      data-testid={`status-project-${normalized}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {containerProjectStatusLabel(normalized)}
    </span>
  )
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Activity
  tone: "emerald" | "gold" | "blue" | "ink"
}) {
  const tones = {
    emerald: { bg: "#EAF3ED", icon: "#0F3D2E", line: "#3D8A64" },
    gold: { bg: "#FBF4E5", icon: "#9A6A13", line: "#C9952E" },
    blue: { bg: "#EAF2F7", icon: "#2476A8", line: "#4A94BE" },
    ink: { bg: "#EEF0ED", icon: "#43554D", line: "#74867C" },
  }
  const colors = tones[tone]
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#DDE4DB] bg-[#FCFDFB] p-4 shadow-[0_3px_14px_rgba(15,61,46,0.04)]"
      data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: colors.line }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#718078]">{label}</p>
          <p className="mt-2 font-heading text-[26px] font-bold leading-none text-[#17382C]">{value}</p>
          <p className="mt-2 text-[11px] text-[#7A8982]">{detail}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: colors.bg }}>
          <Icon className="h-4 w-4" style={{ color: colors.icon }} />
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  icon: Icon,
  label,
  value,
  secondary,
}: {
  icon: typeof Anchor
  label: string
  value: string
  secondary?: string
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5" data-testid={`detail-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0F3EF]">
        <Icon className="h-3.5 w-3.5 text-[#597267]" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A9991]">{label}</p>
        <p className="truncate text-[12px] font-semibold text-[#29483B]" data-testid={`value-${label.toLowerCase().replaceAll(" ", "-")}`}>
          {value}
        </p>
        {secondary && <p className="truncate text-[10px] text-[#829087]">{secondary}</p>}
      </div>
    </div>
  )
}

function ProgressRail({ status }: { status: string }) {
  const normalized = normalizeStatus(status)
  const stage = containerProjectStageIndex(normalized)
  const complete = normalized === "settled"

  return (
    <div data-testid={`progress-project-${normalized}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718078]">Trade progress</span>
        <span className="font-mono text-[10px] font-bold text-[#597267]">
          {complete ? "5 / 5 cleared" : `${Math.min(stage + 1, 5)} / 5 current`}
        </span>
      </div>
      <div className="flex items-start">
        {CONTAINER_EXPORT_STAGES.map((label, index) => {
          const done = index < stage || complete
          const current = index === stage && !complete
          return (
            <div key={label} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all"
                  style={{
                    borderColor: done || current ? STAGE_ACCENTS[index] : "#D7E0D9",
                    background: done ? STAGE_ACCENTS[index] : current ? "#FFF9EC" : "#F3F6F3",
                    color: done ? "#fff" : current ? STAGE_ACCENTS[index] : "#9AA8A0",
                    boxShadow: current ? `0 0 0 4px ${STAGE_ACCENTS[index]}18` : undefined,
                  }}
                  data-testid={`step-${index + 1}-${normalized}`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </div>
                <span
                  className={`mt-2 text-center text-[9px] leading-tight ${
                    current ? "font-bold text-[#29483B]" : done ? "font-medium text-[#6E8177]" : "text-[#9AA8A0]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < CONTAINER_EXPORT_STAGES.length - 1 && (
                <div className="mt-3.5 h-px min-w-[10px] flex-1" style={{ background: index < stage || complete ? STAGE_ACCENTS[index] : "#D7E0D9" }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InvestmentStatusBadge({ status }: { status: AdminActiveInvestor["status"] }) {
  const isPending = status === "pending"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
        isPending ? "bg-[#FFF8E8] text-[#A46E16]" : "bg-[#EAF5ED] text-[#2F7A4E]"
      }`}
      data-testid={`badge-investment-${status}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {isPending ? "Pending review" : "Active"}
    </span>
  )
}

function ProjectCard({
  project,
  status,
  currency,
  updating,
  onStatusChange,
}: {
  project: AdminActiveProjectRecord
  status: ContainerProjectStatus
  currency: (amount: number) => string
  updating: boolean
  onStatusChange: (status: ContainerProjectStatus) => void
}) {
  const totalDays = project.totalDays ?? 90
  const elapsed = Math.min(displayDays(project), totalDays)
  const durationPercent = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0
  const routeFrom = project.portOfLoading || project.origin || "Origin pending"
  const routeTo = project.portOfDischarge || project.destination || "Destination pending"

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-[#D9E2D9] bg-[#FCFDFB] shadow-[0_4px_18px_rgba(15,61,46,0.045)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C7A75B]/70 hover:shadow-[0_12px_30px_rgba(15,61,46,0.09)]"
      data-testid={`card-project-${project.id}`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#0F3D2E] via-[#3D8A64] to-[#C9952E]" />
      <div className="border-b border-[#E7ECE6] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E9F2EC] text-[#0F3D2E]">
              <Container className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-heading text-[17px] font-bold tracking-[-0.02em] text-[#183D2F]" data-testid={`text-project-${project.id}`}>
                  {project.projectTitle}
                </h3>
                <span className="rounded-full bg-[#F3F0E7] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8C681F]">
                  Container export
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-[#7B8A82]">
                {project.commodity || "Commodity details pending"}{project.reference ? ` · ${project.reference}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={status} />
            <span className="rounded-lg bg-[#F1F4F0] px-2 py-1 font-mono text-[10px] font-semibold text-[#65766D]" data-testid={`text-project-id-${project.id}`}>
              {project.id}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEF1ED] pt-3">
          <div className="flex items-center gap-2 text-[11px] text-[#667970]" data-testid={`text-investor-count-${project.id}`}>
            <Users className="h-3.5 w-3.5 text-[#B1842B]" />
            <span className="font-semibold text-[#355347]">
              {project.investorCount} investor account{project.investorCount === 1 ? "" : "s"}
            </span>
            {project.pendingInvestorCount > 0 && (
              <span className="text-[#A46E16]">· {project.pendingInvestorCount} pending</span>
            )}
          </div>
          <span className="hidden h-3 w-px bg-[#D9E2D9] sm:block" />
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7D8C83]">
            <Activity className="h-3.5 w-3.5 text-[#3D8A64]" />
            Admin operations record
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.05fr_1.35fr_0.95fr] divide-y divide-[#E7ECE6] lg:divide-x lg:divide-y-0">
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718078]">Shipment details</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <DetailItem icon={Container} label="Container" value={formatContainerLabel(project.containerNumber, project.containerType)} secondary={project.containerType || "Container specification pending"} />
            <DetailItem icon={ShipWheel} label="Vessel / voyage" value={project.vessel || "Vessel pending"} secondary={[project.shippingLine, project.voyage].filter(Boolean).join(" · ") || "Carrier pending"} />
            <DetailItem icon={MapPin} label="Route" value={routeFrom} secondary={`${routeTo}${project.incoterm ? ` · ${project.incoterm}` : ""}`} />
            <DetailItem icon={Anchor} label="Port of discharge" value={project.portOfDischarge || project.destination || "Not assigned"} secondary={project.destination || "Final destination pending"} />
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <ProgressRail status={status} />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-[#7A8981]">
              <span>Investment period</span>
              <span className="font-mono font-semibold text-[#52675C]">{elapsed} of {totalDays} days · {durationPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EEE9]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#3D8A64] to-[#C9952E] transition-all duration-500" style={{ width: `${durationPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-[#FBFCF9] px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718078]">Funding control</p>
            <span className="font-mono text-[10px] font-bold text-[#597267]">{project.fundingPercentage}% funded</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#F1F4F0] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#829087]">Total raised</p>
              <p className="mt-1 text-[15px] font-bold text-[#29483B]" data-testid={`value-raised-${project.id}`}>{currency(project.raisedAmount)}</p>
            </div>
            <div className="rounded-xl bg-[#EDF6EF] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#829087]">Target amount</p>
              <p className="mt-1 text-[15px] font-bold text-[#29483B]" data-testid={`value-target-${project.id}`}>{currency(project.targetAmount)}</p>
            </div>
            <div className="rounded-xl bg-[#FBF4E5] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#829087]">Remaining</p>
              <p className="mt-1 text-[15px] font-bold text-[#946719]" data-testid={`value-remaining-${project.id}`}>{currency(project.remainingAmount)}</p>
            </div>
            <div className="rounded-xl bg-[#F1F4F0] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#829087]">Expected profit</p>
              <p className="mt-1 text-[15px] font-bold text-[#2D7A50]" data-testid={`value-profit-${project.id}`}>+{currency(project.expectedProfit ?? 0)}</p>
            </div>
          </div>
          <div className="space-y-2 border-t border-[#E3E9E2] pt-3">
            <div className="flex items-center justify-between text-[10px] text-[#728178]">
              <span>Committed incl. pending</span>
              <span className="font-semibold text-[#52675C]">{currency(project.raisedAmount + project.pendingReserved)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EEE9]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3D8A64] to-[#C9952E]"
                style={{ width: `${Math.min(100, project.targetAmount > 0 ? ((project.raisedAmount + project.pendingReserved) / project.targetAmount) * 100 : 0)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#728178]">
              <WalletCards className="h-3.5 w-3.5 text-[#B1842B]" />
              {project.pendingReserved > 0 ? `${currency(project.pendingReserved)} awaiting approval` : "No pending capital holds"}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E7ECE6] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[#B1842B]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#718078]">Investor roster</p>
          </div>
          <p className="text-[10px] text-[#87948C]">
            {project.investors.length} investment record{project.investors.length === 1 ? "" : "s"} · Total raised {currency(project.raisedAmount)}
          </p>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-[#E1E9E1]">
          <div className="hidden grid-cols-[1.35fr_0.75fr_0.7fr_0.8fr_0.7fr] gap-3 bg-[#F4F7F3] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#829087] md:grid">
            <span>Investor</span>
            <span>Investment</span>
            <span>Source</span>
            <span>Status</span>
            <span>Reference / date</span>
          </div>
          <div className="divide-y divide-[#E7ECE6]">
            {project.investors.map((investor) => (
              <div
                key={investor.id + investor.reference}
                className="grid gap-3 px-4 py-3 md:grid-cols-[1.35fr_0.75fr_0.7fr_0.8fr_0.7fr] md:items-center"
                data-testid={`investor-row-${project.id}-${investor.id}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#29483B]">{investor.name}</p>
                  <p className="truncate text-[10px] text-[#829087]">{investor.email || "Email not available"}</p>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#29483B]">{currency(investor.amount)}</p>
                  <p className="text-[10px] text-[#829087]">Individual amount</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#29483B]">{investor.paymentSourceLabel || "—"}</p>
                  <p className="text-[10px] text-[#829087]">Payment source</p>
                </div>
                <div><InvestmentStatusBadge status={investor.status} /></div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-semibold text-[#52675C]">{investor.reference}</p>
                  <p className="text-[10px] text-[#829087]">{displayDate(investor.investedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-[#E7ECE6] px-5 py-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
          {[
            { label: "Invested", value: displayDate(project.investedAt), icon: CalendarDays },
            { label: "ETD", value: displayDate(project.etd), icon: ShipWheel },
            { label: "ETA", value: displayDate(project.eta), icon: Clock3 },
            { label: "Settlement", value: displayDate(project.settlementDate || project.eta), icon: Check },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-1.5" data-testid={`date-${label.toLowerCase()}-${project.id}`}>
              <Icon className="h-3 w-3 text-[#9A6A13]" />
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#96A29B]">{label}</p>
                <p className="text-[10px] font-semibold text-[#52675C]">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 xl:justify-end">
          <Link
            href={`/admin/project-deposits?project=${encodeURIComponent(project.projectId ?? project.id)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9DCCF] bg-[#F4FAF5] px-3 py-2 text-[10px] font-bold text-[#0F3D2E] transition-colors hover:border-[#7EAD8C] hover:bg-[#E8F4EB]"
            title="Open this project's investor deposit history"
          >
            <History className="h-3.5 w-3.5" />
            Deposit history
          </Link>
          <label htmlFor={`status-${project.id}`} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#718078]">Update stage</label>
          <div className="relative">
            <select
              id={`status-${project.id}`}
              value={status}
              disabled={updating || status === "settled"}
              onChange={(event) => onStatusChange(event.target.value as ContainerProjectStatus)}
              className="min-w-[172px] appearance-none rounded-lg border border-[#D5E0D6] bg-[#FCFDFB] py-2 pl-3 pr-8 text-[11px] font-semibold text-[#29483B] shadow-sm outline-none transition-colors hover:border-[#B79442] focus:border-[#B79442] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid={`select-status-${project.id}`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{containerProjectStatusLabel(option)}</option>
              ))}
              {status === "settled" && <option value="settled">Settled</option>}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#718078]" />
          </div>
        </div>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E0E7DF] bg-[#FCFDFB]" aria-label="Loading project">
      <div className="h-1 bg-[#E6ECE6]" />
      <div className="space-y-5 p-6">
        <div className="flex gap-3">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-[#E8EEE8]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EEE8]" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#EFF3EE]" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#F0F4EF]" />)}
        </div>
      </div>
    </div>
  )
}

export default function AdminActiveProjects({
  projects: providedProjects,
  isLoading = false,
  error: providedError = null,
  onRetry,
  onRefresh,
  onStatusChange,
}: AdminActiveProjectsPageProps) {
  const money = (amount: number) => formatAdminUsd(amount)
  const [loadedProjects, setLoadedProjects] = useState<AdminActiveProjectRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(providedProjects === undefined)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ContainerProjectStatus>(() => readInitialStatusFilter())
  const [localStatuses, setLocalStatuses] = useState<Record<string, ContainerProjectStatus>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadActiveProjects = useCallback(async () => {
    if (providedProjects !== undefined) return
    setLoadingProjects(true)
    setLoadError(null)
    try {
      const result = await fetchActiveProjects({
        project_type: "container",
        page: 1,
        per_page: 100,
      })
      setLoadedProjects(result.data.map(mapApiRowToActiveProject))
    } catch (fetchError) {
      setLoadError(fetchError instanceof Error ? fetchError.message : "Unable to load active projects.")
    } finally {
      setLoadingProjects(false)
    }
  }, [providedProjects])

  useEffect(() => {
    void loadActiveProjects()
  }, [loadActiveProjects])

  const projects = providedProjects ?? loadedProjects
  const effectiveLoading = providedProjects === undefined ? loadingProjects : isLoading
  const error = providedProjects === undefined ? loadError : providedError
  const refreshProjects = onRefresh ?? loadActiveProjects

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects
      .map((project) => ({
        project,
        status: localStatuses[project.id] || normalizeStatus(project.status),
      }))
      .filter(({ project, status }) => {
        const matchesStatus = statusFilter === "all" || status === statusFilter
        const searchText = [
          project.projectTitle,
          project.id,
          project.reference,
          ...project.investors.flatMap((investor) => [investor.name, investor.email, investor.reference]),
          project.commodity,
          project.containerNumber,
          project.vessel,
          project.destination,
        ].filter(Boolean).join(" ").toLowerCase()
        return matchesStatus && (!needle || searchText.includes(needle))
      })
  }, [localStatuses, projects, query, statusFilter])

  const totals = useMemo(() => {
    const capitalRaised = projects.reduce((sum, project) => sum + (Number(project.raisedAmount) || 0), 0)
    const expectedProfit = projects.reduce((sum, project) => sum + (Number(project.expectedProfit) || 0), 0)
    const investorCount = projects.reduce((sum, project) => sum + (Number(project.investorCount) || 0), 0)
    const pendingReserved = projects.reduce((sum, project) => sum + (Number(project.pendingReserved) || 0), 0)
    const pendingInvestors = projects.reduce((sum, project) => sum + (Number(project.pendingInvestorCount) || 0), 0)
    const statusCounts = CONTAINER_PROJECT_STATUSES.reduce((acc, status) => {
      acc[status] = 0
      return acc
    }, {} as Record<ContainerProjectStatus, number>)
    for (const project of projects) {
      const status = localStatuses[project.id] || normalizeStatus(project.status)
      if (status in statusCounts) statusCounts[status as ContainerProjectStatus] += 1
    }
    return {
      capitalRaised,
      expectedProfit,
      investorCount,
      pendingReserved,
      pendingInvestors,
      inTransit: statusCounts.in_transit,
      dueForSettlement: statusCounts.custom_clearance,
      statusCounts,
    }
  }, [localStatuses, projects])

  function applyStatusFilter(next: "all" | ContainerProjectStatus) {
    setStatusFilter(next)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (next === "all") url.searchParams.delete("status")
    else url.searchParams.set("status", next)
    window.history.replaceState({}, "", `${url.pathname}${url.search}`)
  }

  async function handleStatusChange(project: AdminActiveProjectRecord, nextStatus: ContainerProjectStatus) {
    const previousStatus = localStatuses[project.id] || normalizeStatus(project.status)
    setLocalStatuses((current) => ({ ...current, [project.id]: nextStatus }))
    setUpdatingId(project.id)
    setNotice(null)
    try {
      if (onStatusChange) {
        await onStatusChange(project.projectId ?? project.id, nextStatus)
      } else {
        const response = await updateProjectStatus(project.projectId ?? project.id, nextStatus)
        await loadActiveProjects()
        const settlement = response?.settlement
        if (nextStatus === "settled" && settlement?.settled_count) {
          setNotice({
            type: "success",
            text: `${project.projectTitle} settled. ${settlement.settled_count} investor payout${settlement.settled_count === 1 ? "" : "s"} recorded for ${formatAdminUsd(settlement.total_return ?? 0)}.`,
          })
          return
        }
      }
      setNotice({ type: "success", text: `${project.projectTitle} moved to ${containerProjectStatusLabel(nextStatus)}.` })
    } catch (statusError) {
      setLocalStatuses((current) => ({ ...current, [project.id]: previousStatus }))
      setNotice({
        type: "error",
        text: statusError instanceof Error ? statusError.message : "The project stage could not be updated.",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const errorText = error instanceof Error ? error.message : error

  return (
    <AdminLayout title="Container Control" subtitle="Admin operations for funded container investments">
      <main className="min-h-full bg-[#F6F8F4]">
        <div className="mx-auto max-w-[1560px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <section className="relative overflow-hidden rounded-2xl border border-[#D7E2D7] bg-[#FDFEFC] px-5 py-6 shadow-[0_4px_20px_rgba(15,61,46,0.04)] sm:px-7">
            <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-[#C9952E]/10" />
            <div className="pointer-events-none absolute right-20 top-8 h-24 w-24 rounded-full border border-[#0F3D2E]/10" />
            <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A6A13]">
                  <span className="h-px w-7 bg-[#C9952E]" />
                   Admin / container control
                </div>
                <h2 className="font-heading text-3xl font-bold tracking-[-0.04em] text-[#15392B] sm:text-[38px]">Container operations</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6D7E74]">
                  Admin control center for funded export containers. Review project-level capital, investor accounts, and shipment stage from one operational record.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7D8C83]">
                <span className="flex items-center gap-1.5 rounded-full border border-[#DCE7DD] bg-[#F4F8F3] px-3 py-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3D8A64]" />
                   Admin controls live
                </span>
                <button
                  type="button"
                  onClick={() => void refreshProjects()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E2D8] bg-[#FCFDFB] px-3 py-1.5 normal-case tracking-normal text-[#53685C] transition-colors hover:border-[#B79442] hover:text-[#29483B] disabled:cursor-default disabled:opacity-50"
                  data-testid="button-refresh-projects"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
             <Metric label="Active containers" value={effectiveLoading ? "—" : String(projects.length)} detail="Funded container records" icon={Container} tone="emerald" />
             <Metric label="Total raised" value={effectiveLoading ? "—" : money(totals.capitalRaised)} detail={`${money(totals.pendingReserved)} pending reserve`} icon={CircleDollarSign} tone="gold" />
             <Metric label="Investor accounts" value={effectiveLoading ? "—" : String(totals.investorCount)} detail={`${totals.pendingInvestors} pending review`} icon={Users} tone="ink" />
            <Metric label="In transit" value={effectiveLoading ? "—" : String(totals.inTransit)} detail="Cargo currently moving" icon={TrendingUp} tone="blue" />
            <Metric label="Settlement watch" value={effectiveLoading ? "—" : String(totals.dueForSettlement)} detail="Custom clearance stage" icon={Clock3} tone="ink" />
          </section>

          <section className="rounded-2xl border border-[#DCE5DB] bg-[#FCFDFB] p-3 shadow-[0_3px_12px_rgba(15,61,46,0.025)] sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#819188]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search project, investor, container, or vessel"
                  className="w-full rounded-xl border border-[#DCE5DB] bg-[#F9FBF8] py-2.5 pl-10 pr-3 text-sm text-[#29483B] outline-none placeholder:text-[#9AA79F] focus:border-[#B79442] focus:bg-white"
                  data-testid="input-search-active-projects"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C8B83]">
                  <Filter className="h-3.5 w-3.5" />
                  Stage
                </div>
                <div className="flex gap-1.5">
                  {STATUS_FILTERS.map((filter) => {
                    const count = filter.value === "all"
                      ? projects.length
                      : (totals.statusCounts[filter.value] ?? 0)
                    return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => applyStatusFilter(filter.value)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${
                        statusFilter === filter.value
                          ? "bg-[#0F3D2E] text-[#F7F4E9] shadow-sm"
                          : "bg-[#F0F4EF] text-[#718078] hover:bg-[#E6EEE7] hover:text-[#29483B]"
                      }`}
                      data-testid={`filter-stage-${filter.value}`}
                    >
                      {filter.label}
                      <span className={`ml-1.5 inline-flex min-w-[1.1rem] justify-center rounded-full px-1 text-[9px] font-bold ${
                        statusFilter === filter.value ? "bg-white/20 text-white" : "bg-[#DCE5DB] text-[#53685C]"
                      }`}>
                        {count}
                      </span>
                    </button>
                    )
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setQuery(""); applyStatusFilter("all") }}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-[#7C8B83] hover:bg-[#F0F4EF] hover:text-[#29483B]"
                data-testid="button-clear-project-filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </section>

          {notice && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-medium ${
                notice.type === "error"
                  ? "border-[#E7CACA] bg-[#FFF6F5] text-[#A84D45]"
                  : "border-[#CFE3D2] bg-[#F0F9F1] text-[#36724C]"
              }`}
              role="status"
              data-testid={`status-project-action-${notice.type}`}
            >
              {notice.type === "error" ? <CircleAlert className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
              {notice.text}
            </div>
          )}

          {effectiveLoading && (
            <div className="space-y-4" data-testid="state-projects-loading">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!effectiveLoading && errorText && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5D3D0] bg-[#FFFAF9] px-6 py-16 text-center" data-testid="state-projects-error">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8E8E5] text-[#B65C50]">
                <CircleAlert className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold text-[#49322F]">Projects could not be loaded</h3>
              <p className="mt-1 max-w-md text-sm text-[#8C716B]">{errorText}</p>
              {(onRetry || providedProjects === undefined) && (
                <button
                  type="button"
                  onClick={onRetry ?? (() => void loadActiveProjects())}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0F3D2E] px-4 py-2.5 text-xs font-bold text-[#F7F4E9] hover:bg-[#174E3B]"
                  data-testid="button-retry-projects"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              )}
            </div>
          )}

          {!effectiveLoading && !errorText && visibleProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD9CC] bg-[#FBFDF9] px-6 py-16 text-center" data-testid="state-projects-empty">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF3ED] text-[#0F3D2E]">
                <Container className="h-7 w-7" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#FBFDF9] bg-[#C9952E] text-white">
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </div>
              <h3 className="mt-5 font-heading text-xl font-bold text-[#244738]">
                {projects.length > 0 ? "No projects match this view" : "No active projects yet"}
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#7B8C82]">
                {projects.length > 0
                  ? "Try another stage or search term to return more container records."
                  : "Funded container projects will appear here as soon as investment confirmations are recorded."}
              </p>
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); applyStatusFilter("all") }}
                  className="mt-5 rounded-lg border border-[#C8D7CA] px-4 py-2 text-xs font-bold text-[#355A48] hover:bg-[#EEF5EF]"
                  data-testid="button-reset-empty-project-filters"
                >
                  Show all projects
                </button>
              )}
            </div>
          )}

          {!effectiveLoading && !errorText && visibleProjects.length > 0 && (
            <div className="space-y-4" data-testid="list-active-projects">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold text-[#718078]">
                  Showing <span className="font-bold text-[#29483B]">{visibleProjects.length}</span> of {projects.length} project{projects.length === 1 ? "" : "s"}
                </p>
                <p className="hidden text-[10px] uppercase tracking-[0.13em] text-[#9AA79F] sm:block">Select a stage to update the trade record</p>
              </div>
              {visibleProjects.map(({ project, status }) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  status={status}
                  currency={money}
                  updating={updatingId === project.id}
                  onStatusChange={(nextStatus) => void handleStatusChange(project, nextStatus)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  )
}