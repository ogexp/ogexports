import { ReactNode } from "react"
import { Link, Redirect } from "wouter"
import { TrendingDown } from "lucide-react"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { Button } from "@/components/ui/button"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { InvestorKycRouteGate } from "@/components/invest/InvestorKycRouteGate"

export function InvestmentUnavailablePage({ title = "Investment module unavailable" }: { title?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 border border-border rounded-2xl p-8 bg-card">
        <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <TrendingDown className="w-6 h-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-heading font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          The Investment module is currently unavailable. Please contact support if you need assistance.
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}

/** Gates investor portal pages — requires investor role AND module enabled. */
export function GuardedInvestor({ Page }: { Page: React.ComponentType }) {
  const { investmentModuleEnabled, isLoading } = usePlatformSettings()
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

  return (
    <RoleGuard roles={["investor"]} redirectTo="/sign-in">
      <InvestorKycRouteGate>
        <Page />
      </InvestorKycRouteGate>
    </RoleGuard>
  )
}

/** Gates admin investment pages — requires admin role AND module enabled. */
export function GuardedAdminInvestment({ Page }: { Page: React.ComponentType }) {
  const { investmentModuleEnabled, isLoading } = usePlatformSettings()

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    )
  }

  if (!investmentModuleEnabled) {
    return <Redirect to="/admin/dashboard" />
  }

  return (
    <RoleGuard roles={["admin"]} redirectTo="/my-admin/login">
      <Page />
    </RoleGuard>
  )
}

export type AdminInvestCategoryKey = "produce" | "plant" | "feeds" | "ricemill"

/** Gates dedicated admin category pages when that category is hidden in settings. */
export function GuardedAdminInvestCategory({
  category,
  Page,
}: {
  category: AdminInvestCategoryKey
  Page: React.ComponentType
}) {
  const { investmentModuleEnabled, investCategoryVisible, isLoading } = usePlatformSettings()

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    )
  }

  if (!investmentModuleEnabled) {
    return <Redirect to="/admin/dashboard" />
  }

  if (!investCategoryVisible[category]) {
    return <Redirect to="/admin/investments" />
  }

  return (
    <RoleGuard roles={["admin"]} redirectTo="/my-admin/login">
      <Page />
    </RoleGuard>
  )
}

export function InvestmentModuleOptional({ children }: { children: ReactNode }) {
  const { investmentModuleEnabled } = usePlatformSettings()
  if (!investmentModuleEnabled) return null
  return <>{children}</>
}
