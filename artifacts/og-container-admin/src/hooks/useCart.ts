import { useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { orderStatusLabel } from "@/lib/order-statuses"

const CART_STORAGE_KEY = "og_cart"
const CART_UPDATED_EVENT = "og-cart-updated"

export type QtyUnit = "MT" | "KG" | "25kg Bag" | "50kg Bag" | "20ft Container"

/** Conversion factor of each unit into metric tons (pricing is always $/MT) */
export const QTY_UNITS: { value: QtyUnit; label: string; toMT: number }[] = [
  { value: "MT",             label: "Metric Tons (MT)",   toMT: 1 },
  { value: "KG",             label: "Kilograms (KG)",     toMT: 0.001 },
  { value: "25kg Bag",       label: "25 KG Bags",         toMT: 0.025 },
  { value: "50kg Bag",       label: "50 KG Bags",         toMT: 0.05 },
  { value: "20ft Container", label: "20ft Container",     toMT: 24 },
]

export function unitToMT(unit: QtyUnit | undefined): number {
  return QTY_UNITS.find(u => u.value === (unit ?? "MT"))?.toMT ?? 1
}

export interface CartItem {
  productId: string
  productName: string
  icon: string
  category: string
  qty: number
  /** Quantity unit; defaults to MT for legacy items */
  unit?: QtyUnit
  unitPrice: number
  packaging: string
  moq: number
  availability: string
  origin: string
}

export interface PlacedOrder {
  id: string
  placedAt: string
  items: CartItem[]
  destination: string
  destinationPort: string
  incoterm: string
  paymentMethod: string
  paymentRef: string
  bankName: string
  totalValue: number
  status: string
  estimatedDelivery: string
  notes: string
}

export interface PlaceOrderInput extends Omit<PlacedOrder, "id" | "placedAt" | "status"> {
  destinationCountryId: number
  destinationPortId: number
  deliveryDate: string
  /** Active payment method code from /api/payment-methods */
  paymentMethodCode: string
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLocalCart(items: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

function clearLocalCartStorage(): void {
  writeLocalCart([])
}

export function useCart() {
  const [items, setItemsState] = useState<CartItem[]>(() => readLocal<CartItem[]>(CART_STORAGE_KEY, []))

  useEffect(() => {
    function syncFromStorage() {
      setItemsState(readLocal<CartItem[]>(CART_STORAGE_KEY, []))
    }

    window.addEventListener(CART_UPDATED_EVENT, syncFromStorage)
    window.addEventListener("storage", syncFromStorage)
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncFromStorage)
      window.removeEventListener("storage", syncFromStorage)
    }
  }, [])

  function updateItems(updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) {
    setItemsState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater
      writeLocalCart(next)
      return next
    })
  }

  function addToCart(item: CartItem) {
    updateItems(prev => {
      const existing = prev.find(i => i.productId === item.productId)
      if (existing) {
        // Normalize incoming qty into the existing item's unit so mixed-unit adds stay correct
        const addedInExistingUnit = item.qty * unitToMT(item.unit) / unitToMT(existing.unit)
        return prev.map(i => i.productId === item.productId ? { ...i, qty: Math.round((i.qty + addedInExistingUnit) * 100) / 100 } : i)
      }
      return [...prev, item]
    })
  }

  function removeFromCart(productId: string) {
    updateItems(prev => prev.filter(i => i.productId !== productId))
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return }
    updateItems(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i))
  }

  function updatePackaging(productId: string, packaging: string) {
    updateItems(prev => prev.map(i => i.productId === productId ? { ...i, packaging } : i))
  }

  function updateUnit(productId: string, unit: QtyUnit) {
    updateItems(prev => prev.map(i => i.productId === productId ? { ...i, unit } : i))
  }

  function clearCart() {
    updateItems([])
  }

  const totalValue = items.reduce((s, i) => s + i.qty * unitToMT(i.unit) * i.unitPrice, 0)
  const itemCount  = items.length

  return { items, addToCart, removeFromCart, updateQty, updatePackaging, updateUnit, clearCart, totalValue, itemCount }
}

