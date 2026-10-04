import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "wouter"
import {
  Loader2, Search, ChevronLeft, ChevronRight, History, X,
} from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import {
  fetchProjectInvestments,
  approveProjectInvestmentById,
  rejectProjectInvestmentById,
  updateProjectInvestmentStatus,
  type AdminProjectDeposit,
} from "@/lib/admin-data"
import { fetchAdminExchangeRates } from "@/lib/admin-currency"
import { runAdminAction } from "@/lib/admin-actions"
import { AdminProjectHistoryGroup } from "@/components/admin/AdminProjectHistoryGroup"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "active", label: "Approved" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Rejected" },
] as const

const PROJECT_TYPE_TABS = [
  { id: "", label: "All Types" },
  { id: "container", label: "Container" },
  { id: "ricemill", label: "Rice Mill" },
  { id: "feed", label: "Feed Mill" },
  { id: "produce", label: "Produce" },
  { id: "plant", label: "Plant" },
] as const

const PER_PAGE_OPTIONS = [20, 50, 100]

function depositTimestamp(item: AdminProjectDeposit): number {
  const raw = item.investedAt || item.createdAt || ""
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? 0 : t
}

export default function AdminProjectDeposits() {
  const [, setLocation] = useLocation()
  const initialProjectFilter = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get("project") || params.get("project_id") || ""
  }, [])
  const [items, setItems] = useState<AdminProjectDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter)

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchProjectInvestments({
        status: statusFilter || undefined,
        project_id: projectFilter || undefined,
        project_type: typeFilter || undefined,
        search: search || undefined,
        page,
        per_page: perPage,
      })
      setItems(res.data)
      setTotal(res.total)
      setLastPage(res.last_page)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to load project investments", "error")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectFilter, typeFilter, search, page, perPage])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    void fetchAdminExchangeRates()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const pendingCount = useMemo(() => items.filter(i => i.status === "pending").length, [items])
  const groups = useMemo(() => {
    const grouped = new Map<string, { project: AdminProjectDeposit["project"]; items: AdminProjectDeposit[] }>()
    for (const item of items) {
      const id = item.project.id
      const current = grouped.get(id)
      if (current) current.items.push(item)
      else grouped.set(id, { project: item.project, items: [item] })
    }
    return Array.from(grouped.values())
      .map(group => ({
        ...group,
        items: [...group.items].sort((a, b) => depositTimestamp(b) - depositTimestamp(a)),
      }))
      .sort((a, b) => {
        const aMax = Math.max(...a.items.map(depositTimestamp), 0)
        const bMax = Math.max(...b.items.map(depositTimestamp), 0)
        return bMax - aMax
      })
  }, [items])

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    setActionId(key)
    await runAdminAction(action, {
      reload: load,
      successMessage: success,
      onSuccess: m => showToast(m || success, "success"),
      onError: m => showToast(m, "error"),
    })
    setActionId(null)
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects(current => ({ ...current, [projectId]: current[projectId] === false }))
  }

  const runInvestmentAction = (item: AdminProjectDeposit, action: () => Promise<unknown>, success: string) => {
    void runAction(item.id, async () => { await action() }, success)
  }

  return (
    <AdminLayout title="Project Investment History" subtitle="Review every investor deposit by container, Feed Mill, and Rice Mill project">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm text-white ${toast.type === "error" ? "bg-red-600" : "bg-gray-900"}`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-4">
        {projectFilter && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#C9DCCF] bg-[#F4FAF5] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCEFE1] text-[#0F3D2E]">
              <History className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6C8175]">Project-scoped history</p>
              <p className="truncate text-sm font-bold text-[#183D2F]">
                {groups[0]?.project.title || `Project ${projectFilter}`}
              </p>
              <p className="text-[11px] text-[#718078]">Showing investor deposits and approval records for this project only.</p>
            </div>
            <button
              type="button"
              onClick={() => { setProjectFilter(""); setPage(1); setLocation("/admin/project-deposits") }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9DCCF] bg-white px-3 py-2 text-[10px] font-bold text-[#355A48] hover:bg-[#E8F4EB]"
            >
              <X className="h-3.5 w-3.5" /> View all projects
            </button>
          </div>
        )}
        {pendingCount > 0 && statusFilter !== "pending" && (
          <div className="p-3 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-sm text-yellow-800 font-medium">
              {pendingCount} pending deposit{pendingCount === 1 ? "" : "s"} on this page awaiting approval
            </span>
            <button type="button" onClick={() => { setStatusFilter("pending"); setPage(1) }} className="ml-auto text-xs font-semibold text-yellow-800 underline">
              Show pending
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Investment records</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Group deposits by project to see funding, investor identity, and lifecycle at a glance.</p>
            </div>
            <span className="rounded-full bg-[#e8f2ec] px-2.5 py-1 text-[10px] font-bold text-[#0f3d2e]">{groups.length} project{groups.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setStatusFilter(tab.id); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === tab.id ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                style={statusFilter === tab.id ? { background: EMERALD } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {PROJECT_TYPE_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setTypeFilter(tab.id); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${typeFilter === tab.id ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                style={typeFilter === tab.id ? { background: GREEN } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search investor, reference, project…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
            />
          </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading project deposits…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No project deposits found.</div>
        )}

        <div className="space-y-4">
          {!loading && groups.map(group => (
            <AdminProjectHistoryGroup
              key={group.project.id}
              project={group.project}
              items={group.items}
              expanded={expandedProjects[group.project.id] !== false}
              onToggle={() => toggleProject(group.project.id)}
              actionId={actionId}
              onApprove={item => runInvestmentAction(item, () => approveProjectInvestmentById(item.id), "Investment approved")}
              onReject={item => runInvestmentAction(item, () => rejectProjectInvestmentById(item.id), "Investment rejected")}
              onStatusChange={(item, status) => runInvestmentAction(item, () => updateProjectInvestmentStatus(item.id, status), "Status updated")}
              onOpenProject={projectId => setLocation(`/admin/investments?project=${projectId}`)}
            />
          ))}
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">Page {page} of {lastPage} · {total} total</p>
            <div className="flex items-center gap-2">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
              >
                {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-border disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-border disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
