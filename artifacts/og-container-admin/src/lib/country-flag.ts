/**
 * Convert an ISO 3166-1 alpha-2 country code to a flag emoji.
 * Example: "AE" → "🇦🇪"
 */
export function isoToFlagEmoji(code?: string | null): string {
  const iso = String(code || "").trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(iso)) return ""
  const A = 0x1f1e6
  return String.fromCodePoint(
    A + (iso.charCodeAt(0) - 65),
    A + (iso.charCodeAt(1) - 65),
  )
}
