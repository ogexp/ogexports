import { ReactNode } from "react"
import { Redirect, useLocation } from "wouter"
import { Loader2 } from "lucide-react"
import { useInvestorKycApproved } from "@/components/invest/InvestorKycGate"

/**
 * Blocks unverified investors from all /invest/* routes except /invest/kyc.
 * Once KYC is admin-approved, children render normally.
 */
export function InvestorKycRouteGate({ children }: { children: ReactNode }) {
  const [location] = useLocation()
  const { approved, isLoading } = useInvestorKycApproved()

  const onKycPage = location === "/invest/kyc" || location.startsWith("/invest/kyc?")

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking KYC status…
      </div>
    )
  }

  if (!approved && !onKycPage) {
    return <Redirect to="/invest/kyc" />
  }

  return <>{children}</>
}
