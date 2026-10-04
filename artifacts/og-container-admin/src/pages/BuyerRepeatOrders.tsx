import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { RefreshCw, Star, Package, MapPin, DollarSign, Loader2 } from "lucide-react"
import { api, unwrapPage } from "@/lib/api"
import { notify } from "@/lib/notify"

function productIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes("rice") || lower.includes("basmati")) return "🌾"
  if (lower.includes("sesame")) return "🌱"
  if (lower.includes("chilli") || lower.includes("chili")) return "🌶️"
  return "📦"
}

function isCancelledStatus(status: unknown): boolean {
  const s = String(status || "").toLowerCase().replace(/[\s-]+/g, "_")
  return s === "cancelled" || s === "canceled"
}

function stripQty(qty: unknown): string {
  if (qty == null || qty === "") return "1"
  return String(qty).replace(/\s*MT\s*$/i, "").trim() || "1"
}

type OrderItemRow = {
  id: number
  product_id?: number | null
  product_name?: string | null
  qty?: string | number | null
}

type OrderRow = {
  id: number
  order_number?: string | null
  status?: string | null
  total_value?: number | string | null
  placed_at?: string | null
  created_at?: string | null
  destination?: string | null
  items?: OrderItemRow[]
  quotation?: { destination?: string | null } | null
}

export default function BuyerRepeatOrders() {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [repeatOrder, setRepeatOrder] = useState<OrderRow | null>(null)
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("og-buyer-fav-orders")
      return new Set(raw ? JSON.parse(raw) : [])
    } catch {
      return new Set()
    }
  })

  const { data, isLoading } = useQuery({
    queryKey: ["buyer", "orders", "repeat"],
    queryFn: () => api.get("/api/buyer/orders", { per_page: 50 }),
  })

  const orders = useMemo(() => {
    const all = unwrapPage<OrderRow>(data).data
    return all.filter(o => !isCancelledStatus(o.status))
  }, [data])

  function toggleSave(id: number) {
    setSaved(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      localStorage.setItem("og-buyer-fav-orders", JSON.stringify([...n]))
      return n
    })
  }

  function openRepeatModal(order: OrderRow) {
    const items = order.items || []
    if (!items.length) {
      notify.error("This order has no line items to repeat.")
      return
    }
    const draft: Record<number, string> = {}
    items.forEach(item => {
      draft[item.id] = stripQty(item.qty)
    })
    setQtyDraft(draft)
    setRepeatOrder(order)
  }

  function closeRepeatModal() {
    if (saving) return
    setRepeatOrder(null)
    setQtyDraft({})
  }

  async function handleSaveRepeat() {
    if (!repeatOrder) return
    const items = (repeatOrder.items || []).map(item => ({
      id: item.id,
      qty: qtyDraft[item.id] ?? stripQty(item.qty),
    }))

    for (const row of items) {
      const n = Number(row.qty)
      if (!Number.isFinite(n) || n <= 0) {
        notify.error("Please enter a valid quantity greater than zero for each item.")
        return
      }
    }

    setSaving(true)
    try {
      const res = await api.post<{ data: { id: number } | { id: number }[] }>(
        `/api/buyer/orders/${repeatOrder.id}/repeat`,
        { items },
      )
      const payload = res?.data
      const firstId = Array.isArray(payload) ? payload[0]?.id : payload?.id
      notify.success(
        firstId
          ? `RFQ #${firstId} created — view under Request for Quotation`
          : "RFQ created — view under Request for Quotation",
      )
      await queryClient.invalidateQueries({ queryKey: ["buyer", "rfqs"] })
      setRepeatOrder(null)
      setQtyDraft({})
    } catch (e: any) {
      notify.error(e?.message || "Could not create repeat RFQ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BuyerPortalLayout title="Repeat Orders" subtitle="Quickly reorder previous shipments from your order history">
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Past Orders", value: String(orders.length), icon: RefreshCw, cls: "text-primary bg-primary/10" },
            { label: "Saved Favourites", value: String(saved.size), icon: Star, cls: "text-accent bg-accent/15" },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls.split(" ")[1]}`}>
                  <s.icon className={`w-4 h-4 ${s.cls.split(" ")[0]}`} />
                </div>
                <div>
                  <p className="text-xl font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading orders…
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No past orders yet. Accepted quotations will appear here for one-click repeat RFQs.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {orders.map((o) => {
            const items = o.items || []
            const primary = items[0]
            const product = primary?.product_name || "Order"
            const qtyLabel = items.length > 1
              ? `${items.length} items`
              : (primary?.qty != null ? `${stripQty(primary.qty)} MT` : "—")
            const destination = o.destination || o.quotation?.destination
            return (
              <Card key={o.id} className="glass-card">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-3 min-w-0">
                      <div className="text-2xl">{productIcon(product)}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold">{product}</p>
                          <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">
                            {o.order_number || `ORD-${o.id}`}
                          </Badge>
                          {saved.has(o.id) && (
                            <Badge className="bg-accent/15 text-accent border-0 text-[10px]">Favourite</Badge>
                          )}
                        </div>
                        {items.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {items.map(i => i.product_name || "Item").join(" · ")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{qtyLabel}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />
                            ${Number(o.total_value || 0).toLocaleString()}
                          </span>
                          {destination && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{destination}</span>
                          )}
                          <span>{o.placed_at ? new Date(o.placed_at).toLocaleDateString() : (o.created_at ? new Date(o.created_at).toLocaleDateString() : "")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => toggleSave(o.id)}>
                        <Star className={`w-3.5 h-3.5 ${saved.has(o.id) ? "fill-accent text-accent" : ""}`} />
                      </Button>
                      <Button size="sm" onClick={() => openRepeatModal(o)}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Repeat Order
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Dialog open={repeatOrder != null} onOpenChange={(open) => { if (!open) closeRepeatModal() }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Repeat Order
            </DialogTitle>
            <DialogDescription>
              Create a new RFQ from{" "}
              {repeatOrder?.order_number || (repeatOrder ? `ORD-${repeatOrder.id}` : "this order")}.
              Adjust quantities if needed, then save.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {(repeatOrder?.items || []).map(item => (
              <div key={item.id} className="space-y-1.5">
                <Label htmlFor={`repeat-qty-${item.id}`} className="text-sm font-medium">
                  {item.product_name || "Product"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`repeat-qty-${item.id}`}
                    type="number"
                    min={0.001}
                    step="any"
                    value={qtyDraft[item.id] ?? ""}
                    onChange={(e) => setQtyDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                    disabled={saving}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground shrink-0 w-8">MT</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeRepeatModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveRepeat} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BuyerPortalLayout>
  )
}
