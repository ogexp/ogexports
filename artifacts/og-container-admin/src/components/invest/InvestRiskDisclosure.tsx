import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export function InvestRiskDisclosure({ compact }: { compact?: boolean } = {}) {
  return (
    <div className={compact ? "py-8" : "py-16 container px-4 md:px-6"}>
      <Card className="bg-amber-500/5 border-amber-500/20 text-center p-8 md:p-12 max-w-4xl mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4 opacity-80" />
        <h3 className="font-heading font-semibold text-xl mb-3 text-amber-700 dark:text-amber-500">Risk Disclosure</h3>
        <p className="text-sm text-amber-700/80 dark:text-amber-500/80 leading-relaxed max-w-2xl mx-auto">
          Capital is not guaranteed. All returns are based on physical trade profit-sharing and subject to market, shipping, and currency risks. Past performance is indicative only. All investments are settled in USD. Please consult a financial advisor before committing capital. OG Exports does not provide financial advice.
        </p>
      </Card>
    </div>
  )
}
