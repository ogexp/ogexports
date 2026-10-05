import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatInvestorProjectAmount } from "@/lib/invest-format"

type FundingProgressProps = {
  raised: number | null
  target: number | null
  fundingPercentage?: number | null
  remainingAmount?: number | null
  currency?: string | null
  variant?: "compact" | "detailed"
  showRemaining?: boolean
  investors?: number | null
  className?: string
}

export function FundingProgress({
  raised,
  target,
  fundingPercentage,
  remainingAmount,
  currency,
  variant = "compact",
  showRemaining = true,
  investors,
  className,
}: FundingProgressProps) {
  const progress = fundingPercentage != null && Number.isFinite(Number(fundingPercentage))
    ? Math.min(100, Math.max(0, Number(fundingPercentage)))
    : null
  const hasAmounts = raised != null && target != null && Boolean(currency)

  if (progress == null && !hasAmounts) {
    return (
      <div className={cn("rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground", className)}>
        Funding progress, amounts, or currency are not provided by the current project record.
      </div>
    )
  }

  const pctLabel = progress == null ? null : `${progress.toFixed(0)}%`

  if (variant === "detailed") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-primary">{pctLabel ? `${pctLabel} Funded` : "Funding progress not provided"}</span>
          {investors != null && (
            <span className="text-muted-foreground">{investors} Investors</span>
          )}
        </div>
        {progress != null && <Progress value={progress} className="h-2.5 bg-muted" />}
        {hasAmounts && (
          <div className="flex justify-between text-sm text-muted-foreground gap-2">
            <span className="text-right">{formatInvestorProjectAmount(raised, currency)} raised</span>
            <span className="text-right">{formatInvestorProjectAmount(target, currency)} target</span>
          </div>
        )}
        {showRemaining && remainingAmount != null && currency && (
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium text-amber-500 text-right">{formatInvestorProjectAmount(remainingAmount, currency)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm gap-2">
        <span className="font-semibold text-primary shrink-0">{pctLabel ? `${pctLabel} funded` : "Funding progress not provided"}</span>
        {hasAmounts && (
          <span className="text-muted-foreground text-right">
            {formatInvestorProjectAmount(raised, currency)} / {formatInvestorProjectAmount(target, currency)}
          </span>
        )}
      </div>
      {progress != null && <Progress value={progress} className="h-2" />}
      {showRemaining && remainingAmount != null && currency && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-amber-600 dark:text-amber-500">
            {formatInvestorProjectAmount(remainingAmount, currency)}
          </span>{" "}
          remaining
        </div>
      )}
    </div>
  )
}
