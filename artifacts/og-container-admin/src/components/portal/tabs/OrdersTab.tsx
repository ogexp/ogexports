import { useListOrders, useUpdateOrderStatus, useGetMe } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { OrderStatusBadge } from "../status-badges"

export function OrdersTab() {
  const { data: orders, isLoading, refetch } = useListOrders()
  const { data: me } = useGetMe()
  const isSupplier = me?.accountType === "supplier"
  const updateStatus = useUpdateOrderStatus()
  const { toast } = useToast()

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>

  const handleStatusUpdate = (id: number, status: any) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Order updated" })
        refetch()
      },
      onError: (error) => toast({ title: "Update failed", description: error.message, variant: "destructive" })
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-heading font-bold">Orders</h2>
      
      {orders?.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground border-dashed">
          <p>No orders found.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders?.map(order => (
            <Card key={order.id}>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading font-semibold text-lg">Order #{order.id}</h3>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>Product ID: <span className="font-medium text-foreground">{order.productId}</span></div>
                    <div>Quantity: <span className="font-medium text-foreground">{order.quantity}</span></div>
                    <div>Agreed Price: <span className="font-medium text-foreground">{order.agreedPrice || 'Pending'}</span></div>
                    <div>Created: {new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[180px]">
                  {isSupplier && (
                    <Select value={order.status} onValueChange={(val) => handleStatusUpdate(order.id, val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_production">In Production</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {!isSupplier && order.status === "pending" && (
                    <Button variant="outline" className="text-destructive w-full" onClick={() => handleStatusUpdate(order.id, "cancelled")}>
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
