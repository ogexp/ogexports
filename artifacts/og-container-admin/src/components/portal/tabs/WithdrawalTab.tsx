import { Link } from "wouter"
import { ArrowUpRight, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function WithdrawalTab() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Withdrawals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Use the withdrawal page to review your current wallet balance, submit a request, and check API-reported withdrawal records. Limits, fees, and timing are only shown when the service provides them.
        </p>
        <Link href="/invest/withdraw">
          <Button><ArrowUpRight className="mr-2 h-4 w-4" />Open withdrawals</Button>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          No processing-time estimate is shown here.
        </div>
      </CardContent>
    </Card>
  )
}
