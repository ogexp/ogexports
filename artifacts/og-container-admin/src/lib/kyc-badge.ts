export function kycDashboardBadge(status?: string | null, hasUploads = false) {
  const s = (status || "missing").toLowerCase()
  if (s === "approved") {
    return {
      approved: true,
      label: "✓ KYC Verified",
      className: "bg-emerald-500/20 border-emerald-400/40 text-white",
    }
  }
  if (s === "review" || (s === "pending" && hasUploads)) {
    return {
      approved: false,
      label: "KYC Under Review",
      className: "bg-amber-500/20 border-amber-400/40 text-white",
    }
  }
  if (s === "rejected") {
    return {
      approved: false,
      label: "KYC Rejected",
      className: "bg-red-600/80 border-red-500/50 text-white",
    }
  }
  return {
    approved: false,
    label: "KYC Unverified",
    className: "bg-red-600 border-red-500/50 text-white",
  }
}

/** Light-surface variant for top bars (not on dark green banners). */
export function kycTopBarBadge(status?: string | null, hasUploads = false) {
  const s = (status || "missing").toLowerCase()
  if (s === "approved") {
    return {
      approved: true,
      label: "KYC Verified",
      className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
      dotClassName: "bg-emerald-500",
    }
  }
  if (s === "review" || (s === "pending" && hasUploads)) {
    return {
      approved: false,
      label: "Under Review",
      className: "bg-amber-500/10 border-amber-500/30 text-amber-600",
      dotClassName: "bg-amber-500",
    }
  }
  if (s === "rejected") {
    return {
      approved: false,
      label: "KYC Rejected",
      className: "bg-red-600/10 border-red-500/30 text-red-600",
      dotClassName: "bg-red-600",
    }
  }
  return {
    approved: false,
    label: "KYC Unverified",
    className: "bg-red-600/10 border-red-500/30 text-red-600",
    dotClassName: "bg-red-600",
  }
}

/** Per-step badge styles for investor / buyer KYC pages. */
export function kycStepBadge(status?: string | null) {
  const s = (status || "pending").toLowerCase()
  if (s === "verified" || s === "approved" || s === "completed") {
    return {
      label: "Verified",
      className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
      cardClassName: "border-emerald-500/20 bg-emerald-500/5",
    }
  }
  if (s === "review" || s === "pending_review") {
    return {
      label: "Under Review",
      className: "bg-amber-500/15 text-amber-600 border-amber-500/20",
      cardClassName: "border-amber-500/30 bg-amber-500/5",
    }
  }
  if (s === "rejected") {
    return {
      label: "Rejected",
      className: "bg-red-500/15 text-red-600 border-red-500/20",
      cardClassName: "border-red-500/30 bg-red-500/5",
    }
  }
  return {
    label: "Unverified",
    className: "bg-red-500/15 text-red-600 border-red-500/20",
    cardClassName: "border-red-500/30 bg-red-500/5",
  }
}
