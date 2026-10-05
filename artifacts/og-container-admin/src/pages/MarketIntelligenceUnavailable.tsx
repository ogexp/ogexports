import { Link } from "wouter"
import { BarChart3, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePageTitle } from "@/hooks/use-page-title"

export default function MarketIntelligenceUnavailable() {
  usePageTitle(
    "Market Intelligence",
    "Verified market data is not currently available",
  )

  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-3xl font-bold md:text-4xl">Market Intelligence</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            This page is waiting for verified market-data sources.
          </p>
        </header>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleAlert className="h-5 w-5 text-amber-600" />
              No verified feed is connected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Commodity prices, exchange rates, demand figures, trade trends, and shipping quotes are not shown because this app has no verified feed for them.
            </p>
            <p>
              No simulated price history or live-market claims are used here. Project-specific figures remain available only when supplied in the investor project record.
            </p>
            <Link href="/invest/opportunities">
              <Button variant="outline">View investment opportunities</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
