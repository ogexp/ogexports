import { ReactNode } from "react"
import { Redirect } from "wouter"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import type { AccountType } from "@/lib/local-auth"

export function RoleGuard({
  children,
  roles,
  redirectTo = "/sign-in",
}: {
  children: ReactNode
  roles: AccountType[]
  redirectTo?: string
}) {
  const { isLoaded, isSignedIn, accountType } = useSafeAuth()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()

  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    )
  }

  if (!isSignedIn) {
    return <Redirect to={redirectTo} />
  }

  if (!accountType || !roles.includes(accountType)) {
    const home =
      accountType === "admin" ? "/admin/dashboard" :
      accountType === "buyer" ? "/buyer/dashboard" :
      accountType === "supplier" ? (supplierModuleEnabled ? "/supplier/dashboard" : "/") :
      accountType === "investor" ? (investmentModuleEnabled ? "/invest/dashboard" : "/") : "/"
    return <Redirect to={home} />
  }

  return <>{children}</>
}
