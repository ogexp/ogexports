import { Progress } from "@/components/ui/progress"
import { getFundingMetrics } from "@/lib/funding-metrics"
import { useCurrency } from "@/lib/use-currency"
import { cn } from "@/lib/utils"

type FundingProgressProps = {
  raised: number
  target: number
  variant?: "compact" | "detailed"
  showRemaining?: boolean
  investors?: number
  className?: string
}

export function FundingProgress({
  raised,
  target,
  variant = "compact",
  showRemaining = true,
  investors,
  className,
}: FundingProgressProps) {
  const c = useCurrency()
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
          <span className="text-right">{c.fmtDual(raised)} raised</span>
          <span className="text-right">{c.fmtDual(target)} target</span>
        </div>
        {showRemaining && (
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium text-amber-500 text-right">{c.fmtDual(remaining)}</span>
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
          {c.fmtDual(raised)} / {c.fmtDual(target)}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {showRemaining && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-amber-600 dark:text-amber-500">
            {c.fmtDual(remaining)}
          </span>{" "}
          remaining
        </div>
      )}
    </div>
  )
}
