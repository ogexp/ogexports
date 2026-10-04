import { ApiError } from "@/lib/api"
import { notify } from "@/lib/notify"

export type BuyerTradeDocStatus = "available" | "pending"

export type BuyerTradeDocView = {
  id: number
  title: string
  type: string
  status: BuyerTradeDocStatus
  downloadUrl: string
  viewUrl: string
}

export function mapBuyerTradeDocument(raw: any): BuyerTradeDocView {
  const id = Number(raw?.id)
  const title = String(raw?.title || raw?.type || `Document #${id}`)
  const type = String(raw?.type || "Other")
  const status: BuyerTradeDocStatus = raw?.status === "pending" ? "pending" : "available"

  return {
    id,
    title,
    type,
    status,
    downloadUrl: raw?.download_url || `/api/buyer/documents/${id}/download`,
    viewUrl: raw?.view_url || `/api/buyer/documents/${id}/view`,
  }
}

export function notifyTradeDocumentDownloadError(error: unknown, fallback = "Unable to download document"): void {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      notify.error("File not available", error.message || "This document file is not available yet.")
      return
    }
    if (error.status === 401 || error.status === 403) {
      notify.error("Access denied", "Please sign in again to download this document.")
      return
    }
    notify.error(fallback, error.message)
    return
  }

  notify.error(fallback, error instanceof Error ? error.message : undefined)
}

export function notifyTradeDocumentViewError(error: unknown, fallback = "Unable to open document"): void {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      notify.error("File not available", error.message || "This document file is not available yet.")
      return
    }
    if (error.status === 401 || error.status === 403) {
      notify.error("Access denied", "Please sign in again to view this document.")
      return
    }
    notify.error(fallback, error.message)
    return
  }

  notify.error(fallback, error instanceof Error ? error.message : undefined)
}
