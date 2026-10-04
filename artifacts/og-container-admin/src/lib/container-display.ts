/** Normalize container type for display, e.g. "40ft" → "40 ft". */
export function formatContainerType(type?: string | null): string {
  if (!type || !String(type).trim()) return ""
  return String(type)
    .trim()
    .replace(/(\d)\s*ft/gi, "$1 ft")
    .replace(/\s+/g, " ")
}

/**
 * Combined container label for listings.
 * - both → "Container-123 (40 ft)"
 * - number only → "Container-123"
 * - type only → "40 ft"
 * - neither → "—"
 */
export function formatContainerLabel(
  number?: string | null,
  type?: string | null,
): string {
  const no = number != null ? String(number).trim() : ""
  const typed = formatContainerType(type)
  if (no && typed) return `${no} (${typed})`
  if (no) return no
  if (typed) return typed
  return "—"
}
