import { useEffect, useState } from "react"
import { Link } from "wouter"
import {
  CheckCircle2, XCircle, Loader2, Users, DollarSign, Clock, TrendingUp, Save, Ship, History,
} from "lucide-react"
import {
  fetchProjectDetail,
  approveProjectInvestment,
  rejectProjectInvestment,
  approveNextProjectInvestment,
  updateProjectAsync,
  type AdminInvestProject,
  type AdminProjectDetail,
  type AdminProjectInvestment,
} from "@/lib/admin-data"
import {
  CONTAINER_PROJECT_STATUSES,
  CONTAINER_PROJECT_STATUS_LABELS,
  containerProjectStatusBadgeStyle,
  containerProjectStatusLabel,
} from "@/lib/container-project-statuses"
import {
  investmentStatusBadgeStyle,
  investmentStatusLabel,
} from "@/lib/investment-statuses"
import { formatProjectInvestmentAmount } from "@/lib/admin-currency"
import { ProjectStageUpdatesPanel } from "@/components/admin/ProjectStageUpdatesPanel"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const FACILITY_STATUS_OPTIONS: AdminInvestProject["status"][] = [
  "draft", "coming_soon", "funding", "fully_funded", "under_construction",
  "operational", "completed", "closed",
]

const FACILITY_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  coming_soon: "Coming Soon",
  funding: "Funding Open",
  fully_funded: "Fully Funded",
  under_construction: "Under Construction",
  active: "Active",
  operational: "Operational",
  completed: "Completed",
  closed: "Closed",
}

function statusOptionsForType(type: string): AdminInvestProject["status"][] {
  return type === "container" ? [...CONTAINER_PROJECT_STATUSES] : FACILITY_STATUS_OPTIONS
}

function projectStatusLabel(type: string, status: AdminInvestProject["status"]): string {
  if (type === "container") return containerProjectStatusLabel(status)
  return FACILITY_STATUS_LABELS[status] ?? String(status)
}

function ProjectStatusBadge({ type, status }: { type: string; status: AdminInvestProject["status"] }) {
  if (type === "container") {
    const s = containerProjectStatusBadgeStyle(status)
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
        {containerProjectStatusLabel(status)}
      </span>
    )
  }
  const cls = status === "completed" ? { bg: "#ecfdf5", color: "#0F3D2E" }
    : status === "active" ? { bg: "#eff6ff", color: "#2563eb" }
      : { bg: "#fffbeb", color: "#f59e0b" }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cls.bg, color: cls.color }}>
      {projectStatusLabel(type, status)}
    </span>
  )
}

function InvStatusBadge({ status }: { status: string }) {
  const s = investmentStatusBadgeStyle(status)
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
      {investmentStatusLabel(status)}
    </span>
  )
}

type DetailForm = {
  status: AdminInvestProject["status"]
  vessel: string
  shippingLine: string
  containerNumber: string
  etd: string
  eta: string
  portOfLoading: string
  portOfDischarge: string
  location: string
  currentProjectStage: string
  completion: string
}

