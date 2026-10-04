import { useEffect, useState } from "react"
import { useCart, QTY_UNITS, unitToMT, type QtyUnit } from "@/hooks/useCart"
import { Link, useLocation } from "wouter"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart, Trash2, Plus, Minus,
  Package, ArrowRight, Info, AlertCircle
} from "lucide-react"

const INCL_FEES = 0.02

function CartQtyControl({
  productId,
  qty,
  onUpdate,
}: {
  productId: string
  qty: number
  onUpdate: (productId: string, qty: number) => void
}) {
  const [draft, setDraft] = useState(String(qty))

  useEffect(() => {
    setDraft(String(qty))
  }, [qty])

  function commit(raw: string) {
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed) || raw.trim() === "") {
      setDraft(String(qty))
      return
    }
    const next = Math.round(parsed * 100) / 100
    if (next === qty) {
      setDraft(String(qty))
      return
    }
    onUpdate(productId, next)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Qty:</span>
      <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => onUpdate(productId, qty - 1)}
          className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          min={1}
          step="any"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
          className="w-12 h-7 text-center text-sm font-semibold bg-transparent outline-none border-x border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Quantity"
        />
        <button
          type="button"
          onClick={() => onUpdate(productId, qty + 1)}
          className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"
          style={{ color: "#0F3D2E" }}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default function BuyerCart() {
  const [, navigate] = useLocation()
  const { items, removeFromCart, updateQty, updateUnit, clearCart, totalValue, itemCount } = useCart()

  const fees    = totalValue * INCL_FEES
  const grandTotal = totalValue + fees

  return (
    <BuyerPortalLayout title="My Cart" subtitle="Review your selected commodities before proceeding to checkout">
      {itemCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "#0F3D2E20" }}>
            <ShoppingCart className="w-9 h-9" style={{ color: "#0F3D2E" }} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold mb-1">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground">Browse the product catalogue to add commodities</p>
          </div>
          <Button asChild>
            <Link href="/buyer/catalogue">Browse Catalogue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{itemCount} item{itemCount !== 1 ? "s" : ""} in cart</p>
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>

            {items.map(item => (
              <Card key={item.productId} className="glass-card hover:border-accent/20 transition-all">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0" style={{ background: "#0F3D2E12" }}>
                      {item.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-heading font-bold text-sm leading-tight">{item.productName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.category} · {item.origin}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.productId)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <CartQtyControl
                          productId={item.productId}
                          qty={item.qty}
                          onUpdate={updateQty}
                        />

                        {/* Quantity unit type */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Unit:</span>
                          <select
                            value={item.unit ?? "MT"}
                            onChange={e => updateUnit(item.productId, e.target.value as QtyUnit)}
                            className="h-7 px-2 pr-6 rounded-lg border border-border bg-background text-xs font-semibold cursor-pointer outline-none focus:border-primary transition-colors"
                          >
                            {QTY_UNITS.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Unit price */}
                        <div className="text-xs">
                          <span className="text-muted-foreground">Unit Price: </span>
                          <span className="font-semibold">${item.unitPrice.toLocaleString()}/MT</span>
                        </div>

                        {/* Subtotal */}
                        <div className="text-xs">
                          <span className="text-muted-foreground">Subtotal: </span>
                          <span className="font-bold" style={{ color: "#C6A969" }}>
                            ${(item.qty * unitToMT(item.unit) * item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* MT equivalent hint */}
                      {(item.unit ?? "MT") !== "MT" && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          ≈ {(item.qty * unitToMT(item.unit)).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT equivalent
                        </p>
                      )}

                      {/* MOQ warning */}
                      {item.qty * unitToMT(item.unit) < item.moq && (
                        <div className="mt-2 flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-900/15 rounded-lg px-3 py-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs">Minimum order quantity is {item.moq} MT. Please increase quantity.</span>
                        </div>
                      )}

                      {/* Availability badge */}
                      <div className="mt-2">
                        <Badge className={`text-[10px] border-0 ${item.availability === "In Stock" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                          {item.availability}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Info note */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Note:</strong> Final pricing is subject to quotation confirmation. Prices shown are indicative midpoints. Payment terms, incoterm, and destination port will be set at checkout. A formal Proforma Invoice will be issued after order placement.
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-heading font-bold text-base">Order Summary</h3>

                <div className="space-y-2 text-sm">
                  {items.map(item => (
                    <div key={item.productId} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate flex-1">{item.productName} ({item.qty} {item.unit ?? "MT"})</span>
                      <span className="font-medium shrink-0">${(item.qty * unitToMT(item.unit) * item.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Commodity Total</span>
                    <span>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Documentation Fee (est.)</span>
                    <span>${fees.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Freight / Insurance</span>
                    <span>Quoted at checkout</span>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between font-bold text-base">
                    <span>Estimated Total</span>
                    <span style={{ color: "#C6A969" }}>
                      ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Excludes freight unless CIF selected</p>
                </div>

                {/* MOQ check */}
                {items.some(i => i.qty * unitToMT(i.unit) < i.moq) ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">Some items are below minimum order quantity. Please adjust quantities.</p>
                  </div>
                ) : (
                  <Button
                    className="w-full font-bold text-sm gap-2"
                    style={{ background: "#0F3D2E", color: "#F7F7F2" }}
                    onClick={() => navigate("/buyer/checkout")}
                  >
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                <Button variant="outline" className="w-full text-sm" asChild>
                  <Link href="/buyer/catalogue">
                    <Package className="w-4 h-4 mr-2" /> Continue Shopping
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Accepted payment methods */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs font-semibold mb-3">Accepted Payment Methods</p>
                <div className="space-y-2">
                  {[
                    { label: "Letter of Credit (LC at Sight)", badge: "Most Common" },
                    { label: "100% Advance TT",               badge: null },
                    { label: "SBLC",                          badge: null },
                    { label: "30% Advance + 70% BL",          badge: null },
                  ].map(({ label, badge }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4CAF50" }} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                      {badge && <Badge className="bg-accent/15 text-accent border-0 text-[10px]">{badge}</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </BuyerPortalLayout>
  )
}
