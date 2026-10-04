import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import {
  EMPTY_DASHBOARD,
  type AdminDashboardData,
} from "@/types/admin-dashboard"

export type DashboardPeriod = "today" | "week" | "month" | "quarter" | "year"

export function useAdminDashboard(pollMs = 60000, period: DashboardPeriod = "month") {
  const [data, setData] = useState<AdminDashboardData>(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get<{ data: AdminDashboardData }>("/api/admin/dashboard", { period })
      setData(res?.data ?? EMPTY_DASHBOARD)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    setLoading(true)
    void refresh()
    if (!pollMs || pollMs <= 0) return
    const t = setInterval(() => { void refresh() }, pollMs)
    return () => clearInterval(t)
  }, [refresh, pollMs])

  return { data, loading, error, lastUpdated, refresh }
}
