import { Link, useLocation } from "wouter"
import { LogOut, ShieldAlert } from "lucide-react"
import { ImpersonationBanner } from "@/components/ImpersonationBanner"
import { Button } from "@/components/ui/button"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { kycTopBarBadge } from "@/lib/kyc-badge"

interface InvestKycMinimalLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  /** KYC application status for the top badge (defaults to unverified) */
  kycStatus?: string | null
}

/**
 * Minimal shell for unverified investors on the KYC page.
 * No sidebar, no portal header actions (notifications / View Opportunities).
 */
export function InvestKycMinimalLayout({
  children,
  title = "KYC & Document Center",
  subtitle = "Identity verification and compliance documentation",
  kycStatus = "missing",
}: InvestKycMinimalLayoutProps) {
  const [, setLocation] = useLocation()
  const { logout, impersonating, stopImpersonating } = useSafeAuth()
  const badge = kycTopBarBadge(kycStatus)

  async function handleLogout() {
    if (impersonating && stopImpersonating) {
      const res = await stopImpersonating()
      setLocation(res.redirect || "/admin/dashboard")
      return
    }
    logout?.()
    setLocation("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ImpersonationBanner />

      <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-heading font-bold text-foreground truncate">{title}</h1>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${badge.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClassName}`} />
              {badge.label === "KYC Unverified" ? "Unverified" : badge.label}
            </div>
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="border-b border-red-500/20 bg-red-500/5 px-4 sm:px-6 py-2.5">
        <p className="text-xs sm:text-sm text-red-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Complete KYC and wait for admin approval before accessing the investor dashboard.
        </p>
      </div>

      <main className="flex-1 overflow-auto p-4 sm:p-6 max-w-6xl w-full mx-auto">
        {children}
      </main>

      <footer className="border-t border-border px-4 sm:px-6 py-3 text-center">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to OG Exports
        </Link>
      </footer>
    </div>
  )
}
