/**
 * Parse platform setting booleans from API payloads.
 * Treats false / 0 / "0" / "false" as off; true / 1 / "1" / "true" as on.
 * Missing / unrecognized → `defaultValue` (product default for dual currency is on).
 */
export function parsePlatformBool(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === "boolean") return value
  if (typeof value === "number") {
    if (value === 0) return false
    if (value === 1) return true
    return defaultValue
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
      return false
    }
    if (normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes") {
      return true
    }
    return defaultValue
  }
  return defaultValue
}
