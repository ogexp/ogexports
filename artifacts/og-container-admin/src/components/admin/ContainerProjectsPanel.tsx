import { useCallback, useEffect, useState } from "react"
import { Link } from "wouter"
import {
  ChevronLeft, ChevronRight, Edit2, History, Loader2, Plus, Search, Trash2,
} from "lucide-react"
import { ContainerProjectCard } from "@/components/admin/ContainerProjectCard"
import { ProjectModal } from "@/components/admin/ProjectModal"
import {
  CONTAINER_PROJECT_STATUSES,
  CONTAINER_PROJECT_STATUS_LABELS,
  type ContainerProjectStatus,
} from "@/lib/container-project-statuses"
import {
  createProjectAsync,
  deleteProject,
  fetchContainerProjects,
  updateProjectAsync,
  type AdminInvestProject,
} from "@/lib/admin-data"
import { runAdminAction } from "@/lib/admin-actions"

const EMERALD = "#0F3D2E"
const GOLD = "#D4A012"

const STATUS_TABS = [
  { id: "", label: "All" },
  ...CONTAINER_PROJECT_STATUSES.map(s => ({
    id: s,
    label: CONTAINER_PROJECT_STATUS_LABELS[s],
  })),
] as const

const PER_PAGE_OPTIONS = [10, 20, 50]

export function ContainerProjectsPanel() {
  const [items, setItems] = useState<AdminInvestProject[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Partial<AdminInvestProject> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminInvestProject | null>(null)

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    window.setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchContainerProjects({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        per_page: perPage,
      })
      setItems(res.data)
      setTotal(res.total)
      setLastPage(res.last_page)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to load container projects", "error")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, page, perPage])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

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

  const handleSave = async (data: Omit<AdminInvestProject, "id">, id?: string) => {
    if (id) {
      return updateProjectAsync(id, data)
    }
    return createProjectAsync({ ...data, type: "container" })
  }

  return (
    <>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm text-white ${toast.type === "error" ? "bg-red-600" : "bg-gray-900"}`}>
          {toast.msg}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id || "all"}
                type="button"
                onClick={() => { setStatusFilter(tab.id); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === tab.id ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                style={statusFilter === tab.id ? { background: EMERALD } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingProject({ type: "container" })
              setShowModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0"
            style={{ background: GOLD, color: "#1F2933" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Container Project
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search project title, commodity, vessel…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading container projects…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No container projects found.</div>
        )}

        <div className="space-y-4">
          {!loading && items.map(project => {
            const busy = actionId?.startsWith(project.id)
            return (
              <ContainerProjectCard
                key={project.id}
                project={project}
                adminActions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      value={project.status}
                      disabled={!!busy}
                      onChange={e => void runAction(
                        `${project.id}-status`,
                        async () => { await updateProjectAsync(project.id, { status: e.target.value as ContainerProjectStatus }) },
                        "Status updated",
                      )}
                      className="text-[10px] border border-border rounded-lg px-2 py-1 bg-background"
                    >
                      {CONTAINER_PROJECT_STATUSES.map(s => (
                        <option key={s} value={s}>{CONTAINER_PROJECT_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <Link
                      href={`/admin/project-deposits?project=${encodeURIComponent(project.id)}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-[#C9DCCF] bg-[#F4FAF5] text-[#0F3D2E] hover:bg-[#E8F4EB]"
                      title="Open this project's investor deposit history"
                    >
                      <History className="h-3 w-3" />
                      Deposit History
                    </Link>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => {
                        setEditingProject(project)
                        setShowModal(true)
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-border hover:bg-muted disabled:opacity-50"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => setDeleteTarget(project)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                }
              />
            )
          })}
        </div>

        {!loading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Page {page} of {lastPage} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          initial={editingProject}
          onClose={() => {
            setShowModal(false)
            setEditingProject(null)
          }}
          onSave={async (data, id) => {
            const saved = await handleSave(data, id)
            await load()
            return saved
          }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-center mb-2">Delete Project?</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Permanently delete &quot;{deleteTarget.title}&quot;? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runAction(
                  `${deleteTarget.id}-delete`,
                  async () => {
                    deleteProject(deleteTarget.id)
                    setDeleteTarget(null)
                  },
                  "Project deleted",
                )}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
