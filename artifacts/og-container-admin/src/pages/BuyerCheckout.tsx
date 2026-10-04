import { useState } from "react"
import { useLocation } from "wouter"
import { useCart, useOrders, unitToMT, requestQuotationFromCart } from "@/hooks/useCart"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { CompanyBankAccountsPanel } from "@/components/shared/CompanyBankAccountsPanel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { useCountries, usePorts, useIncoterms, usePaymentMethods } from "@/hooks/useLocations"
import { notify } from "@/lib/notify"
import { ApiError } from "@/lib/api"
import type { BankAccount } from "@/lib/bank-accounts"
import {
  ChevronRight, MapPin, CreditCard, ClipboardCheck,
  CheckCircle2, Package, Info, Loader2
} from "lucide-react"

interface Form {
  destination: string; port: string; incoterm: string
  deliveryDate: string; notes: string
  paymentMethod: string; paymentField1: string; paymentField2: string
  agreed: boolean
  selectedBankAccountId: string
}

const BLANK: Form = {
  destination: "", port: "", incoterm: "", deliveryDate: "", notes: "",
  paymentMethod: "", paymentField1: "", paymentField2: "", agreed: false,
  selectedBankAccountId: "",
}

function isAfterToday(isoDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const delivery = new Date(`${isoDate}T00:00:00`)
  return !Number.isNaN(delivery.getTime()) && delivery > today
}

function isFobIncoterm(code: string): boolean {
  return code.trim().toUpperCase() === "FOB"
}

