import { useEffect, useState } from "react"
import { Link } from "wouter"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlacedOrder, unitToMT } from "@/hooks/useCart"
import {
  CheckCircle2, Package, MapPin, CreditCard, FileText,
  Clock, ArrowRight, Download, ShoppingCart, BarChart3
} from "lucide-react"

function readLocal<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : fallback }
  catch { return fallback }
}

export default function BuyerOrderConfirmation() {
  const [order, setOrder] = useState<PlacedOrder | null>(null)
  const [show, setShow] = useState(false)
  const [apiOrder, setApiOrder] = useState<any>(null)

  useEffect(() => {
    const id = localStorage.getItem("og_last_order_id")
    if (id) {
      const orders = readLocal<PlacedOrder[]>("og_orders", [])
      const found = orders.find(o => o.id === id)
      if (found) setOrder(found)
    }
    setTimeout(() => setShow(true), 100)

    // Fallback: load latest order from API if local cache empty
    ;(async () => {
      try {
        const { api, unwrapPage } = await import("@/lib/api")
        const res = await api.get("/api/buyer/orders", { per_page: 1 })
        const rows = unwrapPage(res).data
        if (rows?.[0]) setApiOrder(rows[0])
      } catch { /* ignore */ }
    })()
  }, [])

  const displayId = order?.id || apiOrder?.order_number || (apiOrder ? `ORD-${apiOrder.id}` : null)

  const nextSteps = [
    { icon: FileText,   title: "Proforma Invoice",        desc: "Issued within 24 hours to your registered email" },
    { icon: CreditCard, title: "Payment Processing",       desc: order ? `Your ${order.paymentMethod} details will be verified by our finance team` : "Payment details will be verified" },
    { icon: Package,    title: "Production & Procurement", desc: "Commodity sourcing and quality inspection begins upon payment confirmation" },
    { icon: MapPin,     title: "Shipment & Tracking",      desc: "Live container tracking shared when goods are loaded at Port Qasim" },
  ]

  return (
    <BuyerPortalLayout title="Order Confirmed" subtitle="Your trade order has been placed successfully">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Success banner */}
        <div
          className={`rounded-2xl p-8 text-center transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ background: "linear-gradient(135deg, #0F3D2E, #1a5c44)", color: "#F7F7F2" }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#4CAF5030", border: "2px solid #4CAF5060" }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: "#4CAF50" }} />
          </div>
          <h1 className="font-heading font-bold text-2xl mb-2">Order Placed Successfully!</h1>
          <p className="text-sm opacity-80 mb-4">
            Your trade order has been received. Our export team will contact you within 24 hours.
          </p>
          {displayId && (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: "#C6A969", color: "#1F2933" }}>
              <FileText className="w-4 h-4" />
              Order ID: {displayId}
            </div>
          )}
          {!displayId && (
            <p className="text-xs opacity-70">Open Orders to view your latest confirmed trades.</p>
          )}
        </div>

        {/* Order details */}
        {order && (
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading font-bold text-base">Order Details</h2>

              {/* Items */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Unit Price</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={item.productId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{item.icon}</span>
                            <div>
                              <p className="font-medium text-xs">{item.productName}</p>
                              <p className="text-[10px] text-muted-foreground">{item.origin}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold">{item.qty} {item.unit ?? "MT"}</td>
                        <td className="px-4 py-3 text-right text-xs">${item.unitPrice.toLocaleString()}/MT</td>
                        <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: "#C6A969" }}>
                          ${Math.round(item.qty * unitToMT(item.unit) * item.unitPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Metadata grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-4 space-y-2" style={{ background: "#0F3D2E08", border: "1px solid #0F3D2E20" }}>
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#C6A969" }} /> Shipping
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="font-medium">{order.destination}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Port</span><span className="font-medium">{order.destinationPort}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Incoterm</span><span className="font-medium">{order.incoterm}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Est. Delivery</span><span className="font-medium">{order.estimatedDelivery}</span></div>
                  </div>
                </div>
                <div className="rounded-xl p-4 space-y-2" style={{ background: "#0F3D2E08", border: "1px solid #0F3D2E20" }}>
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" style={{ color: "#C6A969" }} /> Payment
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{order.paymentMethod}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{order.bankName || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-medium">{order.paymentRef || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                      <span className="font-bold" style={{ color: order.status === "Order Confirmed" || order.status === "Pending" ? "#3b82f6" : "#4CAF50" }}>{order.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#C6A96912", border: "1px solid #C6A96940" }}>
                <span className="font-bold">Total Order Value</span>
                <span className="font-bold text-xl" style={{ color: "#C6A969" }}>
                  ${order.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                </span>
              </div>

              {/* Order date */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Order placed on {order.placedAt} · Status: <strong className="text-foreground">{order.status}</strong></span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next steps */}
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-heading font-bold text-base">What Happens Next</h2>
            <div className="space-y-4">
              {nextSteps.map(({ icon: Icon, title, desc }, i) => (
                <div key={title} className="flex gap-4">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#0F3D2E", color: "#F7F7F2" }}>
                      {i + 1}
                    </div>
                    {i < nextSteps.length - 1 && <div className="w-px flex-1 bg-border" style={{ minHeight: 20 }} />}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#C6A969" }} />
                      <p className="text-sm font-semibold">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 gap-2 font-bold" style={{ background: "#0F3D2E", color: "#F7F7F2" }} asChild>
            <Link href="/buyer/orders">
              <FileText className="w-4 h-4" /> View My Orders <ArrowRight className="w-4 h-4 ml-auto" />
            </Link>
          </Button>
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <Link href="/buyer/catalogue">
              <ShoppingCart className="w-4 h-4" /> Continue Shopping
            </Link>
          </Button>
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <Link href="/buyer/shipments">
              <BarChart3 className="w-4 h-4" /> Track Shipments
            </Link>
          </Button>
        </div>

        {/* Download note */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-accent/40">
          <Download className="w-4 h-4 shrink-0" style={{ color: "#C6A969" }} />
          <p className="text-xs text-muted-foreground">
            A Proforma Invoice and order confirmation will be emailed to your registered address. You can also download them from <Link href="/buyer/documents" className="underline hover:text-foreground">Trade Documents</Link>.
          </p>
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
