import { Redirect } from "wouter"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { InvestmentUnavailablePage } from "@/components/auth/InvestmentModuleGate"
import { InvestorKycRouteGate } from "@/components/invest/InvestorKycRouteGate"

export type InvestCategoryKey = "plant" | "feeds" | "ricemill"

/** Gates facility category pages — investor role, module enabled, and category visibility. */
export function GuardedInvestCategory({
  category,
  Page,
}: {
  category: InvestCategoryKey
  Page: React.ComponentType
}) {
  const { investmentModuleEnabled, investCategoryVisible, isLoading } = usePlatformSettings()
  const { isLoaded, isSignedIn, accountType } = useSafeAuth()

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    )
  }

  if (!investmentModuleEnabled) {
    if (isSignedIn && accountType === "investor") {
      return <InvestmentUnavailablePage />
    }
    return <Redirect to="/" />
  }

  if (!investCategoryVisible[category]) {
    return <Redirect to="/invest/dashboard" />
  }

  return (
    <RoleGuard roles={["investor"]} redirectTo="/sign-in">
      <InvestorKycRouteGate>
        <Page />
      </InvestorKycRouteGate>
    </RoleGuard>
  )
}
