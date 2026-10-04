import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { api, unwrapPage } from "@/lib/api"
import { paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/deposit-statuses"
import {
  CircleDollarSign, Copy, CheckCircle2, Clock, Upload, Download,
  ChevronRight, Building2, Globe, FileText, AlertCircle, RefreshCw,
  Wallet, Zap, Loader2
} from "lucide-react"

const AVAILABLE_BALANCE = 8250   // mock wallet balance

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const BANK_ACCOUNTS = [
  {
    id: 1, type: "USD International", bank: "Habib Bank Limited (HBL)", accountTitle: "OG Exports (Private) Limited",
    accountNo: "7234567890123456", iban: "PK36HABB0000020003891069", swift: "HABBPKKA",
    branch: "Main Branch, Depalpur City, Punjab, Pakistan", currency: "USD",
  }
]

const STEPS = ["Amount", "Bank Details", "Upload Receipt", "Confirmation"]

function CopyField({ label, value }: { label: string; value: string }) {
  const { toast } = useToast()
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-mono font-medium flex-1 bg-muted/50 px-3 py-2 rounded-lg">{value}</p>
        <button
          onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied!", description: `${label} copied.` }) }}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant="outline" className={`capitalize border-0 ${paymentStatusBadgeClass(status)}`}>
      {label || paymentStatusLabel(status)}
    </Badge>
  )
}

