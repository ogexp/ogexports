import { useState } from "react"
import { useListInvoices, useListPayments, useCreateInvoice, usePayInvoice, useGetMe } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { InvoiceStatusBadge } from "../status-badges"
import { KycGateButton } from "../KycGateButton"
import { useCurrency } from "@/lib/use-currency"

export function InvoicesTab() {
  const { data: invoices, isLoading: invLoading, refetch: refetchInv } = useListInvoices()
  const { data: payments, isLoading: payLoading } = useListPayments()
  const { data: me } = useGetMe()
  const c = useCurrency()
  const isSupplier = me?.accountType === "supplier"
  const createInvoice = useCreateInvoice()
  const payInvoice = usePayInvoice()
  const { toast } = useToast()
  
  const [createOpen, setCreateOpen] = useState(false)
  const [payOpen, setPayOpen] = useState<number | null>(null)
  
  const [orderId, setOrderId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  
  const [payMethod, setPayMethod] = useState("")
  const [payRef, setPayRef] = useState("")

  const formatCurrency = (amt: number, curr: string) => {
    return c.fmtTrade(Number(amt) || 0, { sourceCurrency: curr || "USD" })
  }

  const handleCreate = () => {
    createInvoice.mutate({ data: { orderId: Number(orderId), invoiceNumber, amount: Number(amount), currency } }, {
      onSuccess: () => {
        toast({ title: "Invoice created" })
        setCreateOpen(false)
        setOrderId("")
        setInvoiceNumber("")
        setAmount("")
        refetchInv()
      },
      onError: (error) => toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" })
    })
  }

  const handlePay = () => {
    if (!payOpen) return
    payInvoice.mutate({ id: payOpen, data: { method: payMethod, reference: payRef } }, {
      onSuccess: () => {
        toast({ title: "Payment recorded successfully" })
        setPayOpen(null)
        setPayMethod("")
        setPayRef("")
        refetchInv()
      },
      onError: (error) => toast({ title: "Payment failed", description: error.message, variant: "destructive" })
    })
  }

  if (invLoading || payLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /></div>

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold">Invoices</h2>
          {isSupplier && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <KycGateButton actionName="issue invoices" asChild>
                <DialogTrigger asChild>
                  <Button>Issue Invoice</Button>
                </DialogTrigger>
              </KycGateButton>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue New Invoice</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Order ID</label>
                      <Input value={orderId} onChange={e => setOrderId(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Invoice Number</label>
                      <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount</label>
                      <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Currency</label>
                      <Input value={currency} onChange={e => setCurrency(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={!orderId || !invoiceNumber || !amount}>Create Invoice</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {invoices?.length === 0 ? (
          <Card className="py-12 text-center text-muted-foreground border-dashed">
            <p>No invoices found.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {invoices?.map(inv => (
              <Card key={inv.id}>
                <CardContent className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-heading font-semibold text-lg">{inv.invoiceNumber}</h3>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(inv.amount, inv.currency)}</div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>Order ID: <span className="font-medium text-foreground">{inv.orderId}</span></div>
                      <div>Issued: {new Date(inv.createdAt).toLocaleDateString()}</div>
                      {inv.dueDate && <div>Due: <span className="text-destructive font-medium">{new Date(inv.dueDate).toLocaleDateString()}</span></div>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {!isSupplier && inv.status === "unpaid" && (
                      <Dialog open={payOpen === inv.id} onOpenChange={(open) => setPayOpen(open ? inv.id : null)}>
                        <KycGateButton actionName="pay invoices" asChild>
                          <DialogTrigger asChild>
                            <Button>Pay Invoice</Button>
                          </DialogTrigger>
                        </KycGateButton>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-4">
                            <p className="text-sm text-muted-foreground mb-4">
                              You are about to record a payment of <strong>{formatCurrency(inv.amount, inv.currency)}</strong> for invoice {inv.invoiceNumber}.
                            </p>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Payment Method</label>
                              <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="wire_transfer">Wire Transfer / SWIFT</SelectItem>
                                  <SelectItem value="letter_of_credit">Letter of Credit</SelectItem>
                                  <SelectItem value="credit_card">Credit Card</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Reference / Transaction ID</label>
                              <Input value={payRef} onChange={e => setPayRef(e.target.value)} />
                            </div>
                            <Button onClick={handlePay} className="w-full mt-4" disabled={!payMethod}>Confirm Payment</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t border-border">
        <h2 className="text-2xl font-heading font-bold">Payment Ledger</h2>
        
        {payments?.length === 0 ? (
          <Card className="py-12 text-center text-muted-foreground border-dashed">
            <p>No payments recorded.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Invoice ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 rounded-tr-lg font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments?.map(pay => (
                  <tr key={pay.id} className="bg-card">
                    <td className="px-4 py-3">{new Date(pay.paidAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">#{pay.invoiceId}</td>
                    <td className="px-4 py-3 text-emerald-500 font-medium">{formatCurrency(pay.amount, pay.currency)}</td>
                    <td className="px-4 py-3 capitalize">{pay.method.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{pay.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
