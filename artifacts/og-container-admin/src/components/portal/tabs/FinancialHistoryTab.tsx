import { Link } from "wouter"
import { FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function FinancialHistoryTab() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Financial history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          The reports page reads investor activity from the connected service. This overview does not generate sample transactions, charts, or downloadable statements.
        </p>
        <Link href="/invest/reports">
          <Button><Search className="mr-2 h-4 w-4" />Open financial reports</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
