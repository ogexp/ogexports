import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { INVESTOR_PORTFOLIO, MOCK_TRANSACTIONS } from "@/data/investments"
import {
  Wallet, Download, ArrowUpRight, ArrowDownRight, TrendingUp,
  Lock, CircleDollarSign, RefreshCw, Eye, EyeOff, FileText, Star
} from "lucide-react"

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const TX_ICON: Record<string, { Icon: any; color: string }> = {
  deposit: { Icon: ArrowDownRight, color: "text-emerald-500" },
  return: { Icon: Star, color: "text-amber-500" },
  withdrawal: { Icon: ArrowUpRight, color: "text-red-500" },
  investment: { Icon: TrendingUp, color: "text-blue-500" },
}

const TX_BADGE: Record<string, string> = {
  deposit: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  return: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  withdrawal: "bg-red-500/10 text-red-600 border-red-500/30",
  investment: "bg-blue-500/10 text-blue-600 border-blue-500/30",
}

interface BalanceCardProps {
  label: string; value: number; icon: any; color: string; bg: string
  sub?: string; hidden?: boolean; accent: string
}

function BalanceCard({ label, value, icon: Icon, color, bg, sub, hidden, accent }: BalanceCardProps) {
  return (
    <Card className={`border-border/60 bg-card/80 backdrop-blur relative overflow-hidden`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
            <p className="text-2xl font-heading font-bold truncate">{hidden ? "••••••" : fmt(value)}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WalletTab() {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)
  const [balanceHidden, setBalanceHidden] = useState(false)

  const dash = INVESTOR_PORTFOLIO
  const recentTxs = MOCK_TRANSACTIONS.slice(0, 8)

  const handleDownloadStatement = async () => {
    setDownloading(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      toast({ title: "Statement Initiated", description: "Your wallet statement (PDF) is being prepared and will download shortly." })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Balance Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/20 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="w-4 h-4 text-primary" />
              Total Balance
              <button onClick={() => setBalanceHidden(!balanceHidden)} className="ml-1 hover:text-foreground">
                {balanceHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-4xl font-heading font-bold">
              {balanceHidden ? "•••••••••" : fmt(dash.totalValue)}
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <ArrowDownRight className="w-4 h-4" /> Deposit
              </Button>
              <Button size="sm" variant="outline" className="gap-2 border-primary/40">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </Button>
            </div>
          </div>
        </Card>
        
        <BalanceCard label="Available" value={dash.available} icon={CircleDollarSign} color="text-emerald-500" bg="bg-emerald-500/10" accent="border-l-emerald-500" sub="Ready to invest or withdraw" hidden={balanceHidden} />
        <BalanceCard label="Locked" value={dash.locked} icon={Lock} color="text-amber-500" bg="bg-amber-500/10" accent="border-l-amber-500" sub="In active investments" hidden={balanceHidden} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Recent Transactions
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">View All</Button>
            </div>
          </CardHeader>
          <div className="divide-y divide-border/30">
            {recentTxs.map((tx) => {
              const { Icon, color } = TX_ICON[tx.type] || { Icon: CircleDollarSign, color: "text-muted-foreground" }
              return (
                <div key={tx.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color.replace("text-", "bg-").replace("500", "500/10")}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{tx.description}</span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 capitalize ${TX_BADGE[tx.type] || ""}`}>{tx.type}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{tx.date}</span>
                        <span>·</span>
                        <span className="font-mono text-[10px]">{tx.ref}</span>
                        {tx.status === 'pending' && <span className="text-amber-500">(Pending)</span>}
                      </div>
                    </div>
                  </div>
                  <div className={`text-base font-bold shrink-0 ${tx.amount > 0 ? "text-emerald-500" : "text-foreground"}`}>
                    {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="border-border/60 bg-muted/20 h-fit">
          <CardHeader>
            <CardTitle className="text-base font-heading">Wallet Statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Select Month</label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option>July 2026</option>
                <option>June 2026</option>
                <option>May 2026</option>
                <option>April 2026</option>
              </select>
            </div>
            <Button className="w-full gap-2" variant="outline" onClick={handleDownloadStatement} disabled={downloading}>
              <Download className="w-4 h-4" /> {downloading ? "Preparing..." : "Download PDF Statement"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Statements are generated on the 1st of every month for the previous period.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
