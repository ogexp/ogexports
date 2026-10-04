import { useCallback, useEffect, useState } from "react"
import { Search, Download, Star, Trash2, FileCheck, LogIn, Loader2, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { AdminKycReviewPanel } from "@/components/admin/AdminKycReviewPanel"
import { AdminCreateUserDialog, type AdminCreateRole } from "@/components/admin/AdminCreateUserDialog"
import {
  fetchUsersPaginated,
  updateUserKYCAsync,
  suspendUserAsync,
  deleteUserAsync,
  impersonateUser,
  fetchUserKyc,
  getKycByUserId,
  type AdminUser,
} from "@/lib/admin-data"
import { runAdminAction } from "@/lib/admin-actions"

const GREEN = "#4CAF50"

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  verified: { bg: "#f0fdf4", color: GREEN, label: "Verified" },
  pending: { bg: "#fffbeb", color: "#f59e0b", label: "Pending" },
  suspended: { bg: "#fef2f2", color: "#ef4444", label: "Suspended" },
  rejected: { bg: "#fef2f2", color: "#ef4444", label: "Rejected" },
  review: { bg: "#eff6ff", color: "#3b82f6", label: "Under Review" },
  active: { bg: "#f0fdf4", color: GREEN, label: "Active" },
  inactive: { bg: "#f8fafc", color: "#64748b", label: "Inactive" },
}

const PER_PAGE_OPTIONS = [10, 20, 50, 100]

function PaginationBar({
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  page: number
  lastPage: number
  total: number
  perPage: number
  onPageChange: (p: number) => void
  onPerPageChange: (n: number) => void
}) {
  if (total === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Page {page} of {lastPage} · {total} total · sorted newest first
      </p>
      <div className="flex items-center gap-2">
        <select
          value={perPage}
          onChange={e => onPerPageChange(Number(e.target.value))}
          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
        >
          {PER_PAGE_OPTIONS.map(n => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function usePaginatedUsers(role: string) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchUsersPaginated({ role, page, per_page: perPage, search })
      setUsers(res.data)
      setLastPage(res.last_page)
      setTotal(res.total)
    } catch {
      setUsers([])
      setLastPage(1)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [role, page, perPage, search])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  return {
    users,
    page,
    setPage,
    perPage,
    setPerPage: (n: number) => { setPage(1); setPerPage(n) },
    lastPage,
    total,
    searchInput,
    setSearchInput,
    loading,
    reload: load,
  }
}

type ToastFn = (msg: string, type?: "success" | "error") => void

const DELETE_CONFIRM = (name: string) =>
  `Delete user "${name}"? This cannot be undone. Related orders, investments, and other records tied to this user may also be removed.`

function AccountStatusActions({
  user,
  busy,
  runAction,
}: {
  user: AdminUser
  busy: boolean
  runAction: (key: string, action: () => Promise<void>, success: string) => Promise<void>
}) {
  const suspended = user.status === "suspended"
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void runAction(
          `${user.id}-status`,
          () => suspendUserAsync(user.id, user.status),
          suspended ? `${user.fullName} enabled` : `${user.fullName} disabled`,
        )}
        className="px-2 py-0.5 rounded text-[10px] font-bold hover:bg-muted disabled:opacity-50"
        style={{ color: suspended ? GREEN : "#f59e0b" }}
      >
        {suspended ? "Enable" : "Disable"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!confirm(DELETE_CONFIRM(user.fullName))) return
          void runAction(`${user.id}-delete`, () => deleteUserAsync(user.id), `${user.fullName} deleted`)
        }}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 className="w-3 h-3" /> Delete
      </button>
    </>
  )
}

function CreateUserControl({
  role,
  label,
  open,
  onOpenChange,
  onCreated,
}: {
  role: AdminCreateRole
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (message: string) => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
        style={{ background: "#0F3D2E" }}
      >
        <Plus className="w-4 h-4" /> {label}
      </button>
      <AdminCreateUserDialog
        open={open}
        onOpenChange={onOpenChange}
        role={role}
        onSuccess={onCreated}
      />
    </>
  )
}

