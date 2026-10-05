import { Link } from "wouter"
import { Card, CardContent } from "@/components/ui/card"
import { ContainerStatusBadge } from "@/components/portal/status-badges"
import { FundingProgress } from "@/components/invest/FundingProgress"
import { Package } from "lucide-react"
import type { ContainerInvestment } from "@/data/investments"
import { formatInvestorProjectAmount } from "@/lib/invest-format"
import { formatContainerLabel } from "@/lib/container-display"

type ContainerOpportunityCardProps = {
  container: ContainerInvestment
  imageFailed?: boolean
  onImageError?: (id: string) => void
}

export function ContainerOpportunityCard({
  container: c,
  imageFailed = false,
  onImageError,
}: ContainerOpportunityCardProps) {
  return (
    <Link href={`/invest/${c.slug}`}>
      <Card className="glass-card h-full hover:border-accent/40 transition-all hover:-translate-y-1 cursor-pointer overflow-hidden group">
        <div className="h-48 w-full overflow-hidden relative bg-muted">
          {c.imageUrl && !imageFailed ? (
            <img
              src={c.imageUrl}
              alt={c.commodity}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => onImageError?.(c.id)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
            {c.destinationFlag} {c.destinationCountry}
          </div>
          <div className="absolute top-3 right-3">
            <ContainerStatusBadge status={c.status} />
          </div>
        </div>
        <CardContent className="p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs font-medium text-muted-foreground">
              <Package className="w-3.5 h-3.5" /> {formatContainerLabel(c.containerNumber, c.containerType)}
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${c.tradeDirection === "import" ? "bg-sky-500/15 text-sky-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                {c.tradeDirection}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-lg leading-tight">{c.commodity}</h3>
          </div>

          <FundingProgress
            raised={c.currentFunding}
            target={c.targetFunding}
            currency={c.currency}
            variant="compact"
          />

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Return</div>
              <div className="font-bold text-emerald-500">{c.expectedReturnPct == null ? "Not provided" : `${c.expectedReturnPct}%`}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Term</div>
              <div className="font-bold text-foreground">{c.investmentPeriodDays == null ? "Not provided" : `${c.investmentPeriodDays}d`}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Min Inv.</div>
              <div className="font-bold text-foreground">{formatInvestorProjectAmount(c.minInvestment, c.currency)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
