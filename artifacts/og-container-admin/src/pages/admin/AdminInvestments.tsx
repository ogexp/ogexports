import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "wouter"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { AdminProjectDetailPane } from "@/components/admin/AdminProjectDetailPane"
import { FacilityAdminControlCenter } from "@/components/admin/FacilityAdminControlCenter"
import { ProjectModal } from "@/components/admin/ProjectModal"
import { WithdrawalDetailDialog } from "@/components/admin/WithdrawalDetailDialog"
import {
  BarChart3, Ship, Sprout, Factory, CheckCircle2, XCircle,
  TrendingUp, DollarSign, Users, Plus, Edit2, Trash2, X, Save,
  Upload, ImagePlus, Loader2, FileText, Search, Eye, Download, History,
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  getWithdrawals, getInvestProjects, getInvestmentStats,
  initAdminData, refreshInvestmentStats, refreshInvestments, fetchFinance,
  fetchProjectInvestments,
  approveWithdrawal, rejectWithdrawal,
  updateProjectStatus, createProjectAsync, updateProjectAsync, deleteProject,
  uploadProjectDocument, deleteProjectDocument, INVESTMENT_DOCUMENT_TITLES,
  type AdminWithdrawal, type AdminInvestProject,
  type AdminInvestProjectDocument, type InvestmentGrowthPoint,
} from "@/lib/admin-data"
import { useCountries, usePorts } from "@/hooks/useLocations"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { isoToFlagEmoji } from "@/lib/country-flag"
import { findCountryByName, normalizeCountryValue } from "@/lib/country-names"
import { ApiError, downloadPublicFile, openPublicFile, resolveDocumentUrl, resolveMediaUrl, toStoredMediaPath, uploadInvestmentImage } from "@/lib/api"
import { formatAdminUsd } from "@/lib/admin-currency"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"

const GOLD = "#D4A012"
const EMERALD = "#0F3D2E"
import {
  CONTAINER_PROJECT_STATUSES,
  CONTAINER_PROJECT_STATUS_LABELS,
} from "@/lib/container-project-statuses"
const GREEN = "#4CAF50"

const TABS = [
  { id: "containers", label: "Container Investments", icon: Ship },
  { id: "produce", label: "Fresh Produce", icon: Sprout },
  { id: "plant", label: "Potato Plant", icon: Factory },
  { id: "ricemill", label: "Rice Mill", icon: Factory },
  { id: "feed", label: "Feed Mill", icon: Factory },
  { id: "withdrawals", label: "Pending Withdrawals", icon: TrendingUp },
]

/** Maps Investments tabs to platform investCategoryVisible keys (undefined = always shown). */
const TAB_VISIBILITY_KEY: Record<string, "produce" | "plant" | "ricemill" | "feeds" | undefined> = {
  produce: "produce",
  plant: "plant",
  ricemill: "ricemill",
  feed: "feeds",
}

