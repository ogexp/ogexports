import { Card } from "@/components/ui/card"
import { DollarSign, Package, Ship, TrendingUp } from "lucide-react"

const STEPS = [
  { icon: DollarSign, title: "Deposit Funds", desc: "Transfer capital to your OG Trade Wallet via bank transfer." },
  { icon: Package, title: "Choose a Project", desc: "Browse open containers and long-term projects." },
  { icon: Ship, title: "Track Progress", desc: "Follow funding, shipping, and settlement in real time." },
  { icon: TrendingUp, title: "Earn Returns", desc: "Receive profit distributions when the trade settles." },
]

export function InvestHowItWorks({ compact }: { compact?: boolean } = {}) {
  return (
    <div className={compact ? "py-8 border-b border-border/40" : "py-16 border-b border-border/40"}>
      <div className={compact ? "space-y-8" : "container px-4 md:px-6"}>
        <div className={`text-center ${compact ? "mb-8" : "mb-12"} space-y-3`}>
          <h2 className={`font-heading font-bold ${compact ? "text-2xl" : "text-3xl"}`}>How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Simple steps from deposit to returns</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map(s => (
            <Card key={s.title} className="glass-card text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