export function DepositTab() {
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [reference, setReference] = useState("")
  const [receiptFile, setReceiptFile] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [view, setView] = useState<"new" | "history" | "use-balance">("history")
  const [balanceAmount, setBalanceAmount] = useState("")
  const [balanceSubmitted, setBalanceSubmitted] = useState(false)

  const { data: historyPayload, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["investor", "deposits", "portal"],
    queryFn: () => api.get("/api/investor/deposits", { per_page: 50 }),
  })
  const depositTxs = unwrapPage<any>(historyPayload).data

  const handleSubmit = () => {
    setSubmitted(true)
    toast({ title: "Deposit Request Submitted", description: "Admin will verify your receipt within 1–3 business days." })
    void refetchHistory()
  }

  const bank = BANK_ACCOUNTS[0]

  // ── Use Available Balance flow ──────────────────────────────────────────
  if (view === "use-balance") {
    const deductAmt = parseFloat(balanceAmount) || 0
    const remaining = AVAILABLE_BALANCE - deductAmt
    if (balanceSubmitted) {
      return (
        <div className="space-y-4 max-w-lg mx-auto">
          <Card className="border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-heading font-bold">Balance Applied!</h3>
            <p className="text-muted-foreground text-sm">
              <strong>{fmt(deductAmt)}</strong> has been instantly allocated from your OG Trade Wallet.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-left text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount Used</span><span className="font-bold text-emerald-500">− {fmt(deductAmt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Remaining Balance</span><span className="font-bold">{fmt(remaining)}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground pt-1"><Zap className="w-3.5 h-3.5 text-emerald-500" /> Instant — no admin review required</div>
            </div>
            <Button onClick={() => { setView("history"); setBalanceSubmitted(false); setBalanceAmount("") }} variant="outline" className="gap-2 w-full mt-2">
              <RefreshCw className="w-4 h-4" /> Back to Wallet
            </Button>
          </Card>
        </div>
      )
    }
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("history")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h3 className="text-lg font-heading font-semibold">Use Account Balance</h3>
        </div>

        {/* Balance display */}
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
                <p className="text-2xl font-heading font-bold text-emerald-500">{fmt(AVAILABLE_BALANCE)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Zap className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-semibold">Instant</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5 space-y-5">
            <div className="space-y-1.5">
              <Label>Amount to Use (USD)</Label>
              <Input
                type="number"
                placeholder="e.g. 2000"
                value={balanceAmount}
                onChange={e => setBalanceAmount(e.target.value)}
                min={100}
                max={AVAILABLE_BALANCE}
              />
              {balanceAmount && deductAmt > 0 && (
                <div className="mt-3 bg-muted/30 rounded-xl p-4 space-y-1.5 text-sm border border-border/50">
                  <div className="flex justify-between"><span className="text-muted-foreground">Current Balance</span><span className="font-semibold">{fmt(AVAILABLE_BALANCE)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount to Use</span><span className="font-semibold text-red-500">− {fmt(deductAmt)}</span></div>
                  <div className="flex justify-between border-t border-border/50 pt-1.5"><span className="text-muted-foreground font-medium">Remaining Balance</span><span className={`font-bold ${remaining < 0 ? "text-red-500" : "text-emerald-500"}`}>{fmt(remaining)}</span></div>
                </div>
              )}
              {deductAmt > AVAILABLE_BALANCE && (
                <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1"><AlertCircle className="w-3.5 h-3.5" /> Amount exceeds available balance</p>
              )}
            </div>

            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg p-3 flex gap-2 text-xs text-emerald-700">
              <Zap className="w-4 h-4 shrink-0 text-emerald-500" />
              <p>Balance deductions are <strong>instant</strong>. No receipt upload or admin approval needed.</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setView("history")} className="flex-1">Cancel</Button>
              <Button
                onClick={() => { setBalanceSubmitted(true); toast({ title: "Balance Applied!", description: `${fmt(deductAmt)} deducted from your OG Trade Wallet.` }) }}
                disabled={!balanceAmount || deductAmt < 100 || deductAmt > AVAILABLE_BALANCE}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Apply Balance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "history" && !submitted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold">Company Bank Accounts</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank details card */}
          <Card className="border-border/60 bg-card/80 h-fit">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">OG Exports (Private) Limited</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">International USD Transfers</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <CopyField label="Bank Name" value={bank.bank} />
              <CopyField label="Account Title" value={bank.accountTitle} />
              <CopyField label="Account Number" value={bank.accountNo} />
              <div className="grid grid-cols-2 gap-4">
                <CopyField label="IBAN" value={bank.iban} />
                <CopyField label="SWIFT Code" value={bank.swift} />
              </div>
              <CopyField label="Branch" value={bank.branch} />
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-xs flex gap-2 mt-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>Ensure you include your <strong>Investment Account ID</strong> in the transfer reference to avoid delays.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Use Balance card */}
            <Card className="border-emerald-500/40 bg-emerald-500/5 p-5 flex items-center gap-4 cursor-pointer hover:border-emerald-500/70 transition-colors" onClick={() => { setView("use-balance"); setBalanceSubmitted(false) }}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm">Use Account Balance</h3>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full"><Zap className="w-2.5 h-2.5" />Instant</span>
                </div>
                <p className="text-xs text-muted-foreground">Available balance</p>
                <p className="text-lg font-heading font-bold text-emerald-500">{fmt(AVAILABLE_BALANCE)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Card>

            {/* New Deposit card */}
            <Card className="border-border/60 bg-card/80 p-6 flex flex-col justify-center items-center text-center h-40 border-dashed">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CircleDollarSign className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1 text-sm">Make a New Deposit</h3>
              <p className="text-xs text-muted-foreground mb-3">Transfer funds via bank to add balance.</p>
              <Button onClick={() => { setView("new"); setStep(0); setSubmitted(false) }} className="gap-2 w-full max-w-[200px]" size="sm">
                Start Deposit
              </Button>
            </Card>
            
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-heading font-semibold">Recent Deposits</h3>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => void refetchHistory()}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
            <Card className="border-border/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground bg-muted/20">
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Date</th>
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Reference</th>
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Amount</th>
                      <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Status</th>
                      <th className="text-right px-5 py-3 text-xs uppercase tracking-wider font-medium">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {historyLoading && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading deposits…
                        </td>
                      </tr>
                    )}
                    {!historyLoading && depositTxs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                          No deposits yet.
                        </td>
                      </tr>
                    )}
                    {depositTxs.slice(0, 10).map((dep: any) => (
                      <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4 text-muted-foreground">
                          {dep.created_at ? new Date(dep.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">{dep.reference || `OGDEP-INV-${String(dep.id).padStart(3, "0")}`}</td>
                        <td className="px-5 py-4 font-semibold">{fmt(Number(dep.amount || 0))}</td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={dep.review_status || dep.status}
                            label={dep.review_status_label || paymentStatusLabel(dep.status)}
                          />
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-muted-foreground">{dep.method || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // New deposit wizard
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {submitted ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-heading font-bold">Deposit Request Submitted!</h3>
          <p className="text-muted-foreground text-sm">
            Your deposit of <strong>{fmt(Number(amount))}</strong> has been submitted for admin verification.
            Reference: <strong className="font-mono">{reference || "TXN" + Date.now()}</strong>
          </p>
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-left text-sm mt-4">
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4 text-amber-500" /> Admin will verify within 24 hours</div>
            <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Wallet will be credited upon approval</div>
            <div className="flex items-center gap-2 text-muted-foreground"><AlertCircle className="w-4 h-4 text-blue-500" /> Keep your receipt copy for records</div>
          </div>
          <Button onClick={() => { setView("history"); setSubmitted(false) }} variant="outline" className="gap-2 w-full mt-4">
            <RefreshCw className="w-4 h-4" /> View Deposit History
          </Button>
        </Card>
      ) : (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 shrink-0 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step ? "bg-primary border-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "border-muted-foreground/30"}`}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6 space-y-6">
              {step === 0 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-heading font-semibold">Enter Deposit Amount</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Currency</Label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="USD">USD – US Dollar</option>
                        <option value="PKR">PKR – Pakistani Rupee</option>
                        <option value="AED">AED – UAE Dirham</option>
                        <option value="EUR">EUR – Euro</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Amount</Label>
                      <Input type="number" placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} min={100} />
                    </div>
                  </div>
                  {amount && Number(amount) > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Deposit Amount</span><span className="font-semibold text-emerald-500">{currency} {Number(amount).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Est. Processing Time</span><span>1–3 business days</span></div>
                    </div>
                  )}
                  <Button onClick={() => setStep(1)} disabled={!amount || Number(amount) < 100} className="w-full gap-2">
                    Next: Bank Details <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-heading font-semibold">Transfer Instructions</h3>
                  <p className="text-sm text-muted-foreground">Please initiate a transfer of <strong>{fmt(Number(amount))}</strong> to the following account:</p>
                  
                  <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border/50">
                    <CopyField label="Account Title" value={bank.accountTitle} />
                    <CopyField label="IBAN" value={bank.iban} />
                    <CopyField label="SWIFT / BIC" value={bank.swift} />
                    <CopyField label="Bank" value={bank.bank} />
                    <CopyField label="Branch" value={bank.branch} />
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                    <Button onClick={() => setStep(2)} className="flex-1 gap-2">I have transferred <ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-heading font-semibold">Upload Payment Receipt</h3>
                  <div className="space-y-1.5">
                    <Label>Bank Reference Number</Label>
                    <Input placeholder="e.g. FT20260711XYZ" value={reference} onChange={e => setReference(e.target.value)} />
                    <p className="text-xs text-muted-foreground">The transaction ID or reference provided by your bank.</p>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Transfer Receipt</Label>
                    {receiptFile ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{receiptFile}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setReceiptFile(null)} className="text-red-500 h-8 px-2">Remove</Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">Click to upload receipt</span>
                        <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 5MB</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) setReceiptFile(e.target.files[0].name) }} />
                      </label>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button onClick={() => setStep(3)} disabled={!receiptFile || !reference} className="flex-1 gap-2">Review <ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-heading font-semibold">Review Request</h3>
                  <div className="space-y-2.5 bg-muted/30 rounded-xl p-5 border border-border/50">
                    {[
                      ["Amount", `${currency} ${Number(amount).toLocaleString()}`],
                      ["Bank", bank.bank],
                      ["Reference No.", reference],
                      ["Receipt", receiptFile || ""],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm gap-4">
                        <span className="text-muted-foreground shrink-0">{k}</span>
                        <span className="font-medium text-right truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Submit Deposit
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button variant="ghost" onClick={() => setView("history")} className="text-sm text-muted-foreground">
            ← Cancel and go back
          </Button>
        </>
      )}
    </div>
  )
}