function StatusBadge({ status }: { status: string }) {
  const label = CONTAINER_PROJECT_STATUS_LABELS[status as keyof typeof CONTAINER_PROJECT_STATUS_LABELS]
    || ({ funding: "Funding Open", active: "Active", closed: "Closed" } as Record<string, string>)[status]
    || status.replace(/_/g, " ")
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#fffbeb", color: "#f59e0b" },
    funding: { bg: "#fffbeb", color: "#f59e0b" },
    investment_confirmed: { bg: "#eff6ff", color: "#3b82f6" },
    cargo_loaded: { bg: "#f0fdf4", color: "#059669" },
    in_transit: { bg: "#f0f9ff", color: "#0ea5e9" },
    custom_clearance: { bg: "#fffbeb", color: "#d97706" },
    settled: { bg: "#f0fdf4", color: EMERALD },
    cancelled: { bg: "#fef2f2", color: "#ef4444" },
    approved: { bg: "#f0fdf4", color: GREEN },
    rejected: { bg: "#fef2f2", color: "#ef4444" },
    review: { bg: "#eff6ff", color: "#3b82f6" },
    draft: { bg: "#f8fafc", color: "#64748b" },
    coming_soon: { bg: "#f5f3ff", color: "#7c3aed" },
    fully_funded: { bg: "#ecfdf5", color: "#047857" },
    under_construction: { bg: "#eff6ff", color: "#2563eb" },
    operational: { bg: "#ecfdf5", color: EMERALD },
    active: { bg: "#f0fdf4", color: GREEN },
    closed: { bg: "#fef2f2", color: "#ef4444" },
  }
  const s = map[status] || { bg: "#f8fafc", color: "#64748b" }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: s.bg, color: s.color }}>{label}</span>
}

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm" style={{ background: type === "success" ? EMERALD : "#ef4444" }}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  title, msg, onConfirm, onCancel, confirmLabel = "Delete", variant = "danger",
}: {
  title: string
  msg: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  variant?: "danger" | "primary"
}) {
  const isDanger = variant === "danger"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
          style={{ background: isDanger ? "#fef2f2" : "#f0fdf4" }}
        >
          {isDanger
            ? <Trash2 className="w-6 h-6 text-red-500" />
            : <CheckCircle2 className="w-6 h-6" style={{ color: GREEN }} />}
        </div>
        <h3 className="font-bold text-lg text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{msg}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${isDanger ? "bg-red-500 hover:bg-red-600" : "hover:opacity-90"}`}
            style={isDanger ? undefined : { background: GREEN }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const STATUS_CONFIRM: Record<string, { title: string; msg: string; label: string }> = {
  investment_confirmed: {
    title: "Confirm Investment?",
    msg: "Move this project to Investment Confirmed? Investors will see funding as complete.",
    label: "Confirm Investment",
  },
  cargo_loaded: {
    title: "Mark Cargo Loaded?",
    msg: "Mark this project as Cargo Loaded?",
    label: "Mark Cargo Loaded",
  },
  in_transit: {
    title: "Mark In Transit?",
    msg: "Mark this project as In Transit? The shipment is on its way.",
    label: "Mark In Transit",
  },
  custom_clearance: {
    title: "Custom Clearance?",
    msg: "Mark this project as undergoing Custom Clearance?",
    label: "Custom Clearance",
  },
  settled: {
    title: "Mark Settled?",
    msg: "Mark this project as Settled? This is a final status.",
    label: "Mark Settled",
  },
  active: {
    title: "Mark Active?",
    msg: "Move this project from Funding to Active? Investors will see it as live.",
    label: "Mark Active",
  },
  completed: {
    title: "Mark Completed?",
    msg: "Mark this project as Completed? This is a final status.",
    label: "Mark Completed",
  },
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({
  project, onStatus, onEdit, onDelete
}: {
  project: AdminInvestProject
  onStatus: (id: string, status: AdminInvestProject["status"]) => void
  onEdit: (p: AdminInvestProject) => void
  onDelete: (p: AdminInvestProject) => void
}) {
  const pct = Math.round((project.raised / project.target) * 100)
  return (
    <div className="border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{project.title}</div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{project.id}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={project.status} />
          <span className="text-[11px] font-bold" style={{ color: GOLD }}>{project.roi} ROI</span>
          <button onClick={() => onEdit(project)} className="p-1 rounded hover:bg-muted transition-colors ml-1">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
          </button>
          <button onClick={() => onDelete(project)} className="p-1 rounded hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">Raised: <span className="font-semibold text-foreground">{formatAdminUsd(project.raised)}</span></span>
          <span className="text-muted-foreground">Target: <span className="font-semibold text-foreground">{formatAdminUsd(project.target)}</span></span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? GREEN : pct > 60 ? GOLD : EMERALD }} />
        </div>
        <div className="text-[10px] text-muted-foreground text-right">{pct}% funded · {project.investors} investors</div>
      </div>

      {project.vessel && <div className="text-[11px] text-muted-foreground">Vessel: {project.vessel} · ETD {project.etd} · ETA {project.eta}</div>}
      {project.location && <div className="text-[11px] text-muted-foreground">Location: {project.location}</div>}
      {project.completion && <div className="text-[11px] text-muted-foreground">Completion: {project.completion}</div>}

      {project.type === "container" && project.status !== "settled" && project.status !== "cancelled" && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {project.status === "funding" && (
            <button onClick={() => onStatus(project.id, "investment_confirmed")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: GREEN }}>Confirm Investment</button>
          )}
          {project.status === "investment_confirmed" && (
            <button onClick={() => onStatus(project.id, "cargo_loaded")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-blue-500">Mark Cargo Loaded</button>
          )}
          {project.status === "cargo_loaded" && (
            <button onClick={() => onStatus(project.id, "in_transit")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-blue-500">Mark In Transit</button>
          )}
          {project.status === "in_transit" && (
            <button onClick={() => onStatus(project.id, "custom_clearance")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-amber-500">Custom Clearance</button>
          )}
          {project.status === "custom_clearance" && (
            <button onClick={() => onStatus(project.id, "settled")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: EMERALD }}>Mark Settled</button>
          )}
        </div>
      )}
      {project.type !== "container" && project.status !== "completed" && (
        <div className="flex gap-2 mt-3">
          {project.status === "funding" && (
            <button onClick={() => onStatus(project.id, "active")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: GREEN }}>Mark Active</button>
          )}
          {project.status === "active" && (
            <button onClick={() => onStatus(project.id, "completed")} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white" style={{ background: EMERALD }}>Mark Completed</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export type FacilityManagementType = "plant" | "ricemill" | "feed"
export type InvestmentSectionType = "containers" | "produce" | "withdrawals" | FacilityManagementType

export interface AdminInvestmentsProps {
  facilityType?: FacilityManagementType
  initialSection?: InvestmentSectionType
  title?: string
  subtitle?: string
  embedded?: boolean
}

function sectionToProjectType(section?: InvestmentSectionType): string | undefined {
  if (!section || section === "withdrawals") return undefined
  if (section === "containers") return "container"
  return section
}

function projectsForSection(projects: AdminInvestProject[], section?: InvestmentSectionType) {
  if (!section || section === "withdrawals") return projects
  if (section === "containers") return projects.filter(p => p.type === "container")
  return projects.filter(p => p.type === section)
}

export default function AdminInvestments({
  facilityType,
  initialSection,
  title = "Investment Management",
  subtitle = "Manage investment projects, deposits and withdrawals",
  embedded = false,
}: AdminInvestmentsProps) {
  const activeSection = initialSection ?? facilityType
  const initialTab = activeSection ?? "containers"
  const { investCategoryVisible } = usePlatformSettings()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [pendingProjectInvestments, setPendingProjectInvestments] = useState(0)
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(() => getWithdrawals())
  const [withdrawDetail, setWithdrawDetail] = useState<AdminWithdrawal | null>(null)
  const [projects, setProjects] = useState<AdminInvestProject[]>(() => getInvestProjects())
  const [statsTotals, setStatsTotals] = useState(() => getInvestmentStats().totals)
  const [growthTrend, setGrowthTrend] = useState<InvestmentGrowthPoint[]>(() => getInvestmentStats().growthTrend)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Partial<AdminInvestProject> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminInvestProject | null>(null)
  const [statusTarget, setStatusTarget] = useState<{ id: string; status: AdminInvestProject["status"] } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projectSearch, setProjectSearch] = useState("")
  const visibleTabs = useMemo(() => {
    const scoped = activeSection
      ? TABS.filter(t => t.id === activeSection)
      : TABS
    return scoped.filter(t => {
      const key = TAB_VISIBILITY_KEY[t.id]
      if (!key) return true
      return investCategoryVisible[key]
    })
  }, [activeSection, investCategoryVisible])

  useEffect(() => {
    if (visibleTabs.length === 0) return
    if (!visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs.find(t => t.id === "containers")?.id ?? visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    showToast(`✓ ${label} copied`)
  }
  const refreshStats = () => {
    const stats = getInvestmentStats()
    setStatsTotals(stats.totals)
    setGrowthTrend(stats.growthTrend)
  }
  const refresh = () => {
    setWithdrawals(getWithdrawals())
    setProjects(getInvestProjects())
    refreshStats()
  }
  const refreshPendingInvestments = async () => {
    try {
      const res = await fetchProjectInvestments({
        status: "pending",
        project_type: sectionToProjectType(activeSection),
        per_page: 1,
      })
      setPendingProjectInvestments(res.total)
    } catch {
      setPendingProjectInvestments(0)
    }
  }
  const refreshAll = async () => {
    await refreshInvestmentStats()
    await refreshInvestments()
    refresh()
  }

  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get("project")
    if (!projectId) return
    const project = projects.find(item => item.id === projectId)
    if (!project) return
    setSelectedProjectId(projectId)
    if (!activeSection) {
      setActiveTab(project.type === "container" ? "containers" : project.type)
    }
  }, [projects, activeSection])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await initAdminData()
      if (!cancelled) {
        await refreshInvestmentStats()
        await refreshPendingInvestments()
        refresh()
      }
    })()
    return () => { cancelled = true }
  }, [activeSection])

  useEffect(() => {
    if (activeTab !== "withdrawals") return
    let cancelled = false
    ;(async () => {
      await fetchFinance()
      if (!cancelled) refresh()
    })()
    return () => { cancelled = true }
  }, [activeTab])

  const handleApproveWithdrawal = async (id: string, investor: string, amount: string) => {
    setActionLoading(`wd-approve-${id}`)
    try {
      await approveWithdrawal(id)
      refresh()
      showToast(`✓ Withdrawal approved — ${investor} ${amount}`)
    } catch {
      refresh()
      showToast(`Failed to approve withdrawal for ${investor}`, "error")
    } finally {
      setActionLoading(null)
    }
  }
  const handleRejectWithdrawal = async (id: string, investor: string) => {
    setActionLoading(`wd-reject-${id}`)
    try {
      await rejectWithdrawal(id)
      refresh()
      showToast(`✗ Withdrawal rejected — ${investor}`, "error")
    } catch {
      refresh()
      showToast(`Failed to reject withdrawal for ${investor}`, "error")
    } finally {
      setActionLoading(null)
    }
  }
  const handleProjectStatus = (id: string, status: AdminInvestProject["status"]) => {
    setStatusTarget({ id, status })
  }
  const confirmProjectStatus = async () => {
    if (!statusTarget) return
    await updateProjectStatus(statusTarget.id, statusTarget.status)
    refresh()
    void refreshAll()
    showToast(`Project ${statusTarget.id} updated to ${statusTarget.status}`)
    setStatusTarget(null)
  }

  const handleSaveProject = async (data: Omit<AdminInvestProject, "id">, id?: string): Promise<AdminInvestProject> => {
    const saved = id
      ? await updateProjectAsync(id, data)
      : await createProjectAsync(data)
    showToast(id ? `✓ Project "${data.title}" updated` : `✓ Project "${data.title}" added`)
    void refreshAll()
    return saved
  }

  const handleDeleteProject = () => {
    if (!deleteTarget) return
    deleteProject(deleteTarget.id)
    refresh()
    void refreshAll()
    showToast(`Project "${deleteTarget.title}" deleted`)
    setDeleteTarget(null)
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending" || w.status === "review")
  const containers = projects.filter(p => p.type === "container")
  const produce = projects.filter(p => p.type === "produce")
  const plant = projects.filter(p => p.type === "plant")
  const ricemill = projects.filter(p => p.type === "ricemill")
  const feed = projects.filter(p => p.type === "feed")
  const totalRaised = statsTotals.totalRaised
  const totalInvestors = statsTotals.totalInvestors
  const activeProjectsCount = statsTotals.activeProjects
  const scopedProjects = activeSection && activeSection !== "withdrawals"
    ? projectsForSection(projects, activeSection)
    : projects
  const scopedRaised = scopedProjects.reduce((sum, project) => sum + (project.raised || 0), 0)
  const scopedInvestors = scopedProjects.reduce((sum, project) => sum + (project.investors || 0), 0)
  const scopedActiveProjects = scopedProjects.filter(project =>
    ["active", "funding", "fully_funded", "under_construction", "operational"].includes(project.status),
  ).length
  const isScopedSection = !!activeSection && activeSection !== "withdrawals"
  const sectionKpiLabels: Record<string, { raised: string; projects: string }> = {
    containers: { raised: "Container Capital", projects: "Container Projects" },
    produce: { raised: "Produce Capital", projects: "Produce Projects" },
    plant: { raised: "Capital Raised", projects: "Facility Projects" },
    ricemill: { raised: "Capital Raised", projects: "Facility Projects" },
    feed: { raised: "Capital Raised", projects: "Facility Projects" },
  }
  const kpiLabels = activeSection && activeSection !== "withdrawals"
    ? (sectionKpiLabels[activeSection] ?? { raised: "Capital Raised", projects: "Active Projects" })
    : { raised: "Total Investments", projects: "Active Projects" }
  const displayRaised = isScopedSection ? scopedRaised : totalRaised
  const displayInvestors = isScopedSection ? scopedInvestors : totalInvestors
  const displayActiveProjects = isScopedSection ? scopedActiveProjects : activeProjectsCount
  const chartData = growthTrend.length > 0
    ? growthTrend
    : [{ month: "—", amount: 0 }]

  // active tab filter for showing "Add Project" button
  const isProjectTab = ["containers", "produce", "plant", "ricemill", "feed"].includes(activeTab)
  const tabTypeMap: Record<string, AdminInvestProject["type"]> = {
    containers: "container", produce: "produce", plant: "plant", ricemill: "ricemill", feed: "feed",
  }
  const tabLabelMap: Record<string, string> = {
    container: "Container", produce: "Produce", plant: "Plant", ricemill: "Rice Mill", feed: "Feed Mill",
  }

  const tabProjects = activeTab === "containers" ? containers
    : activeTab === "produce" ? produce
      : activeTab === "plant" ? plant
        : activeTab === "ricemill" ? ricemill
          : activeTab === "feed" ? feed
            : []
  const filteredTabProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    if (!q) return tabProjects
    return tabProjects.filter(p =>
      p.title.toLowerCase().includes(q)
      || p.id.toLowerCase().includes(q)
      || (p.vessel || "").toLowerCase().includes(q)
      || (p.location || "").toLowerCase().includes(q)
    )
  }, [tabProjects, projectSearch])

  useEffect(() => {
    setSelectedProjectId(null)
    setProjectSearch("")
  }, [activeTab])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const content = (
    <>
    <div className={embedded ? "space-y-5" : "p-6 space-y-5"}>
        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: kpiLabels.raised, value: formatAdminUsd(displayRaised), icon: BarChart3, color: GOLD },
            { label: kpiLabels.projects, value: String(displayActiveProjects), icon: TrendingUp, color: GREEN },
            { label: "Pending Investments", value: String(pendingProjectInvestments), icon: DollarSign, color: "#f59e0b", href: "/admin/project-deposits?status=pending" },
            { label: "Total Investors", value: String(displayInvestors), icon: Users, color: EMERALD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">
                {"href" in k && k.href ? (
                  <Link href={k.href} className="hover:underline">{k.label} →</Link>
                ) : k.label}
              </div>
            </div>
          ))}
        </div>

        {pendingProjectInvestments > 0 && (
          <div className="p-3 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-2 flex-wrap">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-sm text-yellow-800 font-medium">
              {pendingProjectInvestments} project investment{pendingProjectInvestments > 1 ? "s" : ""} awaiting approval
            </span>
            <Link href="/admin/project-deposits?status=pending" className="ml-auto text-xs font-semibold text-yellow-800 underline">
              Review in Project Deposits →
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between p-4 border-b border-border gap-3 flex-wrap">
            <div className="flex gap-1 overflow-x-auto">
              {visibleTabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all"
                  style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                  <t.icon className="w-3.5 h-3.5" /> {t.label}
                  {t.id === "withdrawals" && pendingWithdrawals.length > 0 && <span className="px-1 py-0.5 rounded-full text-[9px] font-bold bg-orange-400 text-white">{pendingWithdrawals.length}</span>}
                </button>
              ))}
            </div>
            {isProjectTab && (
              <button
                onClick={() => {
                  setEditingProject({ type: tabTypeMap[activeTab] })
                  setShowModal(true)
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0"
                style={{ background: GOLD, color: "#1F2933" }}>
                <Plus className="w-3.5 h-3.5" /> Add {tabLabelMap[tabTypeMap[activeTab]] || "Project"} Project
              </button>
            )}
          </div>
        </div>

        {isProjectTab ? (
          <>
          {(activeTab === "ricemill" || activeTab === "feed" || activeTab === "plant") && (
            <FacilityAdminControlCenter
              type={activeTab}
              projects={filteredTabProjects}
              onToast={showToast}
              onUpdated={() => { void refreshAll() }}
              onEditProject={project => { setEditingProject(project); setShowModal(true) }}
            />
          )}
          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 bg-white rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    placeholder="Search by ID, title, vessel..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase text-muted-foreground border-b border-border">
                      <th className="text-left px-4 py-2.5 font-semibold">Project</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Raised / Target</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Investors</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Pending</th>
                      <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTabProjects.map(p => {
                      const committed = (p.raised || 0) + (p.pendingReserved || 0)
                      const pct = p.target > 0 ? Math.round((committed / p.target) * 100) : 0
                      const selected = selectedProjectId === p.id
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProjectId(selected ? null : p.id)}
                          className={`border-b border-border/60 cursor-pointer hover:bg-muted/20 ${selected ? "bg-muted/30" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm truncate max-w-[200px]">{p.title}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{p.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium">{formatAdminUsd(committed)} / {formatAdminUsd(p.target)} committed</div>
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? GREEN : GOLD }} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{p.investors}</td>
                          <td className="px-4 py-3">
                            {(p.pendingCount || 0) > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{p.pendingCount}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <Link
                              href={`/admin/project-deposits?project=${encodeURIComponent(p.id)}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-[#C9DCCF] bg-[#F4FAF5] text-[#0F3D2E] hover:bg-[#E8F4EB] mr-1"
                              title="Open this project's investor deposit history"
                            >
                              <History className="h-3.5 w-3.5" />
                              Deposit History
                            </Link>
                            <button onClick={() => { setEditingProject(p); setShowModal(true) }} className="p-1 rounded hover:bg-muted inline-flex">
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setDeleteTarget(p)} className="p-1 rounded hover:bg-red-50 inline-flex">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredTabProjects.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No projects found. Add one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-2">
              <AdminProjectDetailPane
                projectId={selectedProjectId}
                onToast={showToast}
                onProjectUpdated={() => { void refreshAll() }}
              />
            </div>
          </div>
          </>
        ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-border">
            <div className="p-5">
              {activeTab === "withdrawals" && (
                <div className="space-y-3">
                  {pendingWithdrawals.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No pending withdrawals</div>}
                  {pendingWithdrawals.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">{w.id}</span>
                          <StatusBadge status={w.status} />
                        </div>
                        <div className="font-semibold text-sm mt-0.5">{w.investor}</div>
                        <div className="text-[11px] text-muted-foreground">{w.bank} · {w.ref} · {w.requested}</div>
                        {w.note && <div className="text-[11px] text-yellow-700 mt-0.5">⚠ {w.note}</div>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-lg font-bold text-red-600">{w.amount}</span>
                        {(w.status === "pending" || w.status === "review") && (
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => setWithdrawDetail(w)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted">
                              <Eye className="w-3 h-3" /> Details
                            </button>
                            <button onClick={() => void handleApproveWithdrawal(w.id, w.investor, w.amount)}
                              disabled={actionLoading === `wd-approve-${w.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-60"
                              style={{ background: GREEN }}>
                              {actionLoading === `wd-approve-${w.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
                            </button>
                            <button onClick={() => void handleRejectWithdrawal(w.id, w.investor)}
                              disabled={actionLoading === `wd-reject-${w.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white disabled:opacity-60">
                              {actionLoading === `wd-reject-${w.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-bold text-sm mb-1">Investment Growth</h3>
            <p className="text-xs text-muted-foreground mb-4">Total capital raised over time</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => formatAdminUsd(v)} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [formatAdminUsd(v), "Invested"]} />
                <Area type="monotone" dataKey="amount" stroke={GOLD} fill="url(#ig)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {[
                { label: "Container Projects", count: containers.length, color: EMERALD },
                { label: "Fresh Produce", count: produce.length, color: GREEN },
                { label: "Plant Investment", count: plant.length, color: GOLD },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="font-semibold">{s.count} projects</span>
                </div>
              ))}
            </div>

            {/* Quick stats */}
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase">Portfolio Summary</div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Total Raised</span>
                <span className="font-bold" style={{ color: GOLD }}>{formatAdminUsd(totalRaised)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Pending Investments</span>
                <Link href="/admin/project-deposits?status=pending" className="font-bold text-yellow-600 hover:underline">{pendingProjectInvestments}</Link>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground">Pending Withdrawals</span>
                <span className="font-bold text-orange-600">{pendingWithdrawals.length}</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ProjectModal
          initial={editingProject}
          onSave={handleSaveProject}
          onClose={() => {
            setShowModal(false)
            setEditingProject(null)
            refresh()
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Project?"
          msg={`"${deleteTarget.title}" will be permanently removed from the platform and hidden from investors.`}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {statusTarget && (
        <ConfirmModal
          title={STATUS_CONFIRM[statusTarget.status]?.title || "Update Status?"}
          msg={STATUS_CONFIRM[statusTarget.status]?.msg || `Update project status to ${statusTarget.status}?`}
          confirmLabel={STATUS_CONFIRM[statusTarget.status]?.label || "Confirm"}
          variant="primary"
          onConfirm={confirmProjectStatus}
          onCancel={() => setStatusTarget(null)}
        />
      )}
      <WithdrawalDetailDialog
        withdrawal={withdrawDetail}
        onClose={() => setWithdrawDetail(null)}
        onCopy={copyText}
      />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <AdminLayout title={title} subtitle={subtitle}>
      {content}
    </AdminLayout>
  )
}
