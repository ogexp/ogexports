import { useEffect, useState } from "react"
import { CheckCircle2, Download, ExternalLink, FileText, Loader2, XCircle } from "lucide-react"
import { downloadPublicFile, openPublicFile, resolveDocumentUrl } from "@/lib/api"
import {
  approveKYCAsync,
  fetchUserKyc,
  getKycByUserId,
  rejectKYCAsync,
  type AdminKYC,
  type AdminKycDocument,
} from "@/lib/admin-data"

const GREEN = "#4CAF50"

function getDocUrl(doc: AdminKycDocument): string | undefined {
  const url = resolveDocumentUrl(doc)
  return url || undefined
}

interface Props {
  kyc?: AdminKYC | null
  userId?: string
  userName?: string
  onClose?: () => void
  onUpdated?: () => void
  onToast?: (msg: string, type?: "success" | "error") => void
  compact?: boolean
}

export function AdminKycReviewPanel({ kyc: initialKyc, userId, userName, onClose, onUpdated, onToast, compact }: Props) {
  const [kyc, setKyc] = useState<AdminKYC | null>(initialKyc || (userId ? getKycByUserId(userId) || null : null))
  const [loading, setLoading] = useState(!initialKyc && !!userId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (initialKyc) {
      setKyc(initialKyc)
      setLoading(false)
      return
    }
    if (!userId) return
    setLoading(true)
    fetchUserKyc(userId)
      .then(data => setKyc(data))
      .finally(() => setLoading(false))
  }, [initialKyc, userId])

  const handleApprove = async () => {
    if (!kyc) return
    setBusy(true)
    setError("")
    try {
      await approveKYCAsync(kyc.id)
      setKyc({ ...kyc, status: "approved" })
      onUpdated?.()
      onToast?.("KYC approved", "success")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Approval failed"
      setError(msg)
      onToast?.(msg, "error")
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!kyc) return
    setBusy(true)
    setError("")
    try {
      await rejectKYCAsync(kyc.id)
      setKyc({ ...kyc, status: "rejected" })
      onUpdated?.()
      onToast?.("KYC rejected", "success")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Rejection failed"
      setError(msg)
      onToast?.(msg, "error")
    } finally {
      setBusy(false)
    }
  }

  const handleViewDoc = (doc: AdminKycDocument) => {
    const url = getDocUrl(doc)
    if (!url) return
    openPublicFile(url)
  }

  const handleDownloadDoc = (doc: AdminKycDocument) => {
    const url = getDocUrl(doc)
    if (!url) return
    downloadPublicFile(url, doc.originalName || doc.label)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading KYC documents…
      </div>
    )
  }

  if (!kyc) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        No KYC application found{userName ? ` for ${userName}` : ""}.
      </div>
    )
  }

  const canReview = kyc.status === "pending" || kyc.status === "review" || kyc.status === "rejected"
  const isApproved = kyc.status === "approved" || kyc.status === "verified"

  return (
    <div className={compact ? "space-y-3" : "mt-3 pt-3 border-t border-border space-y-3"}>
      {isApproved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Approved — documents available for audit.
        </div>
      )}
      {kyc.status === "rejected" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          Rejected — you can re-approve after review.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      )}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold">{kyc.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {kyc.type === "company" ? "Company" : "Individual"} · {kyc.country} · Submitted {kyc.submitted}
          </div>
          {kyc.notes && <p className="text-[11px] text-muted-foreground mt-1">Notes: {kyc.notes}</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        )}
      </div>

      {kyc.documents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {kyc.documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{doc.label}</div>
                  {doc.originalName && (
                    <div className="text-[10px] text-muted-foreground truncate">{doc.originalName}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => handleViewDoc(doc)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border border-border hover:bg-muted">
                  <ExternalLink className="w-3 h-3" /> View
                </button>
                <button type="button" onClick={() => handleDownloadDoc(doc)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border border-border hover:bg-muted">
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canReview && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleApprove()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-60"
            style={{ background: GREEN }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve KYC
          </button>
          {kyc.status !== "rejected" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReject()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  )
}