async function syncServerCart(items: CartItem[]): Promise<void> {
  const cartRes = await api.get<{ data?: { items?: Array<{ id: number }> } }>("/api/buyer/cart")
  const existing = cartRes?.data?.items ?? []
  for (const item of existing) {
    if (item?.id != null) {
      await api.delete(`/api/buyer/cart/${item.id}`)
    }
  }

  for (const item of items) {
    const productId = Number(item.productId)
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error(`Invalid product id for ${item.productName}`)
    }
    await api.post("/api/buyer/cart", {
      product_id: productId,
      qty: Math.max(1, Math.round(item.qty)),
      replace: true,
    })
  }
}

export interface RequestQuotationInput {
  items: CartItem[]
  destinationCountryId: number
  destinationPortId: number
  incoterm: string
  deliveryDate: string
  notes?: string
}

export interface QuotationRequestRfq {
  id: number
  reference: string
  product_name?: string
  qty?: string
  incoterm?: string
  status?: string
}

export async function requestQuotationFromCart(
  data: RequestQuotationInput,
): Promise<{ message: string; rfqs: QuotationRequestRfq[] }> {
  await syncServerCart(data.items)

  const res = await api.post<{
    message?: string
    data?: { rfqs?: QuotationRequestRfq[] }
  }>("/api/buyer/cart/request-quotation", {
    notes: data.notes || undefined,
    destination_country_id: data.destinationCountryId,
    destination_port_id: data.destinationPortId,
    incoterm: data.incoterm,
    required_delivery_date: data.deliveryDate,
  })

  const rfqs = Array.isArray(res?.data?.rfqs) ? res.data.rfqs : []
  if (rfqs.length === 0) {
    throw new ApiError("Quotation request was not saved by the server.", 500)
  }

  clearLocalCartStorage()

  return {
    message: res?.message || "Quotation request submitted. Our team will contact you soon.",
    rfqs,
  }
}

export function useOrders() {
  const [orders, setOrdersState] = useState<PlacedOrder[]>(() => readLocal<PlacedOrder[]>("og_orders", []))

  async function placeOrder(data: PlaceOrderInput): Promise<PlacedOrder> {
    await syncServerCart(data.items)

    const checkoutRes = await api.post<{
      message?: string
      data?: {
        id?: number
        order_number?: string
        placed_at?: string
        status?: string
        total_value?: number | string
      }
    }>("/api/buyer/cart/checkout", {
      payment_method: data.paymentMethodCode,
      notes: data.notes || undefined,
      destination_country_id: data.destinationCountryId,
      destination_port_id: data.destinationPortId,
      incoterm: data.incoterm,
      required_delivery_date: data.deliveryDate,
    })

    const apiOrder = checkoutRes?.data
    if (!apiOrder?.order_number && !apiOrder?.id) {
      throw new ApiError("Order was not saved by the server.", 500)
    }

    // Clear local cart as soon as the server order succeeds (before any UI work).
    clearLocalCartStorage()

    const orderId = String(apiOrder.order_number || `ORD-${apiOrder.id}`)
    const placedAt = apiOrder.placed_at
      ? new Date(apiOrder.placed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

    const newOrder: PlacedOrder = {
      items: data.items,
      destination: data.destination,
      destinationPort: data.destinationPort,
      incoterm: data.incoterm,
      paymentMethod: data.paymentMethod,
      paymentRef: data.paymentRef,
      bankName: data.bankName,
      totalValue: data.totalValue,
      estimatedDelivery: data.estimatedDelivery,
      notes: data.notes,
      id: orderId,
      placedAt,
      status: orderStatusLabel(apiOrder.status || "order_confirmed"),
    }

    const existing = readLocal<PlacedOrder[]>("og_orders", [])
    const updated = [newOrder, ...existing.filter(o => o.id !== orderId)]
    localStorage.setItem("og_orders", JSON.stringify(updated))
    setOrdersState(updated)

    return newOrder
  }

  return { orders, placeOrder }
}
