import { useGetPortalAnalytics } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Activity, FileText, ShoppingCart, DollarSign, Package } from "lucide-react"
import { useCurrency } from "@/lib/use-currency"

export function AnalyticsTab() {
  const { data: analytics, isLoading } = useGetPortalAnalytics()
  const c = useCurrency()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4,5,6,7,8].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!analytics) return null

  const formatCurrency = (amount: number) => c.fmt(Number(amount) || 0)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total RFQs</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRfqs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.openRfqs} currently open
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.activeOrders} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{formatCurrency(analytics.totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(analytics.totalPaid)} paid
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(analytics.outstandingBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        {analytics.totalListings !== undefined && analytics.totalListings !== null && (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Your Listings</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalListings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Products in catalog
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">RFQs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.rfqsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="text-sm capitalize">{status.replace('_', ' ')}</div>
                  <div className="font-medium">{count}</div>
                </div>
              ))}
              {Object.keys(analytics.rfqsByStatus).length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center">No RFQ data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="text-sm capitalize">{status.replace('_', ' ')}</div>
                  <div className="font-medium">{count}</div>
                </div>
              ))}
              {Object.keys(analytics.ordersByStatus).length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center">No Order data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
