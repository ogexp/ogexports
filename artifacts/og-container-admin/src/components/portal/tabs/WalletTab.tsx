import { Link } from "wouter"
import { ArrowDownRight, ArrowUpRight, FileText, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WalletTab() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Wallet and account activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Balances and transactions are shown in the live investor wallet. This overview does not display local sample figures.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/invest/wallet"><Button><Wallet className="mr-2 h-4 w-4" />Open wallet</Button></Link>
          <Link href="/invest/deposit"><Button variant="outline"><ArrowDownRight className="mr-2 h-4 w-4" />Deposit</Button></Link>
          <Link href="/invest/withdraw"><Button variant="outline"><ArrowUpRight className="mr-2 h-4 w-4" />Withdraw</Button></Link>
          <Link href="/invest/reports"><Button variant="outline"><FileText className="mr-2 h-4 w-4" />Financial reports</Button></Link>
        </div>
      </CardContent>
    </Card>
  )
}
