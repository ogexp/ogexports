import { Progress } from "@/components/ui/progress"
import { getFundingMetrics } from "@/lib/funding-metrics"
import { cn } from "@/lib/utils"
import { formatInvestorProjectAmount } from "@/lib/invest-format"

type FundingProgressProps = {
  raised: number | null
  target: number | null
  currency?: string | null
  variant?: "compact" | "detailed"
  showRemaining?: boolean
  investors?: number | null
  className?: string
}

export function FundingProgress({
  raised,
  target,
  currency,
  variant = "compact",
  showRemaining = true,
  investors,
  className,
}: FundingProgressProps) {
  if (
    raised == null
    || target == null
    || target <= 0
    || !currency
  ) {
    return (
      <div className={cn("rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground", className)}>
        Funding amounts and currency are not provided by the current project record.
      </div>
    )
  }

  const { pct, remaining } = getFundingMetrics(raised, target)
  const pctLabel = pct.toFixed(0)

  if (variant === "detailed") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-primary">{pctLabel}% Funded</span>
          {investors != null && (
            <span className="text-muted-foreground">{investors} Investors</span>
          )}
        </div>
        <Progress value={pct} className="h-2.5 bg-muted" />
        <div className="flex justify-between text-sm text-muted-foreground gap-2">
          <span className="text-right">{formatInvestorProjectAmount(raised, currency)} raised</span>
          <span className="text-right">{formatInvestorProjectAmount(target, currency)} target</span>
        </div>
        {showRemaining && (
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium text-amber-500 text-right">{formatInvestorProjectAmount(remaining, currency)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm gap-2">
        <span className="font-semibold text-primary shrink-0">{pctLabel}% funded</span>
        <span className="text-muted-foreground text-right">
          {formatInvestorProjectAmount(raised, currency)} / {formatInvestorProjectAmount(target, currency)}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {showRemaining && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-amber-600 dark:text-amber-500">
            {formatInvestorProjectAmount(remaining, currency)}
          </span>{" "}
          remaining
        </div>
      )}
    </div>
  )
}
