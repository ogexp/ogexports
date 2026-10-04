import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { INVESTOR_PORTFOLIO, MOCK_TRANSACTIONS } from "@/data/investments"
import {
  Wallet, Building2, CheckCircle2, Clock, ChevronRight,
  Plus, AlertCircle, ArrowUpRight, RefreshCw, Download, Pencil, Trash2
} from "lucide-react"

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const STEPS = ["Select Account", "Enter Amount", "Review & Confirm"]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    processing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  }
  return <Badge variant="outline" className={`capitalize ${map[status] || ""}`}>{status}</Badge>
}

export function WithdrawalTab() {
  const { toast } = useToast()
  const [view, setView] = useState<"home" | "new" | "add-bank">("home")
  const [step, setStep] = useState(0)
  const [selectedBank, setSelectedBank] = useState<number | null>(null)
  const [amount, setAmount] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [savedBanks, setSavedBanks] = useState([
    { id: 1, title: "Mohammad Hassan - Personal", bank: "Habib Bank Limited", account: "****3456", iban: "PK36HABB0000020003891069", swift: "HABBPKKA", currency: "USD", verified: true }
  ])

  const walletBalance = INVESTOR_PORTFOLIO.available
  const bank = selectedBank !== null ? savedBanks[selectedBank] : null
  const withdrawalTxs = MOCK_TRANSACTIONS.filter(t => t.type === 'withdrawal').slice(0, 3)

  const handleSubmit = () => {
    setSubmitted(true)
    toast({ title: "Withdrawal Request Submitted", description: "Admin will process your request within 2–5 business days." })
  }

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedBanks([...savedBanks, {
      id: Date.now(), title: "New Account", bank: "Verified Bank", account: "****0000", iban: "PK00XXXX0000000000", swift: "XXXXPKKA", currency: "USD", verified: false
    }])
    setView("home")
    toast({ title: "Bank account added", description: "Verification pending." })
  }

  if (view === "home" && !submitted) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Available to Withdraw</p>
                <p className="text-3xl font-heading font-bold text-emerald-500">{fmt(walletBalance)}</p>
              </div>
              <Button onClick={() => { setView("new"); setStep(0) }} className="gap-2 shrink-0">
                <ArrowUpRight className="w-4 h-4" /> Withdraw Funds
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Withdrawn</p>
                <p className="text-3xl font-heading font-bold">{fmt(INVESTOR_PORTFOLIO.totalWithdrawn)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold">Saved Bank Accounts</h3>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setView("add-bank")}>
            <Plus className="w-4 h-4" /> Add Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedBanks.map((b, idx) => (
            <Card key={b.id} className="border-border/60 bg-card/80">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{b.title}</p>
                      <p className="text-xs text-muted-foreground">{b.bank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {b.verified 
                      ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Verified</Badge>
                      : <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Pending</Badge>}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-mono font-medium">{b.account}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IBAN</span><span className="font-mono font-medium">{b.iban}</span></div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => toast({ title: "Bank account removed" })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h3 className="text-lg font-heading font-semibold mt-8">Recent Withdrawals</h3>
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Reference</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Bank</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Amount</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {withdrawalTxs.map(w => (
                  <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground">{w.date}</td>
                    <td className="px-5 py-4 font-mono text-xs">{w.ref}</td>
                    <td className="px-5 py-4 text-muted-foreground">HBL account ending 3456</td>
                    <td className="px-5 py-4 font-semibold">{fmt(Math.abs(w.amount))}</td>
                    <td className="px-5 py-4"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    )
  }

  // Add Bank Account
  if (view === "add-bank") {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <h3 className="text-lg font-heading font-semibold">Add Bank Account</h3>
        <Card className="border-border/60 bg-card/80">
          <form onSubmit={handleAddBank}>
            <CardContent className="p-6 space-y-4">
              {[
                { label: "Account Holder Name", placeholder: "Exact legal name" },
                { label: "Bank Name", placeholder: "e.g. Standard Chartered" },
                { label: "Account Number", placeholder: "0000-0000000000" },
                { label: "IBAN", placeholder: "PK00XXXX0000000000000000" },
                { label: "SWIFT / BIC", placeholder: "e.g. SCBLPKKX" },
                { label: "Country", placeholder: "e.g. Pakistan" },
              ].map(f => (
                <div key={f.label} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input placeholder={f.placeholder} required />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" required>
                  <option>USD – US Dollar</option>
                  <option>PKR – Pakistani Rupee</option>
                  <option>AED – UAE Dirham</option>
                  <option>EUR – Euro</option>
                </select>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
                For your security, new bank accounts require admin approval before withdrawals can be processed.
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setView("home")} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Save Account
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    )
  }

  // New withdrawal wizard
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {submitted ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-heading font-bold">Withdrawal Submitted</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Your withdrawal of <strong>{fmt(Number(amount))}</strong> to <strong>{bank?.bank}</strong> is under review.
          </p>
          <div className="inline-block bg-background rounded-lg px-4 py-2 font-mono text-sm border border-border">
            Ref: WDR-{new Date().toISOString().slice(0,10).replace(/-/g,'')}-{Math.floor(Math.random()*1000)}
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground text-left bg-muted/30 rounded-xl p-4 mt-4">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Admin review: 1–2 business days</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Bank transfer: 2–3 additional business days</div>
          </div>
          <Button onClick={() => { setView("home"); setSubmitted(false) }} variant="outline" className="w-full gap-2 mt-4">
            <RefreshCw className="w-4 h-4" /> Back to Withdrawals
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
            <CardContent className="p-6 space-y-5">
              {step === 0 && (
                <>
                  <h3 className="text-lg font-heading font-semibold">Select Bank Account</h3>
                  <div className="grid gap-3">
                    {savedBanks.map((b, idx) => (
                      <div
                        key={b.id}
                        onClick={() => { if(b.verified) setSelectedBank(idx) }}
                        className={`p-4 rounded-xl border-2 transition-all ${b.verified ? 'cursor-pointer hover:border-border' : 'opacity-60 cursor-not-allowed'} ${selectedBank === idx ? "border-primary bg-primary/5" : "border-border/50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold flex items-center gap-2">
                              {b.title} 
                              {!b.verified && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5">Pending Verification</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{b.iban}</p>
                          </div>
                          <Badge variant="outline">{b.currency}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 w-full" onClick={() => setView("add-bank")}>
                    <Plus className="w-4 h-4" /> Add New Bank Account
                  </Button>
                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline" onClick={() => setView("home")} className="flex-1">Cancel</Button>
                    <Button onClick={() => setStep(1)} disabled={selectedBank === null} className="flex-1 gap-2">
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h3 className="text-lg font-heading font-semibold">Enter Withdrawal Amount</h3>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                    <span className="text-xl font-bold text-emerald-600">{fmt(walletBalance)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Withdrawal Amount (USD)</Label>
                    <Input type="number" placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} max={walletBalance} min={100} className="text-lg h-12" />
                    <p className="text-xs text-muted-foreground">Minimum: $100</p>
                  </div>
                  {Number(amount) > walletBalance && (
                    <div className="text-sm text-red-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Amount exceeds available balance.</div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Purpose (Optional)</Label>
                    <Input placeholder="e.g. Profit realization" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                    <Button onClick={() => setStep(2)} disabled={!amount || Number(amount) < 100 || Number(amount) > walletBalance} className="flex-1 gap-2">
                      Review <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="text-lg font-heading font-semibold">Confirm Withdrawal</h3>
                  <div className="space-y-2.5 bg-muted/30 rounded-xl p-5 border border-border/50">
                    {[
                      ["Amount", fmt(Number(amount))],
                      ["Bank", bank?.bank || ""],
                      ["Account", bank?.account || ""],
                      ["IBAN", bank?.iban || ""],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm gap-4">
                        <span className="text-muted-foreground shrink-0">{k}</span>
                        <span className="font-medium text-right font-mono truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4 inline mr-1.5" />
                    Withdrawal processing takes 2-5 business days. Admin approval required.
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Confirm
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Button variant="ghost" onClick={() => setView("home")} className="text-sm text-muted-foreground">
            ← Cancel and go back
          </Button>
        </>
      )}
    </div>
  )
}
