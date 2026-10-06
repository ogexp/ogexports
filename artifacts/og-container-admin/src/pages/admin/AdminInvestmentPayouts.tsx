import { useCallback, useEffect, useState } from "react"
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, RefreshCw, Save, Search } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import {
  fetchInvestmentPayouts,
  updateInvestmentPayoutProgress,
  type AdminInvestmentPayoutRow,
} from "@/lib/admin-data"

type PayoutDraft = {
  status: "" | "scheduled" | "processing"
  plannedDate: string
}

const PER_PAGE = 25

function dateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : ""
}

function formatDate(value?: string | null): string {
  const raw = dateInputValue(value)
  if (!raw) return "Not set"
  const date = new Date(`${raw}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function formatAmount(value: number, currency?: string | null): string {
  const currencyCode = (currency || "USD").toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(Number(value))
  } catch {
    return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currencyCode}`
  }
}

function payoutLabel(status?: string | null): string {
  if (status === "distributed") return "Distributed"
  if (status === "scheduled") return "Scheduled"
  if (status === "processing") return "Processing"
  return "Awaiting update"
}

function payoutTone(status?: string | null): string {
  if (status === "distributed") return "bg-emerald-50 text-emerald-800"
  if (status === "processing") return "bg-blue-50 text-blue-700"
  if (status === "scheduled") return "bg-amber-50 text-amber-800"
  return "bg-slate-100 text-slate-600"
}

export default function AdminInvestmentPayouts() {
  const [rows, setRows] = useState<AdminInvestmentPayoutRow[]>([])
  const [drafts, setDrafts] = useState<Record<number, PayoutDraft>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [savingId, setSavingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const result = await fetchInvestmentPayouts({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
      })
      setRows(result.data)
      setLastPage(result.last_page)
      setTotal(result.total)
      setDrafts({})
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payout records could not be loaded."
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { void load() }, [load])

  function draftFor(row: AdminInvestmentPayoutRow): PayoutDraft {
    return drafts[row.investment_id] ?? {
      status: row.payout_status === "scheduled" || row.payout_status === "processing"
        ? row.payout_status
        : "",
      plannedDate: dateInputValue(row.planned_distribution_date),
    }
  }

  function updateDraft(row: AdminInvestmentPayoutRow, patch: Partial<PayoutDraft>) {
    const current = draftFor(row)
    const next = { ...current, ...patch }
    if (next.status === "") next.plannedDate = ""
    setDrafts(currentDrafts => ({ ...currentDrafts, [row.investment_id]: next }))
  }

  async function save(row: AdminInvestmentPayoutRow) {
    const draft = draftFor(row)
    setSavingId(row.investment_id)
    setToast(null)
    try {
      await updateInvestmentPayoutProgress(
        row.investment_id,
        draft.status || null,
        draft.plannedDate || null,
      )
      setToast({ message: `Payout progress saved for ${row.investment_reference || `investment ${row.investment_id}`}.`, error: false })
      await load()
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Payout progress could not be saved.",
        error: true,
      })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminLayout
      title="Investment Payouts"
      subtitle="Record scheduled or processing payouts. An investment is marked distributed only after the payout is confirmed."
    >
      <div className="space-y-4">
        {toast && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${toast.error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">
            {toast.message}
          </div>
        )}

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Payout progress</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Planned dates are not payment confirmations. Only the recorded distribution timestamp marks a payout as distributed.
              </p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }} className="mt-4 flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Search investor, reference, or project"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
        </section>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">Try again</button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading payout records…
            </div>
          ) : !loadError && rows.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 text-center">
              <CalendarClock className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold">No active investment payouts found</p>
              <p className="text-xs text-muted-foreground">Active investments will appear here when they are ready for payout updates.</p>
            </div>
          ) : !loadError ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left">
                  <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Investment</th>
                      <th className="px-4 py-3 font-semibold">Investor</th>
                      <th className="px-4 py-3 font-semibold">Invested</th>
                      <th className="px-4 py-3 font-semibold">Payout status</th>
                      <th className="px-4 py-3 font-semibold">Planned / distributed date</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(row => {
                      const draft = draftFor(row)
                      const confirmed = Boolean(row.distributed_at)
                      const editable = !confirmed && row.investment_status === "active"
                      const changed = editable && (
                        draft.status !== (row.payout_status === "scheduled" || row.payout_status === "processing" ? row.payout_status : "")
                        || draft.plannedDate !== dateInputValue(row.planned_distribution_date)
                      )
                      const rowSaving = savingId === row.investment_id
                      return (
                        <tr key={row.investment_id} className="align-top">
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-foreground">{row.investment_reference || `Investment ${row.investment_id}`}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.project_title || "Project not reported"}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-foreground">{row.investor_name || "Investor not reported"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.investor_email || "—"}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-foreground">
                            {formatAmount(row.invested_amount, row.amount_currency)}
                          </td>
                          <td className="px-4 py-4">
                            {confirmed ? (
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${payoutTone("distributed")}`}>
                                Distributed
                              </span>
                            ) : (
                              <div className="space-y-2">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${payoutTone(draft.status || null)}`}>
                                  {payoutLabel(draft.status || null)}
                                </span>
                                <select
                                  aria-label={`Payout status for ${row.investment_reference || row.investment_id}`}
                                  value={draft.status}
                                  onChange={event => updateDraft(row, { status: event.target.value as PayoutDraft["status"] })}
                                  disabled={!editable}
                                  className="block h-9 w-full max-w-44 rounded-lg border border-border bg-white px-2 text-xs"
                                >
                                  <option value="">Awaiting update</option>
                                  <option value="scheduled">Scheduled</option>
                                  <option value="processing">Processing</option>
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {confirmed ? (
                              <p className="text-sm text-muted-foreground">{formatDate(row.distributed_at)}</p>
                            ) : (
                              <div>
                                <input
                                  aria-label={`Planned payout date for ${row.investment_reference || row.investment_id}`}
                                  type="date"
                                  value={draft.plannedDate}
                                  disabled={!editable || !draft.status}
                                  onChange={event => updateDraft(row, { plannedDate: event.target.value })}
                                  className="h-9 w-full max-w-44 rounded-lg border border-border bg-white px-2 text-xs disabled:bg-muted disabled:text-muted-foreground"
                                />
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {draft.plannedDate ? formatDate(draft.plannedDate) : "Optional; not a confirmed payment date"}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {confirmed ? (
                              <span className="text-xs text-muted-foreground">{formatDate(row.distributed_at)}</span>
                            ) : (
                              <button
                                type="button"
                                disabled={!changed || rowSaving}
                                onClick={() => void save(row)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {rowSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">{total.toLocaleString()} investment{total === 1 ? "" : "s"}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Page {page} of {lastPage}</span>
                  <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1 || loading} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setPage(value => Math.min(lastPage, value + 1))} disabled={page >= lastPage || loading} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  )
}
