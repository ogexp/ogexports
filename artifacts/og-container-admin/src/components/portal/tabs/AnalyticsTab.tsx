import { useGetPortalAnalytics } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, FileText, ShoppingCart, TrendingUp } from "lucide-react"
import { useCurrency } from "@/lib/use-currency"

export function AnalyticsTab() {
  const { data: analytics, isLoading, isError, refetch } = useGetPortalAnalytics()
  const currency = useCurrency()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 w-full rounded-xl" />)}
      </div>
    )
  }

  if (isError || !analytics) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="space-y-3 py-12 text-center">
          <p className="font-medium">Buyer analytics are unavailable.</p>
          <p className="text-sm text-muted-foreground">No sample figures are shown when the API cannot provide analytics.</p>
          <button className="text-sm font-medium text-primary underline underline-offset-4" onClick={() => void refetch()}>
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => currency.fmt(Number(amount))
  const metrics = [
    {
      label: "Total Orders",
      value: String(analytics.orders_total),
      detail: "All recorded orders",
      icon: ShoppingCart,
    },
    {
      label: "Total Spend",
      value: formatCurrency(analytics.spend_total),
      detail: "Recorded order value",
      icon: Activity,
    },
    {
      label: "RFQs Submitted",
      value: String(analytics.rfqs_total),
      detail: "All recorded requests",
      icon: FileText,
    },
    {
      label: "Accepted Quotes",
      value: String(analytics.quotations_accepted),
      detail: "Accepted quotations",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Spend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.spend_by_month.map((entry) => (
            <div key={entry.month} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
              <span className="text-sm text-muted-foreground">{entry.month}</span>
              <span className="font-medium">{formatCurrency(entry.total)}</span>
            </div>
          ))}
          {analytics.spend_by_month.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No monthly spend has been recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
