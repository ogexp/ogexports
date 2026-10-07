import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, FileText, Loader2, Search } from "lucide-react"
import { api, unwrapPage } from "@/lib/api"
import { InvestmentPositionCard, mapRowToPosition, type InvestmentPositionData } from "@/components/invest/InvestmentPositionCard"
import { createTransactionReceipt, downloadTransactionReceipt } from "@/lib/transaction-receipt"

type InvestmentHistoryItem = {
  position: InvestmentPositionData
  serverRecord: Record<string, unknown>
}

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
] as const

export default function ContainerInvestments() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<InvestmentHistoryItem[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setRefreshVersion(version => version + 1)
    window.addEventListener("og-investor-records-updated", refresh)
    return () => window.removeEventListener("og-investor-records-updated", refresh)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await api.get("/api/investor/investments", {
          per_page: 100,
          project_type: "container",
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(search ? { search } : {}),
        })
        const rows = unwrapPage<any>(res).data
        const mapped = (rows || [])
          .filter((row: any) => String(row?.project?.type || "").toLowerCase() === "container")
          .map((row: any) => ({
            position: mapRowToPosition(row),
            serverRecord: row as Record<string, unknown>,
          }))
          .filter((item: InvestmentHistoryItem): item is InvestmentHistoryItem => item.position != null)
        if (!cancelled) setItems(mapped)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [statusFilter, search, refreshVersion])

  const summary = useMemo(() => {
    return {
      total: items.length,
      inTransit: items.filter(({ position }) => position.projectStatus === "in_transit" || position.status === "in_transit").length,
      completed: items.filter(({ position }) => position.investmentStatus === "completed" || position.status === "completed").length,
    }
  }, [items])

  const hasFilters = Boolean(statusFilter || search)

  return (
    <InvestPortalLayout
      title="My Container Investments"
      subtitle="Recorded milestones and account-backed investment status"
    >
      <div className="space-y-5">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Positions", value: String(summary.total), sub: "your investments" },
            { label: "In Transit", value: String(summary.inTransit), sub: "recorded project status" },
            { label: "Profit Figures", value: "Not provided", sub: "not supplied as an aggregate" },
            { label: "Completed", value: String(summary.completed), sub: "settled trades" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="p-4 rounded-xl border border-border bg-card">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by reference, project, vessel…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
            />
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/invest/reports"><FileText className="w-3.5 h-3.5 mr-1.5" />Export PDF</Link>
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your investments…
          </div>
        )}

        {!loading && items.length === 0 && (
          <Card className="glass-card">
            <CardContent className="py-16 text-center space-y-3">
              <Package className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="font-medium">{hasFilters ? "No matching investments" : "No investments yet"}</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Try a different reference number, project name, or clear your filters."
                  : "Browse opportunities and invest to see your positions here."}
              </p>
              {hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("")
                    setSearchInput("")
                    setSearch("")
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/invest/opportunities">Browse Opportunities</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {items.map(({ position, serverRecord }) => (
          <div key={position.id} className="space-y-2">
            <InvestmentPositionCard inv={position} />
            <Button
              size="sm"
              variant="outline"
              data-testid={`investment-history-receipt-${position.id}`}
              onClick={() => downloadTransactionReceipt(createTransactionReceipt("investment", serverRecord))}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Download transaction receipt
            </Button>
          </div>
        ))}
      </div>
    </InvestPortalLayout>
  )
}
