import { ReactNode } from "react"
import { Link, Redirect } from "wouter"
import { PackageX } from "lucide-react"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { Button } from "@/components/ui/button"
import { RoleGuard } from "@/components/auth/RoleGuard"

export function SupplierUnavailablePage({ title = "Supplier module unavailable" }: { title?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 border border-border rounded-2xl p-8 bg-card">
        <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <PackageX className="w-6 h-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-heading font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          The Supplier module is currently unavailable. Please contact support if you need assistance.
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}

/** Gates supplier portal pages — requires supplier role AND module enabled. */
export function GuardedSupplier({ Page }: { Page: React.ComponentType }) {
  const { supplierModuleEnabled, isLoading } = usePlatformSettings()
  const { isLoaded, isSignedIn, accountType } = useSafeAuth()

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    )
  }

  if (!supplierModuleEnabled) {
    if (isSignedIn && accountType === "supplier") {
      return <SupplierUnavailablePage />
    }
    return <Redirect to="/" />
  }

  return (
    <RoleGuard roles={["supplier"]} redirectTo="/sign-in">
      <Page />
    </RoleGuard>
  )
}

/** Gates admin supplier pages — requires admin role AND module enabled. */
export function GuardedAdminSupplier({ Page }: { Page: React.ComponentType }) {
  const { supplierModuleEnabled, isLoading } = usePlatformSettings()

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        Checking access…
      </div>
    )
  }

  if (!supplierModuleEnabled) {
    return <Redirect to="/admin/dashboard" />
  }

  return (
    <RoleGuard roles={["admin"]} redirectTo="/my-admin/login">
      <Page />
    </RoleGuard>
  )
}

export function SupplierModuleOptional({ children }: { children: ReactNode }) {
  const { supplierModuleEnabled } = usePlatformSettings()
  if (!supplierModuleEnabled) return null
  return <>{children}</>
}
