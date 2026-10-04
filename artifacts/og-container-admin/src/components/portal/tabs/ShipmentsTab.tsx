import { useState } from "react"
import { useListShipments, useGetMe } from "@workspace/api-client-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ShipmentStatusBadge } from "../status-badges"

function fmtDate(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString()
}

/** Normalize Laravel snake_case shipment rows for the account portal tab. */
function mapShip(ship: any) {
  return {
    id: ship.id,
    orderId: ship.order?.order_number || ship.order_id || ship.orderId || "—",
    status: ship.status || "pending",
    shippingLine: ship.shipping_line || ship.shippingLine || "—",
    container: ship.container || "—",
    vessel: ship.vessel || "—",
    origin: ship.origin || "—",
    destination: ship.destination || "—",
    etd: fmtDate(ship.etd),
    eta: fmtDate(ship.eta),
    currentMilestone: ship.current_milestone || ship.currentMilestone || "—",
  }
}

export function ShipmentsTab() {
  const { data: shipments, isLoading } = useListShipments()
  const { data: me } = useGetMe()
  const isSupplier = me?.accountType === "supplier"
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>

  const rows = (shipments || []).map(mapShip)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold">Shipments & Tracking</h2>
        {isSupplier && (
          <p className="text-xs text-muted-foreground">Shipment updates are managed by the trade desk.</p>
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground border-dashed">
          <p>No shipments tracked yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map(ship => (
            <Card key={ship.id}>
              <CardContent className="p-6 flex flex-col gap-4">
                <button
                  type="button"
                  className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center text-left w-full"
                  onClick={() => setExpandedId(expandedId === ship.id ? null : ship.id)}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-heading font-semibold text-lg">Order #{ship.orderId}</h3>
                      <ShipmentStatusBadge status={ship.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 bg-muted/30 p-4 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Shipping Line</div>
                        <div className="font-medium">{ship.shippingLine}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Container</div>
                        <div className="font-medium font-mono text-xs">{ship.container}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Route</div>
                        <div className="font-medium text-sm">{ship.origin} → {ship.destination}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ETA</div>
                        <div className="font-medium">{ship.eta}</div>
                      </div>
                    </div>
                    {ship.vessel !== "—" && (
                      <div className="text-sm text-muted-foreground pt-1">Vessel: {ship.vessel}</div>
                    )}
                    {ship.currentMilestone !== "—" && (
                      <div className="text-sm text-muted-foreground">Milestone: {ship.currentMilestone}</div>
                    )}
                  </div>
                </button>
                {expandedId === ship.id && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border pt-4">
                    {[
                      { label: "ETD", value: ship.etd },
                      { label: "ETA", value: ship.eta },
                      { label: "Vessel", value: ship.vessel },
                      { label: "Current Milestone", value: ship.currentMilestone },
                    ].map(field => (
                      <div key={field.label} className="p-3 rounded-xl bg-muted/30">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{field.label}</p>
                        <p className="text-xs font-semibold">{field.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