export default function BuyerCheckout() {
  const [, navigate] = useLocation()
  const { items, totalValue, clearCart } = useCart()
  const { placeOrder } = useOrders()
  const { data: countries = [], isLoading: countriesLoading, isError: countriesError } = useCountries()
  const { data: incoterms = [], isLoading: incotermsLoading } = useIncoterms()
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = usePaymentMethods()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(BLANK)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [placing, setPlacing] = useState(false)
  const [requestingQuote, setRequestingQuote] = useState(false)
  const [nonFobDialogOpen, setNonFobDialogOpen] = useState(false)
  const [selectedBank, setSelectedBank] = useState<BankAccount | undefined>()
  const { data: portOptions = [], isLoading: portsLoading, isError: portsError } = usePorts(form.destination)

  const destinationCountries = countries.filter((c) => (c.ports_count ?? 0) > 0)
  const fobSelected = isFobIncoterm(form.incoterm)

  const fees = totalValue * 0.02
  const grandTotal = totalValue + fees

  function set<K extends keyof Form>(key: K, val: Form[K]) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  function validateStep1() {
    const e: typeof errors = {}
    if (!form.destination) e.destination = "Select destination country"
    if (!form.port) e.port = "Select destination port"
    if (!form.incoterm) e.incoterm = "Select incoterm"
    if (!form.deliveryDate) e.deliveryDate = "Select required delivery date"
    else if (!isAfterToday(form.deliveryDate)) e.deliveryDate = "Delivery date must be after today"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: typeof errors = {}
    if (!form.paymentMethod) e.paymentMethod = "Select a payment method"
    const selected = paymentMethods.find(p => p.code === form.paymentMethod)
    if (selected?.fields?.length && !form.paymentField1) e.paymentField1 = "This field is required"
    if (!form.selectedBankAccountId) e.selectedBankAccountId = "Select an OG Exports bank account"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (step === 1 && validateStep1()) {
      if (fobSelected) setStep(2)
      else void submitQuotationRequest()
      return
    }
    if (step === 2 && validateStep2()) setStep(3)
  }

  async function submitQuotationRequest() {
    const selectedCountry = countries.find(country => String(country.id) === form.destination)
    const selectedPort = portOptions.find(port => String(port.id) === form.port)
    if (!selectedCountry || !selectedPort) {
      setErrors({ destination: "Select a valid destination", port: "Select a valid destination port" })
      return
    }

    setRequestingQuote(true)
    try {
      const result = await requestQuotationFromCart({
        items,
        destinationCountryId: Number(selectedCountry.id),
        destinationPortId: Number(selectedPort.id),
        deliveryDate: form.deliveryDate,
        incoterm: form.incoterm,
        notes: form.notes,
      })
      clearCart()
      localStorage.setItem("og_last_rfq_ids", JSON.stringify(result.rfqs.map(r => ({
        id: r.id,
        reference: r.reference,
        product_name: r.product_name,
        qty: r.qty,
        incoterm: r.incoterm,
      }))))
      notify.success(result.message)
      navigate("/buyer/quotation-requested")
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to submit quotation request. Please try again."
      notify.error(message)
      setRequestingQuote(false)
    }
  }

  async function handlePlaceOrder() {
    if (!form.agreed) { setErrors({ agreed: "Please accept the terms" }); return }
    if (!validateStep1()) { setStep(1); return }
    if (!fobSelected) {
      notify.error("Only FOB orders can be placed from checkout. Request a quotation for other Incoterms.")
      setStep(1)
      return
    }

    const payMethod = paymentMethods.find(p => p.code === form.paymentMethod)
    const selectedCountry = countries.find(country => String(country.id) === form.destination)
    const selectedPort = portOptions.find(port => String(port.id) === form.port)
    if (!selectedCountry || !selectedPort) {
      setErrors({ destination: "Select a valid destination", port: "Select a valid destination port" })
      setStep(1)
      return
    }

    const bankNote = selectedBank
      ? `Pay to: ${selectedBank.bankName}${selectedBank.iban ? ` / IBAN ${selectedBank.iban}` : ""}`
      : ""
    const mergedNotes = [form.notes, bankNote].filter(Boolean).join("\n")

    setPlacing(true)
    try {
      const order = await placeOrder({
        items,
        destination: selectedCountry.label,
        destinationPort: selectedPort.name,
        destinationCountryId: Number(selectedCountry.id),
        destinationPortId: Number(selectedPort.id),
        deliveryDate: form.deliveryDate,
        incoterm: form.incoterm,
        paymentMethodCode: form.paymentMethod,
        paymentMethod: payMethod?.label ?? form.paymentMethod,
        paymentRef: form.paymentField2 || form.paymentField1 || selectedBank?.iban || "",
        bankName: selectedBank?.bankName || form.paymentField1,
        totalValue: grandTotal,
        estimatedDelivery: form.deliveryDate,
        notes: mergedNotes,
      })

      clearCart()
      localStorage.setItem("og_last_order_id", order.id)
      notify.success("Order placed successfully")
      navigate("/buyer/order-confirmation")
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to place order. Please try again."
      notify.error(message)
      setPlacing(false)
    }
  }

  const selectedPayment = paymentMethods.find(p => p.code === form.paymentMethod)
  const selectedCountry = destinationCountries.find(country => String(country.id) === form.destination)
    ?? countries.find(country => String(country.id) === form.destination)
  const selectedPort = portOptions.find(port => String(port.id) === form.port)

  if (items.length === 0 && !placing && !requestingQuote) {
    return (
      <BuyerPortalLayout title="Checkout" subtitle="Complete your purchase">
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <Package className="w-12 h-12 text-muted-foreground/40" />
          <p className="font-heading font-bold">Cart is empty</p>
          <Button asChild><a href="/buyer/catalogue">Browse Catalogue</a></Button>
        </div>
      </BuyerPortalLayout>
    )
  }

  return (
    <BuyerPortalLayout
      title="Checkout"
      subtitle={fobSelected || !form.incoterm
        ? "Complete your trade order in 3 steps"
        : "Request a custom quotation — admin will contact you soon"}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {(fobSelected || step > 1 || !form.incoterm) && (
          <div className="flex items-center gap-0">
            {[
              { n: 1, label: "Delivery Details", icon: MapPin },
              { n: 2, label: "Payment Method",   icon: CreditCard },
              { n: 3, label: "Review & Place",   icon: ClipboardCheck },
            ].map(({ n, label, icon: Icon }, idx) => (
              <div key={n} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                    style={
                      step > n ? { background: "#4CAF50", color: "#fff" } :
                      step === n ? { background: "#0F3D2E", color: "#F7F7F2" } :
                      { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {step > n ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-semibold hidden sm:block ${step === n ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                </div>
                {idx < 2 && (
                  <div className="h-[2px] flex-1 -mx-2 mt-[-20px]" style={{ background: step > n + 1 ? "#4CAF50" : step > n ? "#4CAF50" : "hsl(var(--border))" }} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">

            {step === 1 && (
              <Card className="glass-card">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" style={{ color: "#C6A969" }} /> Delivery Details
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Specify where and how you want the goods delivered</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Destination Country *</Label>
                      <SearchableSelect
                        required
                        showSearch
                        value={form.destination}
                        onChange={(v) => { set("destination", v); set("port", "") }}
                        placeholder={countriesLoading ? "Loading countries..." : "Select country"}
                        searchPlaceholder="Search country…"
                        emptyText="No country found."
                        emptyLimit={destinationCountries.length}
                        options={destinationCountries.map((country) => ({
                          value: String(country.id),
                          label: country.label,
                          keywords: country.searchTerms,
                        }))}
                      />
                      {countriesError && <p className="text-xs text-red-500 mt-1">Unable to load countries. Please refresh.</p>}
                      {errors.destination && <p className="text-xs text-red-500 mt-1">{errors.destination}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Destination Port *</Label>
                      <SearchableSelect
                        required
                        showSearch
                        disabled={!form.destination || portsLoading}
                        value={form.port}
                        onChange={(v) => set("port", v)}
                        placeholder={
                          !form.destination
                            ? "Select country first…"
                            : portsLoading
                              ? "Loading ports…"
                              : portOptions.length
                                ? "Select port…"
                                : "No maritime ports found"
                        }
                        searchPlaceholder="Search port…"
                        emptyText="No port found."
                        options={portOptions.map((port) => ({
                          value: String(port.id),
                          label: `${port.name} (${port.unlocode})`,
                          keywords: port.unlocode,
                        }))}
                      />
                      {portsError && <p className="text-xs text-red-500 mt-1">Unable to load ports. Please try another country.</p>}
                      {errors.port && <p className="text-xs text-red-500 mt-1">{errors.port}</p>}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">Incoterm *</Label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(incotermsLoading ? [] : incoterms).map(term => (
                        <button
                          key={term.code}
                          type="button"
                          onClick={() => {
                            set("incoterm", term.code)
                            if (!isFobIncoterm(term.code)) setNonFobDialogOpen(true)
                          }}
                          className="text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all"
                          style={
                            form.incoterm === term.code
                              ? { borderColor: "#C6A969", background: "#C6A96915", color: "#1F2933" }
                              : {}
                          }
                        >
                          <span className="font-bold">{term.code}</span>
                          {term.label && (
                            <span className="text-muted-foreground"> – {term.label}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {incotermsLoading && <p className="text-xs text-muted-foreground mt-1">Loading incoterms…</p>}
                    {errors.incoterm && <p className="text-xs text-red-500 mt-1">{errors.incoterm}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Required Delivery Date *</Label>
                    <DatePicker
                      required
                      value={form.deliveryDate}
                      onChange={(v) => set("deliveryDate", v)}
                      placeholder="Select delivery date"
                    />
                    {errors.deliveryDate && <p className="text-xs text-red-500 mt-1">{errors.deliveryDate}</p>}
                    <p className="text-[11px] text-muted-foreground">Must be a future date (after today).</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Special Instructions (optional)</Label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent transition-colors resize-none"
                      placeholder="Packaging preferences, labelling requirements, halal certification, fumigation, etc."
                      value={form.notes}
                      onChange={e => set("notes", e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full gap-2 font-bold"
                    style={{ background: "#0F3D2E", color: "#F7F7F2" }}
                    onClick={handleNext}
                    disabled={requestingQuote}
                  >
                    {requestingQuote ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Quotation Request…
                      </>
                    ) : fobSelected || !form.incoterm ? (
                      <>
                        Continue to Payment <ChevronRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Request Quotation <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="glass-card">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5" style={{ color: "#C6A969" }} /> Payment Method
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Select how you'll settle this trade transaction</p>
                  </div>

                  <CompanyBankAccountsPanel
                    selectedId={form.selectedBankAccountId}
                    onSelect={(id, account) => {
                      set("selectedBankAccountId", id)
                      setSelectedBank(account)
                    }}
                    queryKey={["buyer", "checkout-bank-accounts"]}
                    title="Send payment to an OG Exports account"
                    description={`Transfer the order total of $${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD to one of the active company accounts below.`}
                    footerHint="Include your order reference in the bank transfer description. Our finance team will verify payment after you place the order."
                  />
                  {errors.selectedBankAccountId && (
                    <p className="text-xs text-red-500">{errors.selectedBankAccountId}</p>
                  )}

                  <div className="space-y-3">
                    {paymentMethodsLoading && (
                      <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    )}
                    {!paymentMethodsLoading && paymentMethods.length === 0 && (
                      <p className="text-sm text-muted-foreground">No payment methods available. Please contact support.</p>
                    )}
                    {paymentMethods.map(method => (
                      <button
                        key={method.code}
                        type="button"
                        onClick={() => { set("paymentMethod", method.code); set("paymentField1", ""); set("paymentField2", "") }}
                        className="w-full text-left rounded-xl border p-4 transition-all"
                        style={
                          form.paymentMethod === method.code
                            ? { borderColor: "#C6A969", background: "#C6A96910" }
                            : { borderColor: "hsl(var(--border))" }
                        }
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                              style={form.paymentMethod === method.code ? { borderColor: "#C6A969" } : { borderColor: "hsl(var(--muted-foreground))" }}
                            >
                              {form.paymentMethod === method.code && <div className="w-2 h-2 rounded-full" style={{ background: "#C6A969" }} />}
                            </div>
                            <span className="text-sm font-bold">{method.label}</span>
                          </div>
                          {method.badge && <Badge className="bg-accent/15 text-accent border-0 text-[10px] shrink-0">{method.badge}</Badge>}
                        </div>
                        {method.description && <p className="text-xs text-muted-foreground ml-6">{method.description}</p>}
                      </button>
                    ))}
                  </div>
                  {errors.paymentMethod && <p className="text-xs text-red-500">{errors.paymentMethod}</p>}

                  {selectedPayment && selectedPayment.fields.length > 0 && (
                    <div className="space-y-3 p-4 rounded-xl border border-dashed" style={{ borderColor: "#C6A96960" }}>
                      <p className="text-xs font-semibold" style={{ color: "#C6A969" }}>Payment Details — {selectedPayment.label}</p>
                      {selectedPayment.fields.map((field, idx) => (
                        <div key={field}>
                          <label className="text-xs font-semibold mb-1.5 block">{field} {idx === 0 ? "*" : "(optional)"}</label>
                          <Input
                            placeholder={field}
                            value={idx === 0 ? form.paymentField1 : form.paymentField2}
                            onChange={e => idx === 0 ? set("paymentField1", e.target.value) : set("paymentField2", e.target.value)}
                            className="h-10"
                          />
                          {idx === 0 && errors.paymentField1 && <p className="text-xs text-red-500 mt-1">{errors.paymentField1}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                    <Button className="flex-1 gap-2 font-bold" style={{ background: "#0F3D2E", color: "#F7F7F2" }} onClick={handleNext}>
                      Review Order <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="glass-card">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5" style={{ color: "#C6A969" }} /> Review & Confirm Order
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Verify all details before placing your trade order</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold mb-2">Order Items</p>
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
                          {items.map((item, i) => (
                            <tr key={item.productId} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{item.icon}</span>
                                  <div>
                                    <p className="font-medium text-xs">{item.productName}</p>
                                    <p className="text-[10px] text-muted-foreground">{item.category}</p>
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
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border p-4 space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" style={{ color: "#C6A969" }} /> Delivery Details
                      </p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between"><span>Country</span><span className="font-medium text-foreground">{selectedCountry?.label}</span></div>
                        <div className="flex justify-between"><span>Port</span><span className="font-medium text-foreground">{selectedPort?.name}</span></div>
                        <div className="flex justify-between"><span>Incoterm</span><span className="font-medium text-foreground">{form.incoterm}</span></div>
                        <div className="flex justify-between"><span>Required by</span><span className="font-medium text-foreground">{form.deliveryDate}</span></div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border p-4 space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" style={{ color: "#C6A969" }} /> Payment Details
                      </p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between"><span>Method</span><span className="font-medium text-foreground">{selectedPayment?.label}</span></div>
                        <div className="flex justify-between"><span>OG Account</span><span className="font-medium text-foreground truncate max-w-[55%] text-right">{selectedBank?.bankName || "—"}</span></div>
                        <div className="flex justify-between"><span>IBAN</span><span className="font-medium text-foreground truncate max-w-[55%] text-right">{selectedBank?.iban || "—"}</span></div>
                        <div className="flex justify-between"><span>Reference</span><span className="font-medium text-foreground">{form.paymentField2 || form.paymentField1 || "—"}</span></div>
                      </div>
                    </div>
                  </div>

                  {form.notes && (
                    <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{form.notes}</p>
                    </div>
                  )}

                  <div className="rounded-xl p-4 space-y-2" style={{ background: "#0F3D2E0F", border: "1px solid #0F3D2E30" }}>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Commodity Total</span><span>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Documentation Fee (2%)</span><span>${fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                      <span>Grand Total (USD)</span>
                      <span style={{ color: "#C6A969" }}>${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agreed}
                      onChange={e => set("agreed", e.target.checked)}
                      className="mt-0.5 accent-emerald-600"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      I confirm that the above order details are correct and I agree to OG Exports'
                      {" "}<a href="/terms" className="underline hover:text-foreground">Terms & Conditions</a>,{" "}
                      payment terms, and export compliance requirements. A Proforma Invoice will be issued within 24 hours.
                    </span>
                  </label>
                  {errors.agreed && <p className="text-xs text-red-500">{errors.agreed}</p>}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={placing}>Back</Button>
                    <Button
                      className="flex-2 gap-2 font-bold px-8"
                      style={{ background: placing ? "#4CAF50" : "#0F3D2E", color: "#F7F7F2" }}
                      onClick={() => void handlePlaceOrder()}
                      disabled={placing}
                    >
                      {placing ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 animate-pulse" /> Placing Order…
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="w-4 h-4" /> Place Order
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="glass-card">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold">Order Summary</p>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.productId} className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.productName}</p>
                        <p className="text-[10px] text-muted-foreground">{item.qty} {item.unit ?? "MT"}</p>
                      </div>
                      <span className="text-xs font-semibold shrink-0">${Math.round(item.qty * unitToMT(item.unit) * item.unitPrice).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Doc. Fee</span><span>${fees.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t border-border">
                    <span>Total</span>
                    <span style={{ color: "#C6A969" }}>${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold">Secure Trade Process</p>
                {[
                  "Proforma Invoice within 24 hrs",
                  "Full KYC compliance verified",
                  "PSMA & TDAP export certified",
                  "Bank-grade payment processing",
                  "All shipments insured",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#4CAF50" }} />
                    <span className="text-xs text-muted-foreground">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={nonFobDialogOpen} onOpenChange={setNonFobDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Custom Quotation</DialogTitle>
            <DialogDescription>
              Non-FOB Incoterms receive a custom quotation from our team — no payment step required.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="font-bold"
              style={{ background: "#0F3D2E", color: "#F7F7F2" }}
              onClick={() => setNonFobDialogOpen(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BuyerPortalLayout>
  )
}