function formFromProject(p: AdminInvestProject): DetailForm {
  return {
    status: p.status,
    vessel: p.vessel || "",
    shippingLine: p.shippingLine || "",
    containerNumber: p.containerNumber || "",
    etd: p.etd?.includes("T") ? p.etd.slice(0, 10) : (p.etd || ""),
    eta: p.eta?.includes("T") ? p.eta.slice(0, 10) : (p.eta || ""),
    portOfLoading: p.portOfLoading || "",
    portOfDischarge: p.portOfDischarge || "",
    location: p.location || "",
    currentProjectStage: p.currentProjectStage || "",
    completion: p.completion || "",
  }
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function fmtDate(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

type Props = {
  projectId: string | null
  onToast: (msg: string, type?: "success" | "error") => void
  onProjectUpdated: () => void
}

export function AdminProjectDetailPane({ projectId, onToast, onProjectUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null)
  const [form, setForm] = useState<DetailForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load(id: string) {
    setLoading(true)
    try {
      const data = await fetchProjectDetail(id)
      setDetail(data)
      setForm(formFromProject(data.project))
    } catch {
      setDetail(null)
      setForm(null)
      onToast("Failed to load project details", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!projectId) {
      setDetail(null)
      setForm(null)
      return
    }
    void load(projectId)
  }, [projectId])

  if (!projectId) {
    return (
      <div className="bg-white rounded-xl border border-border h-full min-h-[420px] flex flex-col items-center justify-center text-center p-8">
        <Ship className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Select a project to view details</p>
        <p className="text-xs text-muted-foreground mt-1">Investors, funding stats, and status controls appear here.</p>
      </div>
    )
  }

  if (loading || !detail || !form) {
    return (
      <div className="bg-white rounded-xl border border-border h-full min-h-[420px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { stats, investments, project } = detail

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProjectAsync(project.id, {
        status: form.status,
        vessel: form.vessel || undefined,
        shippingLine: form.shippingLine || undefined,
        containerNumber: form.containerNumber ?? "",
        etd: form.etd || undefined,
        eta: form.eta || undefined,
        portOfLoading: form.portOfLoading || undefined,
        portOfDischarge: form.portOfDischarge || undefined,
        location: form.location || undefined,
        currentProjectStage: form.currentProjectStage || undefined,
        completion: form.completion || undefined,
      })
      onToast("Project details saved")
      onProjectUpdated()
      await load(project.id)
    } catch {
      onToast("Failed to save project details", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (inv: AdminProjectInvestment) => {
    setActionId(`approve-${inv.id}`)
    try {
      await approveProjectInvestment(project.id, inv.id)
      onToast(`Approved ${inv.reference}`)
      onProjectUpdated()
      await load(project.id)
    } catch (e: any) {
      onToast(e?.message || "Approve failed", "error")
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (inv: AdminProjectInvestment) => {
    setActionId(`reject-${inv.id}`)
    try {
      await rejectProjectInvestment(project.id, inv.id)
      onToast(`Rejected ${inv.reference}`, "error")
      onProjectUpdated()
      await load(project.id)
    } catch (e: any) {
      onToast(e?.message || "Reject failed", "error")
    } finally {
      setActionId(null)
    }
  }

  const handleApproveNext = async () => {
    setActionId("approve-next")
    try {
      await approveNextProjectInvestment(project.id)
      onToast("Approved next pending investment (FCFS)")
      onProjectUpdated()
      await load(project.id)
    } catch (e: any) {
      onToast(e?.message || "No pending investment to approve", "error")
    } finally {
      setActionId(null)
    }
  }

  const inputClass = "w-full px-2.5 py-1.5 rounded-lg border border-border text-xs bg-white"

  return (
    <div className="bg-white rounded-xl border border-border max-h-[calc(100vh-220px)] overflow-y-auto">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-muted-foreground">{project.id}</div>
            <h3 className="font-bold text-sm truncate">{project.title}</h3>
            <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">{project.type} · {project.roi} ROI</div>
          </div>
          <Link
            href={`/admin/project-deposits?project=${encodeURIComponent(project.id)}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#C9DCCF] bg-[#F4FAF5] px-2.5 py-2 text-[10px] font-bold text-[#0F3D2E] transition-colors hover:border-[#7EAD8C] hover:bg-[#E8F4EB]"
            title="Open this project's investor deposit history"
          >
            <History className="h-3.5 w-3.5" />
            Deposit history
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 border-b border-border">
        {[
          { label: "Investors", value: String(stats.investorsCount), icon: Users, color: EMERALD },
          { label: "Total Invested", value: fmtMoney(stats.raisedAmount), icon: DollarSign, color: GREEN },
          { label: "Pending Reserved", value: fmtMoney(stats.pendingReserved), icon: Clock, color: "#f59e0b" },
          { label: "Remaining", value: fmtMoney(stats.remainingAmount), icon: TrendingUp, color: GOLD },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-border p-2.5">
            <k.icon className="w-3.5 h-3.5 mb-1" style={{ color: k.color }} />
            <div className="text-sm font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="p-4 border-b border-border space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Update Project</div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase">Status</label>
          <select
            className={inputClass}
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as AdminInvestProject["status"] })}
          >
            {statusOptionsForType(project.type).map(s => (
              <option key={s} value={s}>{projectStatusLabel(project.type, s)}</option>
            ))}
          </select>
        </div>

        {project.type === "container" ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Vessel</label>
              <input className={inputClass} value={form.vessel} onChange={e => setForm({ ...form, vessel: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Shipping Line</label>
              <input className={inputClass} value={form.shippingLine} onChange={e => setForm({ ...form, shippingLine: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Container Number</label>
              <input className={inputClass} value={form.containerNumber} onChange={e => setForm({ ...form, containerNumber: e.target.value })} placeholder="e.g. Container-123" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">ETD</label>
              <input type="date" className={inputClass} value={form.etd} onChange={e => setForm({ ...form, etd: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">ETA</label>
              <input type="date" className={inputClass} value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Port of Loading</label>
              <input className={inputClass} value={form.portOfLoading} onChange={e => setForm({ ...form, portOfLoading: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Port of Discharge</label>
              <input className={inputClass} value={form.portOfDischarge} onChange={e => setForm({ ...form, portOfDischarge: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground uppercase">Location</label>
              <input className={inputClass} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Stage</label>
              <input className={inputClass} value={form.currentProjectStage} onChange={e => setForm({ ...form, currentProjectStage: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase">Completion</label>
              <input className={inputClass} value={form.completion} onChange={e => setForm({ ...form, completion: e.target.value })} placeholder="YYYY-MM-DD" />
            </div>
          </div>
        )}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: EMERALD }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Details
        </button>
      </div>

      {project.type === "container" ? (
        <ProjectStageUpdatesPanel projectId={project.id} onToast={onToast} />
      ) : null}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Investors ({investments.length})
          </div>
          {stats.pendingCount > 0 && (
            <button
              onClick={() => void handleApproveNext()}
              disabled={actionId === "approve-next"}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white disabled:opacity-60"
              style={{ background: GREEN }}
            >
              {actionId === "approve-next" ? <Loader2 className="w-3 h-3 animate-spin inline" /> : null}
              {" "}Approve Next (FCFS)
            </button>
          )}
        </div>

        {investments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No investments yet.</p>
        ) : (
          <div className="space-y-2">
            {investments.map(inv => (
              <div key={inv.id} className="border border-border rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{inv.investorName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      ID: {inv.investorId} · {inv.reference}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {fmtDate(inv.investedAt)} · Invested {inv.amountFormatted ?? fmtMoney(inv.amount)}
                      {inv.profitAmount != null && inv.profitAmount > 0 && (
                        <span className="text-emerald-600">
                          {" "}· Profit {inv.profitAmountFormatted ?? fmtMoney(inv.profitAmount)} · Total return {inv.amountFormatted && inv.profitAmountFormatted
                            ? formatProjectInvestmentAmount(inv.amount + inv.profitAmount, inv.investor)
                            : fmtMoney(inv.amount + inv.profitAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <InvStatusBadge status={inv.status} />
                    {inv.status === "pending" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => void handleApprove(inv)}
                          disabled={!!actionId}
                          className="p-1 rounded bg-emerald-50 text-emerald-600 disabled:opacity-50"
                          title="Approve"
                        >
                          {actionId === `approve-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => void handleReject(inv)}
                          disabled={!!actionId}
                          className="p-1 rounded bg-red-50 text-red-500 disabled:opacity-50"
                          title="Reject"
                        >
                          {actionId === `reject-${inv.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
