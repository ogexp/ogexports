export type ReviewStatus = "pending" | "approved" | "rejected" | "cancelled" | "unpaid" | string

export function normalizeReviewStatus(status?: string | null): ReviewStatus {
  const raw = String(status || "").trim().toLowerCase()
  if (!raw || raw === "unpaid") return raw || "unpaid"
  if (raw === "pending_verification" || raw === "pending") return "pending"
  if (raw === "paid" || raw === "partial" || raw === "approved") return "approved"
  if (raw === "rejected") return "rejected"
  if (raw === "cancelled" || raw === "canceled") return "cancelled"
  return raw
}

export function paymentStatusLabel(status?: string | null): string {
  const normalized = normalizeReviewStatus(status)
  switch (normalized) {
    case "pending":
      return "Pending"
    case "approved":
      return "Approved"
    case "rejected":
      return "Rejected"
    case "cancelled":
      return "Cancelled"
    case "unpaid":
      return "Unpaid"
    default: {
      const raw = String(status || "").trim().toLowerCase()
      if (raw === "review") return "Under Review"
      if (raw === "completed") return "Completed"
      if (raw === "active") return "Approved"
      return status ? String(status) : "—"
    }
  }
}

export function paymentStatusBadgeClass(status?: string | null): string {
  const raw = String(status || "").trim().toLowerCase()
  if (raw === "review") return "bg-blue-500/15 text-blue-600"
  if (raw === "completed") return "bg-emerald-500/15 text-emerald-600"
  if (raw === "active") return "bg-emerald-500/15 text-emerald-600"
  switch (normalizeReviewStatus(status)) {
    case "pending":
      return "bg-amber-500/15 text-amber-600"
    case "approved":
      return "bg-emerald-500/15 text-emerald-600"
    case "rejected":
      return "bg-destructive/15 text-destructive"
    case "cancelled":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function paymentStatusIconKind(status?: string | null): "pending" | "approved" | "other" {
  const normalized = normalizeReviewStatus(status)
  if (normalized === "pending") return "pending"
  if (normalized === "approved") return "approved"
  return "other"
}

/** Orders that should not appear under "Orders awaiting payment". */
export function shouldHideFromAwaitingPayment(status?: string | null): boolean {
  const normalized = normalizeReviewStatus(status)
  return normalized === "pending" || normalized === "approved"
}