function BuyersTab({
  onToast,
  openCreate = false,
  onCreateConsumed,
}: {
  onToast: ToastFn
  openCreate?: boolean
  onCreateConsumed?: () => void
}) {
  const pg = usePaginatedUsers("buyer")
  const [reviewUserId, setReviewUserId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!openCreate) return
    setCreateOpen(true)
    onCreateConsumed?.()
  }, [openCreate, onCreateConsumed])

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    setActionId(key)
    await runAdminAction(action, {
      reload: pg.reload,
      successMessage: success,
      onSuccess: m => onToast(m || success, "success"),
      onError: m => onToast(m, "error"),
    })
    setActionId(null)
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={pg.searchInput}
            onChange={e => pg.setSearchInput(e.target.value)}
            placeholder="Search buyers..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
          />
        </div>
        <button type="button" className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
          <Download className="w-4 h-4" /> Export
        </button>
        <CreateUserControl
          role="buyer"
          label="Add buyer"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={msg => { void pg.reload(); onToast(msg) }}
        />
      </div>
      {pg.loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading buyers…
        </div>
      )}
      {!pg.loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Buyer", "Country", "Orders", "Value", "KYC Status", "Trust Score", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.users.map(b => {
                const st = STATUS_BADGE[b.kycStatus] || STATUS_BADGE.pending
                const initials = b.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                const showReview = reviewUserId === b.id
                const busy = actionId?.startsWith(b.id)
                return (
                  <>
                    <tr key={b.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${b.status === "suspended" ? "opacity-60" : ""}`}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 overflow-hidden" style={{ background: b.avatarUrl ? "transparent" : "linear-gradient(135deg, #0F3D2E, #4CAF50)" }}>
                            {b.avatarUrl ? <img src={b.avatarUrl} alt={initials} className="w-full h-full object-cover" /> : initials}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-[13px]">{b.fullName}</div>
                            <div className="text-[11px] text-muted-foreground">{b.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{b.country || "—"}</td>
                      <td className="px-3 py-3 text-[12px] font-medium">{b.orders ?? 0}</td>
                      <td className="px-3 py-3 text-[12px] font-semibold">{b.orderValue || "$0"}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${b.trustScore}%`, background: b.trustScore > 70 ? GREEN : b.trustScore > 40 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span className="text-[11px] font-medium">{b.trustScore}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted-foreground">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(b.kycStatus === "pending" || b.kycStatus === "review") && (
                            <button type="button" onClick={() => setReviewUserId(showReview ? null : b.id)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">
                              <FileCheck className="w-3 h-3 inline mr-0.5" />{showReview ? "Hide" : "Review KYC"}
                            </button>
                          )}
                          {b.kycApplicationId && (b.kycStatus === "verified" || b.kycStatus === "rejected") && (
                            <button type="button" onClick={() => setReviewUserId(showReview ? null : b.id)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 hover:bg-slate-100">
                              <FileCheck className="w-3 h-3 inline mr-0.5" />{showReview ? "Hide" : "View KYC"}
                            </button>
                          )}
                          {(b.kycStatus === "pending" || b.kycStatus === "review" || b.kycStatus === "rejected") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(`${b.id}-verify`, () => updateUserKYCAsync(b.id, "verified"), `KYC verified for ${b.fullName}`)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                            >
                              Verify
                            </button>
                          )}
                          {(b.kycStatus === "pending" || b.kycStatus === "review") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(`${b.id}-reject`, () => updateUserKYCAsync(b.id, "rejected"), `KYC rejected for ${b.fullName}`)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const { redirect } = await impersonateUser(b.id)
                                window.location.href = redirect
                              } catch {
                                onToast("Failed to login as user", "error")
                              }
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100"
                          >
                            <LogIn className="w-3 h-3 inline mr-0.5" />Login
                          </button>
                          <AccountStatusActions user={b} busy={!!busy} runAction={runAction} />
                        </div>
                      </td>
                    </tr>
                    {showReview && (
                      <tr key={`${b.id}-kyc`} className="border-b border-border/50 bg-muted/10">
                        <td colSpan={8} className="px-3 py-3">
                          <AdminKycReviewPanel
                            userId={b.id}
                            userName={b.fullName}
                            kyc={b.kycApplicationId ? getKycByUserId(b.id) : undefined}
                            onUpdated={() => { void pg.reload(); void fetchUserKyc(b.id) }}
                            onClose={() => setReviewUserId(null)}
                            compact
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {pg.users.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No buyers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <PaginationBar
        page={pg.page}
        lastPage={pg.lastPage}
        total={pg.total}
        perPage={pg.perPage}
        onPageChange={pg.setPage}
        onPerPageChange={pg.setPerPage}
      />
    </div>
  )
}

function InvestorsTab({
  onToast,
  openCreate = false,
  onCreateConsumed,
}: {
  onToast: ToastFn
  openCreate?: boolean
  onCreateConsumed?: () => void
}) {
  const pg = usePaginatedUsers("investor")
  const [reviewUserId, setReviewUserId] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!openCreate) return
    setCreateOpen(true)
    onCreateConsumed?.()
  }, [openCreate, onCreateConsumed])

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    setActionId(key)
    await runAdminAction(action, {
      reload: pg.reload,
      successMessage: success,
      onSuccess: m => onToast(m || success, "success"),
      onError: m => onToast(m, "error"),
    })
    setActionId(null)
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={pg.searchInput}
            onChange={e => pg.setSearchInput(e.target.value)}
            placeholder="Search investors..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
          />
        </div>
        <CreateUserControl
          role="investor"
          label="Add investor"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={msg => { void pg.reload(); onToast(msg) }}
        />
      </div>
      {pg.loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading investors…
        </div>
      )}
      {!pg.loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Investor", "Country", "Portfolio", "ROI", "KYC", "Joined", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.users.map(i => {
                const st = STATUS_BADGE[i.kycStatus] || STATUS_BADGE.pending
                const showReview = reviewUserId === i.id
                const busy = actionId?.startsWith(i.id)
                return (
                  <>
                    <tr key={i.id} className={`border-b border-border/50 hover:bg-muted/20 ${i.status === "suspended" ? "opacity-60" : ""}`}>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-[13px]">{i.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{i.email}</div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-muted-foreground">{i.country || "—"}</td>
                      <td className="px-3 py-3 text-[12px] font-semibold" style={{ color: "#D4A012" }}>{i.portfolio || "—"}</td>
                      <td className="px-3 py-3 text-[12px] text-green-600 font-medium">{i.roi || "—"}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-muted-foreground">
                        {i.createdAt ? new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(i.kycStatus === "pending" || i.kycStatus === "review") && (
                            <button type="button" onClick={() => setReviewUserId(showReview ? null : i.id)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">
                              <FileCheck className="w-3 h-3 inline mr-0.5" />{showReview ? "Hide" : "Review KYC"}
                            </button>
                          )}
                          {i.kycApplicationId && (i.kycStatus === "verified" || i.kycStatus === "rejected") && (
                            <button type="button" onClick={() => setReviewUserId(showReview ? null : i.id)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 hover:bg-slate-100">
                              <FileCheck className="w-3 h-3 inline mr-0.5" />{showReview ? "Hide" : "View KYC"}
                            </button>
                          )}
                          {(i.kycStatus === "pending" || i.kycStatus === "review" || i.kycStatus === "rejected") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(`${i.id}-verify`, () => updateUserKYCAsync(i.id, "verified"), `KYC verified for ${i.fullName}`)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                            >
                              Verify
                            </button>
                          )}
                          {(i.kycStatus === "pending" || i.kycStatus === "review") && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(`${i.id}-reject`, () => updateUserKYCAsync(i.id, "rejected"), `KYC rejected for ${i.fullName}`)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const { redirect } = await impersonateUser(i.id)
                                window.location.href = redirect
                              } catch {
                                onToast("Failed to login as user", "error")
                              }
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100"
                          >
                            Login
                          </button>
                          <AccountStatusActions user={i} busy={!!busy} runAction={runAction} />
                        </div>
                      </td>
                    </tr>
                    {showReview && (
                      <tr key={`${i.id}-kyc`} className="border-b border-border/50 bg-muted/10">
                        <td colSpan={7} className="px-3 py-3">
                          <AdminKycReviewPanel
                            userId={i.id}
                            userName={i.fullName}
                            kyc={i.kycApplicationId ? getKycByUserId(i.id) : undefined}
                            onUpdated={() => { void pg.reload() }}
                            onClose={() => setReviewUserId(null)}
                            compact
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {pg.users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No investors found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <PaginationBar
        page={pg.page}
        lastPage={pg.lastPage}
        total={pg.total}
        perPage={pg.perPage}
        onPageChange={pg.setPage}
        onPerPageChange={pg.setPerPage}
      />
    </div>
  )
}

function SuppliersTab({
  onToast,
  openCreate = false,
  onCreateConsumed,
}: {
  onToast: ToastFn
  openCreate?: boolean
  onCreateConsumed?: () => void
}) {
  const pg = usePaginatedUsers("supplier")
  const [actionId, setActionId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!openCreate) return
    setCreateOpen(true)
    onCreateConsumed?.()
  }, [openCreate, onCreateConsumed])

  const runAction = async (key: string, action: () => Promise<void>, success: string) => {
    setActionId(key)
    await runAdminAction(action, {
      reload: pg.reload,
      successMessage: success,
      onSuccess: m => onToast(m || success, "success"),
      onError: m => onToast(m, "error"),
    })
    setActionId(null)
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={pg.searchInput}
            onChange={e => pg.setSearchInput(e.target.value)}
            placeholder="Search suppliers..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none"
          />
        </div>
        <CreateUserControl
          role="supplier"
          label="Add supplier"
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={msg => { void pg.reload(); onToast(msg) }}
        />
      </div>
      {pg.loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading suppliers…
        </div>
      )}
      {!pg.loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Supplier", "Category", "Rating", "Capacity", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pg.users.map(s => {
                const st = STATUS_BADGE[s.kycStatus] || STATUS_BADGE.pending
                const busy = actionId?.startsWith(s.id)
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[13px]">{s.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">{s.email}</div>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{s.category || "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[12px] font-medium">{s.rating?.toFixed(1) || "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-muted-foreground">{s.capacity || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        {s.kycStatus === "pending" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runAction(`${s.id}-verify`, () => updateUserKYCAsync(s.id, "verified"), `Supplier verified`)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { redirect } = await impersonateUser(s.id)
                              window.location.href = redirect
                            } catch {
                              onToast("Failed to login as user", "error")
                            }
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100"
                        >
                          Login
                        </button>
                        <AccountStatusActions user={s} busy={!!busy} runAction={runAction} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {pg.users.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No suppliers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <PaginationBar
        page={pg.page}
        lastPage={pg.lastPage}
        total={pg.total}
        perPage={pg.perPage}
        onPageChange={pg.setPage}
        onPerPageChange={pg.setPerPage}
      />
    </div>
  )
}

export { BuyersTab, InvestorsTab, SuppliersTab, STATUS_BADGE }
