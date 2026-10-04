/** Canonical order delivery statuses — shared by admin + buyer. */

export const ORDER_STATUS_CODES = [
  "order_confirmed",
  "payment",
  "production",
  "quality_inspection",
  "loaded_at_port",
  "in_transit",
  "delivered",
  "cancelled",
] as const

export type OrderStatusCode = (typeof ORDER_STATUS_CODES)[number]

/** Timeline steps shown to buyers (excludes cancelled). */
export const ORDER_TIMELINE_CODES = [
  "order_confirmed",
  "payment",
  "production",
  "quality_inspection",
  "loaded_at_port",
  "in_transit",
  "delivered",
] as const

export type OrderTimelineCode = (typeof ORDER_TIMELINE_CODES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  order_confirmed: "Order Confirmed",
  payment: "Payment",
  production: "Production / Procurement",
  quality_inspection: "Quality Inspection",
  loaded_at_port: "Loaded at Port",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export const ORDER_STATUS_COLORS: Record<OrderStatusCode, { bg: string; color: string }> = {
  order_confirmed: { bg: "#eff6ff", color: "#3b82f6" },
  payment: { bg: "#f5f3ff", color: "#8b5cf6" },
  production: { bg: "#fffbeb", color: "#f59e0b" },
  quality_inspection: { bg: "#ecfeff", color: "#06b6d4" },
  loaded_at_port: { bg: "#f0fdf4", color: "#16a34a" },
  in_transit: { bg: "#f0f9ff", color: "#0ea5e9" },
  delivered: { bg: "#f0fdf4", color: "#4CAF50" },
  cancelled: { bg: "#fef2f2", color: "#ef4444" },
}

/** Admin status actions: timeline steps + cancelled */
export const ORDER_STATUS_ACTIONS: OrderStatusCode[] = [...ORDER_STATUS_CODES]

export function normalizeOrderStatus(raw: string | null | undefined): OrderStatusCode {
  const s = String(raw || "order_confirmed").toLowerCase().replace(/\s+/g, "_")
  if (s === "pending" || s === "confirmed") return "order_confirmed"
  if (s === "shipping" || s === "shipped" || s === "in-transit") return "in_transit"
  if (s === "in_production" || s === "in-production") return "production"
  if (s === "payment_confirmed" || s === "paid") return "payment"
  if (s === "canceled") return "cancelled"
  if ((ORDER_STATUS_CODES as readonly string[]).includes(s)) return s as OrderStatusCode
  return "order_confirmed"
}

export function orderStatusLabel(code: string | null | undefined): string {
  const normalized = normalizeOrderStatus(code)
  return ORDER_STATUS_LABELS[normalized]
}

export function timelineIndexForStatus(status: OrderStatusCode): number {
  if (status === "cancelled") return 0
  const idx = ORDER_TIMELINE_CODES.indexOf(status as OrderTimelineCode)
  return idx >= 0 ? idx : 0
}

export type StatusTimelineMap = Partial<Record<OrderTimelineCode, string | null>>

export function formatTimelineDate(iso: string | null | undefined): string {
  if (!iso) return "TBD"
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return "TBD"
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

export function buildOrderTimeline(
  statusRaw: string | null | undefined,
  statusTimeline: StatusTimelineMap | null | undefined,
  placedAtIso?: string | null,
): { code: OrderTimelineCode; step: string; date: string; done: boolean; active: boolean }[] {
  const status = normalizeOrderStatus(statusRaw)
  const activeIndex = timelineIndexForStatus(status)
  const placedFallback = placedAtIso
    ? formatTimelineDate(String(placedAtIso).slice(0, 10))
    : "TBD"

  return ORDER_TIMELINE_CODES.map((code, i) => {
    const rawDate = statusTimeline?.[code]
    let date = formatTimelineDate(rawDate ?? undefined)
    if (date === "TBD" && code === "order_confirmed") date = placedFallback
    if (status === "cancelled" && i === 0) {
      return {
        code,
        step: "Cancelled",
        date: date === "TBD" ? placedFallback : date,
        done: true,
        active: false,
      }
    }
    return {
      code,
      step: ORDER_STATUS_LABELS[code],
      date: i <= activeIndex && date === "TBD" && status !== "cancelled" ? placedFallback : date,
      done: status === "delivered" ? true : status !== "cancelled" && i < activeIndex,
      active: status !== "cancelled" && status !== "delivered" && i === activeIndex,
    }
  })
}
