export function formatInvestorProjectAmount(
  amount?: number | null,
  currency?: string | null,
): string {
  const code = String(currency ?? "").trim().toUpperCase()
  if (amount == null || !Number.isFinite(amount) || !/^[A-Z]{3}$/.test(code)) {
    return "Not provided"
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return "Not provided"
  }
}
