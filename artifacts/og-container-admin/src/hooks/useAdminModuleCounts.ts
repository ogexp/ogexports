import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "wouter"
import { api } from "@/lib/api"

export type AdminModuleCounts = Record<string, number>

const MODULE_BADGE_MAP: Record<string, string> = {
  "/admin/users": "users",
  "/admin/compliance": "compliance",
  "/admin/container-investments": "container_investments",
  "/admin/fresh-produce": "fresh_produce_investments",
  "/admin/processing-plant": "processing_plant_investments",
  "/admin/rice-mill": "rice_mill_investments",
  "/admin/feed-mill": "feed_mill_investments",
  "/admin/investments": "investments_overview",
  "/admin/finance?tab=investor-deposits": "investor_deposits",
  "/admin/finance?tab=buyer-deposits": "buyer_deposits",
  "/admin/project-deposits": "project_deposits",
  "/admin/pending-withdrawals": "pending_withdrawals",
  "/admin/finance?tab=withdrawals": "withdrawals",
  "/admin/messages": "contact_inquiries",
  "/admin/orders": "orders_rfqs",
  "/admin/quotations": "quotations_pending",
}

export function resolveAdminModuleKey(pathname: string, search = typeof window !== "undefined" ? window.location.search : ""): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const tab = params.get("tab")

  if (pathname === "/admin/finance" && tab) {
    return MODULE_BADGE_MAP[`/admin/finance?tab=${tab}`] ?? null
  }

  if (pathname === "/admin/compliance") {
    if (tab && tab !== "kyc" && tab !== "") return null
    return "compliance"
  }

  return MODULE_BADGE_MAP[pathname] ?? null
}

export function moduleBadgeForHref(href: string, counts: AdminModuleCounts): number {
  const module = MODULE_BADGE_MAP[href]
  if (!module) return 0
  return counts[module] ?? 0
}

export function useAdminModuleCounts() {
  const [location] = useLocation()
  const [counts, setCounts] = useState<AdminModuleCounts>({})
  const [routeTick, setRouteTick] = useState(0)
  const lastMarked = useRef<string | null>(null)

  const fetchCounts = useCallback(async () => {
    try {
      const res = await api.get<{ data: AdminModuleCounts }>("/api/admin/module-counts")
      setCounts(res?.data ?? {})
    } catch {
      // ignore
    }
  }, [])

  const markViewed = useCallback(async (module: string) => {
    try {
      const res = await api.post<{ data: AdminModuleCounts }>(`/api/admin/module-views/${module}`)
      if (res?.data) setCounts(res.data)
      else await fetchCounts()
      window.dispatchEvent(new CustomEvent("og-admin-unread"))
    } catch {
      // ignore
    }
  }, [fetchCounts])

  useEffect(() => {
    void fetchCounts()
    const onCustom = () => { void fetchCounts() }
    window.addEventListener("og-admin-unread", onCustom)
    const t = setInterval(() => { void fetchCounts() }, 30000)
    return () => {
      window.removeEventListener("og-admin-unread", onCustom)
      clearInterval(t)
    }
  }, [fetchCounts])

  // Track query-string changes (finance tabs) — wouter location is path-only
  useEffect(() => {
    const bump = () => setRouteTick(v => v + 1)
    window.addEventListener("popstate", bump)
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = (...args) => { origPush(...args); bump() }
    history.replaceState = (...args) => { origReplace(...args); bump() }
    return () => {
      window.removeEventListener("popstate", bump)
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [])

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : ""
    const module = resolveAdminModuleKey(location, search)
    if (!module) return
    const key = `${module}:${location}${search}`
    if (lastMarked.current === key) return
    lastMarked.current = key
    void markViewed(module)
  }, [location, routeTick, markViewed])

  return { counts, fetchCounts, markViewed, badgeForHref: (href: string) => moduleBadgeForHref(href, counts) }
}
