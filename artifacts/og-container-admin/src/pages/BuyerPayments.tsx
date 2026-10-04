import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  CreditCard, Loader2, CheckCircle2, Clock, AlertCircle,
} from "lucide-react"
import { api, unwrapPage } from "@/lib/api"
import { notify } from "@/lib/notify"
import { usePaymentMethods } from "@/hooks/useLocations"
import {
  paymentStatusBadgeClass,
  paymentStatusIconKind,
  paymentStatusLabel,
  shouldHideFromAwaitingPayment,
} from "@/lib/deposit-statuses"

export default function BuyerPayments() {
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [selectedMethod, setSelectedMethod] = useState("")
  const [paymentField1, setPaymentField1] = useState("")
  const [paymentField2, setPaymentField2] = useState("")
  const [fieldError, setFieldError] = useState("")

  const { data: paymentMethods = [], isLoading: methodsLoading } = usePaymentMethods()

  const { data: banksPayload, isLoading: banksLoading } = useQuery({
    queryKey: ["buyer", "bank-accounts"],
    queryFn: () => api.get<{ data: any[] }>("/api/buyer/payments/bank-accounts"),
  })

  const { data: historyPayload, isLoading: histLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["buyer", "payment-history"],
    queryFn: () => api.get("/api/buyer/payments/history", { per_page: 50 }),
  })

  const { data: ordersPayload, refetch: refetchOrders } = useQuery({
    queryKey: ["buyer", "orders", "unpaid"],
    queryFn: () => api.get("/api/buyer/orders", { per_page: 50 }),
  })

  const banks = Array.isArray(banksPayload?.data) ? banksPayload.data : []
  const history = useMemo(() => unwrapPage<any>(historyPayload).data, [historyPayload])
  const unpaid = useMemo(() => {
    return unwrapPage<any>(ordersPayload).data.filter((o: any) =>
      !shouldHideFromAwaitingPayment(o.payment_status || o.review_status)
    )
  }, [ordersPayload])

  useEffect(() => {
    if (!selectedMethod && paymentMethods.length > 0) {
      setSelectedMethod(paymentMethods[0].code)
    }
  }, [paymentMethods, selectedMethod])

  const selectedPayment = paymentMethods.find(m => m.code === selectedMethod)

  async function markPaid(orderId: number) {
    if (!selectedMethod) {
      notify.error("Select a payment method")
      return
    }
    if (selectedPayment?.fields?.length && !paymentField1.trim()) {
      setFieldError("This field is required")
      return
    }
    setFieldError("")
    setMarkingId(orderId)
    try {
      await api.post(`/api/buyer/payments/orders/${orderId}/mark-paid`, {
        payment_method: selectedMethod,
        payment_field1: paymentField1.trim() || undefined,
        payment_field2: paymentField2.trim() || undefined,
        reference: paymentField2.trim() || undefined,
      })
      notify.success("Payment submitted for verification")
      setPaymentField1("")
      setPaymentField2("")
      await Promise.all([refetchHistory(), refetchOrders()])
    } catch (e: any) {
      notify.error(e?.message || "Could not submit payment")
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <BuyerPortalLayout title="Trade Finance" subtitle="Bank accounts, payment methods and payment history">
      <div className="space-y-8">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">OG Exports Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {banksLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            {!banksLoading && banks.length === 0 && (
              <p className="text-sm text-muted-foreground">No bank accounts published yet.</p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {banks.map((b: any) => {
                const accountTitle = b.account_title || b.account_name || b.account_holder || ""
                const iban = String(b.iban || "").trim()
                const accountNo = String(b.account_number || "").trim()
                const swift = String(b.swift || "").trim()
                return (
                  <div key={b.id} className="p-4 rounded-xl border border-border bg-muted/20 text-sm space-y-1.5">
                    <p className="font-bold">
                      <span className="text-muted-foreground font-semibold">Bank Name:</span>{" "}
                      {b.bank_name || "Bank"}
                    </p>
                    {accountTitle && (
                      <p className="text-xs">
                        <span className="text-muted-foreground font-semibold">Account Title:</span>{" "}
                        {accountTitle}
                      </p>
                    )}
                    {iban ? (
                      <p className="font-mono text-xs">
                        <span className="font-sans text-muted-foreground font-semibold">IBAN:</span>{" "}
                        {iban}
                      </p>
                    ) : accountNo ? (
                      <p className="font-mono text-xs">
                        <span className="font-sans text-muted-foreground font-semibold">Account No:</span>{" "}
                        {accountNo}
                      </p>
                    ) : null}
                    {swift && (
                      <p className="text-xs">
                        <span className="text-muted-foreground font-semibold">SWIFT Code:</span>{" "}
                        {swift}
                      </p>
                    )}
                    {b.is_default && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Default</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <CreditCard className="w-5 h-5" style={{ color: "#C6A969" }} /> Payment Method
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Select how you'll settle this trade transaction</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {methodsLoading && (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            )}
            {!methodsLoading && paymentMethods.length === 0 && (
              <p className="text-sm text-muted-foreground">No payment methods available.</p>
            )}
            <div className="space-y-3">
              {paymentMethods.map(method => (
                <button
                  key={method.code}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method.code)
                    setPaymentField1("")
                    setPaymentField2("")
                    setFieldError("")
                  }}
                  className="w-full text-left rounded-xl border p-4 transition-all"
                  style={
                    selectedMethod === method.code
                      ? { borderColor: "#C6A969", background: "#C6A96910" }
                      : { borderColor: "hsl(var(--border))" }
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={selectedMethod === method.code ? { borderColor: "#C6A969" } : { borderColor: "hsl(var(--muted-foreground))" }}
                      >
                        {selectedMethod === method.code && <div className="w-2 h-2 rounded-full" style={{ background: "#C6A969" }} />}
                      </div>
                      <span className="text-sm font-bold">{method.label}</span>
                    </div>
                    {method.badge && <Badge className="bg-accent/15 text-accent border-0 text-[10px] shrink-0">{method.badge}</Badge>}
                  </div>
                  {method.description && <p className="text-xs text-muted-foreground ml-6">{method.description}</p>}
                </button>
              ))}
            </div>

            {selectedPayment && selectedPayment.fields.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl border border-dashed" style={{ borderColor: "#C6A96960" }}>
                <p className="text-xs font-semibold" style={{ color: "#C6A969" }}>Payment Details — {selectedPayment.label}</p>
                {selectedPayment.fields.map((field, idx) => (
                  <div key={field}>
                    <label className="text-xs font-semibold mb-1.5 block">{field} {idx === 0 ? "*" : "(optional)"}</label>
                    <Input
                      placeholder={field}
                      value={idx === 0 ? paymentField1 : paymentField2}
                      onChange={e => {
                        if (idx === 0) {
                          setPaymentField1(e.target.value)
                          setFieldError("")
                        } else {
                          setPaymentField2(e.target.value)
                        }
                      }}
                      className="h-10"
                    />
                    {idx === 0 && fieldError && <p className="text-xs text-red-500 mt-1">{fieldError}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-heading font-bold mb-3">Orders awaiting payment</h2>
          {unpaid.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">No unpaid orders.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {unpaid.map((o: any) => (
                <Card key={o.id} className="glass-card">
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{o.order_number || `ORD-${o.id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        ${Number(o.total_value || 0).toLocaleString()} · {paymentStatusLabel(o.payment_status || o.review_status || "unpaid")}
                      </p>
                    </div>
                    <Button size="sm" disabled={markingId === o.id || !selectedMethod} onClick={() => markPaid(o.id)}>
                      {markingId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark as Paid"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-heading font-bold mb-3">Payment History</h2>
          {histLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          {!histLoading && history.length === 0 && (
            <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">No payment history yet.</CardContent></Card>
          )}
          <div className="space-y-2">
            {history.map((o: any) => {
              const status = o.review_status || o.payment_status
              const iconKind = paymentStatusIconKind(status)
              return (
                <Card key={o.id} className="glass-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    {iconKind === "pending" ? (
                      <Clock className="w-4 h-4 text-amber-500" />
                    ) : iconKind === "approved" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{o.order_number || `ORD-${o.id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.payment_method || "—"} · ${Number(o.total_value || 0).toLocaleString()}
                      </p>
                      {(o.payment_field1_label || o.payment_field1_value) && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {o.payment_field1_label || "Detail"}: {o.payment_field1_value || "—"}
                          {o.payment_field2_value
                            ? ` · ${o.payment_field2_label || "Ref"}: ${o.payment_field2_value}`
                            : o.payment_reference
                              ? ` · Ref: ${o.payment_reference}`
                              : ""}
                        </p>
                      )}
                    </div>
                    <Badge className={`border-0 text-[10px] ${paymentStatusBadgeClass(status)}`}>
                      {o.review_status_label || paymentStatusLabel(status)}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
