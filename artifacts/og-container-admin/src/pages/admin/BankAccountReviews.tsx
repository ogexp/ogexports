import { useEffect, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileText, LoaderCircle, ShieldCheck, XCircle } from "lucide-react"
import { ApiError, api, openAuthenticatedFile } from "@/lib/api"

type ReviewStatus = "pending" | "verified" | "rejected" | "all"

interface BankReviewRow {
  verification_id: number
  investor: {
    id: string | number | null
    name: string | null
    email: string | null
  }
  bank_account: {
    bank_name?: string
    account_holder?: string
    masked_account_identifier?: string | null
    currency?: string
    is_default?: boolean
  }
  status: Exclude<ReviewStatus, "all">
  account_matches: boolean
  proof_name: string | null
  submitted_at: string | null
  reviewed_at: string | null
  review_notes: string | null
}

interface BankReviewPage {
  data: BankReviewRow[]
  current_page?: number
  last_page?: number
  total?: number
}

interface BankAccountReviewsProps {
  search: string
  onToast: (message: string, type?: "success" | "error") => void
}

const statusOptions: Array<{ value: ReviewStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All records" },
]

function formatDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = error.errors ? Object.values(error.errors).flat()[0] : undefined
    return detail || error.message
  }
  return error instanceof Error ? error.message : "The request could not be completed."
}

function badgeClass(status: BankReviewRow["status"]): string {
  if (status === "verified") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-800"
  return "border-amber-200 bg-amber-50 text-amber-800"
}

export function BankAccountReviews({ search, onToast }: BankAccountReviewsProps) {
  const [status, setStatus] = useState<ReviewStatus>("pending")
  const [rows, setRows] = useState<BankReviewRow[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [activeReview, setActiveReview] = useState<number | null>(null)
  const [notesById, setNotesById] = useState<Record<number, string>>({})
  const [reloadKey, setReloadKey] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim())

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)

    api.get<BankReviewPage>("/api/admin/compliance/bank-accounts", {
      status,
      search: debouncedSearch || undefined,
      page,
      per_page: 20,
    }).then((response) => {
      if (!active) return
      setRows(Array.isArray(response.data) ? response.data : [])
      setPage(response.current_page || page)
      setLastPage(Math.max(1, response.last_page || 1))
      setTotal(response.total || 0)
    }).catch((error: unknown) => {
      if (!active) return
      setRows([])
      setTotal(0)
      setLoadError(getErrorMessage(error))
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [status, debouncedSearch, page, reloadKey])

  async function review(row: BankReviewRow, decision: "approve" | "reject") {
    const note = (notesById[row.verification_id] || "").trim()
    if (decision === "reject" && note.length < 3) {
      onToast("Add a rejection reason of at least 3 characters.", "error")
      return
    }

    setActiveReview(row.verification_id)
    try {
      await api.post(
        `/api/admin/compliance/bank-accounts/${row.verification_id}/${decision}`,
        { notes: note || null },
      )
      onToast(decision === "approve" ? "Bank account approved." : "Bank proof rejected.")
      setNotesById((current) => {
        const next = { ...current }
        delete next[row.verification_id]
        return next
      })
      setPage(1)
      setReloadKey((key) => key + 1)
    } catch (error) {
      onToast(getErrorMessage(error), "error")
      setReloadKey((key) => key + 1)
    } finally {
      setActiveReview(null)
    }
  }

  function viewProof(row: BankReviewRow) {
    void openAuthenticatedFile(
      `/api/admin/compliance/bank-accounts/${row.verification_id}/proof`,
      row.proof_name || "bank-proof",
    ).catch((error: unknown) => onToast(getErrorMessage(error), "error"))
  }

  return (
    <section className="space-y-4" aria-labelledby="bank-review-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="bank-review-heading" className="text-base font-semibold text-foreground">Investor bank account proofs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Account identifiers are masked. Proof files open through the authenticated API.</p>
        </div>
        <div className="text-xs text-muted-foreground" aria-live="polite">
          {loading ? "Loading review queue…" : `${total} ${status === "all" ? "record" : status} ${total === 1 ? "record" : "records"}`}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter bank reviews">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => { setStatus(option.value); setPage(1) }}
            aria-pressed={status === option.value}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === option.value
                ? "border-emerald-900 bg-emerald-900 text-white"
                : "border-border bg-white text-muted-foreground hover:bg-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Could not load bank review records</div>
            <div className="mt-1">{loadError}</div>
          </div>
        </div>
      )}

      {loading && rows.length === 0 && !loadError && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading from Laravel…
        </div>
      )}

      {!loading && !loadError && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No {status === "all" ? "" : `${status} `}bank proof submissions found.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const isPending = row.status === "pending"
          const note = notesById[row.verification_id] || ""
          const busy = activeReview === row.verification_id
          const investorName = row.investor.name?.trim() || `Investor ${row.investor.id ?? ""}`.trim()

          return (
            <article key={row.verification_id} className="rounded-xl border border-border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">{investorName}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${badgeClass(row.status)}`}>
                      {row.status}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">Review #{row.verification_id}</span>
                  </div>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {row.investor.email || "Email unavailable"}
                  </p>
                </div>
                {row.proof_name ? (
                  <button
                    type="button"
                    onClick={() => viewProof(row)}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View proof
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Proof file unavailable</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bank</div>
                  <div className="mt-1 text-xs font-medium">{row.bank_account.bank_name || "Not available"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Account holder</div>
                  <div className="mt-1 text-xs font-medium">{row.bank_account.account_holder || "Not available"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Masked identifier</div>
                  <div className="mt-1 font-mono text-xs font-medium">{row.bank_account.masked_account_identifier || "Not available"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Currency · submitted</div>
                  <div className="mt-1 text-xs font-medium">{row.bank_account.currency || "—"} · {formatDate(row.submitted_at)}</div>
                </div>
              </div>

              {!row.account_matches && isPending && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>These bank details changed after the proof was submitted. Approval is disabled; ask the investor to submit current proof.</span>
                </div>
              )}

              {!isPending && row.review_notes && (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Review note:</span> {row.review_notes}
                </div>
              )}

              {isPending && (
                <div className="mt-4 space-y-3">
                  <label htmlFor={`review-note-${row.verification_id}`} className="block text-xs font-semibold text-foreground">
                    Review note <span className="font-normal text-muted-foreground">(optional for approval, required for rejection)</span>
                  </label>
                  <textarea
                    id={`review-note-${row.verification_id}`}
                    value={note}
                    onChange={(event) => setNotesById((current) => ({ ...current, [row.verification_id]: event.target.value }))}
                    maxLength={2000}
                    rows={2}
                    disabled={busy}
                    placeholder="Add context for this review"
                    className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/10 disabled:opacity-60"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] text-muted-foreground">Rejection reason must be at least 3 characters.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void review(row, "reject")}
                        disabled={busy || note.trim().length < 3}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject proof
                      </button>
                      <button
                        type="button"
                        onClick={() => void review(row, "approve")}
                        disabled={busy || !row.account_matches}
                        title={!row.account_matches ? "Approval is blocked because the account no longer matches the submitted proof." : undefined}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {busy
                          ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          : <ShieldCheck className="h-3.5 w-3.5" />}
                        Approve account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isPending && row.reviewed_at && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Reviewed {formatDate(row.reviewed_at)}
                </p>
              )}
            </article>
          )
        })}
      </div>

      {!loadError && lastPage > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Page {page} of {lastPage}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-45"
            >
              <ArrowLeft className="h-3 w-3" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={loading || page >= lastPage}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-45"
            >
              Next <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}