import { Link } from "wouter"
import { Clock } from "lucide-react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Button } from "@/components/ui/button"

type Props = {
  title: string
  subtitle?: string
  message?: string
}

export function InvestComingSoonPage({
  title,
  subtitle = "Coming soon",
  message = "This investment category is being prepared. Check back soon or browse other opportunities.",
}: Props) {
  return (
    <InvestPortalLayout title={title} subtitle={subtitle}>
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4 border border-border rounded-2xl p-8 bg-card">
          <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-heading font-bold">Coming Soon</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild variant="outline">
            <Link href="/invest/opportunities">Browse Opportunities</Link>
          </Button>
        </div>
      </div>
    </InvestPortalLayout>
  )
}
