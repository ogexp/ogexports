import { lazy, Suspense, useState } from "react"
import { useLocation } from "wouter"
import { useGetMe, useGetKycStatus } from "@workspace/api-client-react"
import { AccountTypeStep } from "@/components/account/AccountTypeStep"
import { IndividualKycForm } from "@/components/account/IndividualKycForm"
import { CompanyKycForm } from "@/components/account/CompanyKycForm"
import { KycStatusCard } from "@/components/account/KycStatusCard"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { PortalNav } from "@/components/portal/PortalNav"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { Card } from "@/components/ui/card"
import { KycStatusDot } from "@/components/account/KycStatusDot"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, LayoutDashboard, CircleDollarSign, ArrowUpRight, BarChart2, UserCog, SlidersHorizontal, ChevronRight } from "lucide-react"
import { Link } from "wouter"

const DashboardTab = lazy(() => import("@/components/portal/tabs/DashboardTab").then(m => ({ default: m.DashboardTab })))
const AnalyticsTab = lazy(() => import("@/components/portal/tabs/AnalyticsTab").then(m => ({ default: m.AnalyticsTab })))
const SupplierOffersTab = lazy(() => import("@/components/portal/tabs/SupplierOffersTab").then(m => ({ default: m.SupplierOffersTab })))
const RfqsTab = lazy(() => import("@/components/portal/tabs/RfqsTab").then(m => ({ default: m.RfqsTab })))
const OrdersTab = lazy(() => import("@/components/portal/tabs/OrdersTab").then(m => ({ default: m.OrdersTab })))
const ContractsTab = lazy(() => import("@/components/portal/tabs/ContractsTab").then(m => ({ default: m.ContractsTab })))
const InvoicesTab = lazy(() => import("@/components/portal/tabs/InvoicesTab").then(m => ({ default: m.InvoicesTab })))
const ShipmentsTab = lazy(() => import("@/components/portal/tabs/ShipmentsTab").then(m => ({ default: m.ShipmentsTab })))
const PortfolioTab = lazy(() => import("@/components/portal/tabs/PortfolioTab").then(m => ({ default: m.PortfolioTab })))
const WalletTab = lazy(() => import("@/components/portal/tabs/WalletTab").then(m => ({ default: m.WalletTab })))
const DepositTab = lazy(() => import("@/components/portal/tabs/DepositTab").then(m => ({ default: m.DepositTab })))
const WithdrawalTab = lazy(() => import("@/components/portal/tabs/WithdrawalTab").then(m => ({ default: m.WithdrawalTab })))
const FinancialHistoryTab = lazy(() => import("@/components/portal/tabs/FinancialHistoryTab").then(m => ({ default: m.FinancialHistoryTab })))
const ProfileTab = lazy(() => import("@/components/portal/tabs/ProfileTab").then(m => ({ default: m.ProfileTab })))
const SupportTab = lazy(() => import("@/components/portal/tabs/SupportTab").then(m => ({ default: m.SupportTab })))
const NotificationsTab = lazy(() => import("@/components/portal/tabs/NotificationsTab").then(m => ({ default: m.NotificationsTab })))

function TabLoader() {
  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Loading tab">
      <Spinner className="h-6 w-6" />
    </div>
  )
}

function LazyTab({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<TabLoader />}>{children}</Suspense>
}

const INVESTOR_TABS = ["overview", "portfolio", "wallet", "deposit", "withdrawal", "financial", "profile", "support", "notifications"]
const BUYER_TABS    = ["overview", "analytics", "rfqs", "orders", "contracts", "invoices", "shipments", "profile", "support", "notifications"]
// Suppliers see only their own offers — buyer info, orders, contracts are confidential
const SUPPLIER_TABS = ["overview", "my-offers", "profile", "support", "notifications"]
const ADMIN_TABS    = ["overview", "profile", "support", "notifications"]

export default function Account() {
  const [pathname, setLocation] = useLocation()
  const [forceRetry, setForceRetry] = useState(false)
  const [kycBannerOpen, setKycBannerOpen] = useState(true)
  const { data: me, isLoading: meLoading, refetch: refetchMe } = useGetMe()
  const { data: kyc, isLoading: kycLoading, refetch: refetchKyc } = useGetKycStatus({
    query: { enabled: !!me?.accountType && me.accountType !== "admin", queryKey: ["kyc-status"] },
  })

  const { supplierModuleEnabled } = usePlatformSettings()
  const isInvestor = me?.accountType === "investor"
  const isSupplier  = supplierModuleEnabled && me?.accountType === "supplier"
  const isAdmin     = me?.accountType === "admin"

  const validTabs = isInvestor ? INVESTOR_TABS
    : isSupplier ? SUPPLIER_TABS
    : isAdmin ? ADMIN_TABS
    : BUYER_TABS
  const defaultTab = "overview"

  const pathSegment = pathname.split("/").pop() || ""
  const activeTab = validTabs.includes(pathSegment) ? pathSegment : defaultTab

  if (meLoading || (me?.accountType && me.accountType !== "admin" && kycLoading)) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Spinner className="w-6 h-6" />
      </div>
    )
  }

  if (!me) return null

  // Admins skip KYC / entity onboarding — go straight to account portal
  if (me.accountType !== "admin" && (!me.accountType || !me.entityType)) {
    return (
      <div className="container px-4 md:px-6 py-16 md:py-24">
        <AccountTypeStep onDone={() => void refetchMe()} />
      </div>
    )
  }

  const isVerified = me.kycStatus === "verified"
  const showForm = me.kycStatus === "unsubmitted" || (me.kycStatus === "rejected" && forceRetry)
  const kycMessage =
    me.kycStatus === "unsubmitted" ? "Step 1 of 2: Submit documents" :
    me.kycStatus === "pending"     ? "Under review — 2–5 business days" :
    me.kycStatus === "rejected"    ? "Action needed — resubmit documents" : "Verified"

  return (
    <div className="container px-4 md:px-6 py-10 md:py-16 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-heading font-bold capitalize">{me.accountType} Portal</h1>
          <p className="text-sm text-muted-foreground">Manage your trades, shipments, and payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <KycStatusDot status={me.kycStatus} />
          <span className="text-xs text-muted-foreground hidden sm:block capitalize">{me.kycStatus}</span>
        </div>
      </div>

      {/* Investment Portal quick-access card — investor only */}
      {isInvestor && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Investment Portal</span>
            </div>
            <Link href="/invest/dashboard">
              <button className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                Open full portal <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { href: "/invest/dashboard", label: "Dashboard",   Icon: LayoutDashboard,   color: "text-primary" },
              { href: "/invest/deposit",   label: "Deposit",     Icon: CircleDollarSign,   color: "text-emerald-600" },
              { href: "/invest/withdraw",  label: "Withdraw",    Icon: ArrowUpRight,        color: "text-amber-600" },
              { href: "/invest/reports",   label: "Reports",     Icon: BarChart2,           color: "text-blue-600" },
              { href: "/invest/profile",   label: "Inv. Profile", Icon: UserCog,            color: "text-violet-600" },
              { href: "/invest/settings",  label: "Settings",    Icon: SlidersHorizontal,  color: "text-muted-foreground" },
            ].map(({ href, label, Icon, color }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border/50 bg-background hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
                  <Icon className={`w-5 h-5 ${color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[11px] font-medium text-center leading-tight text-foreground/80">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Admin Panel quick-access card */}
      {isAdmin && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-600">Admin Panel</span>
            </div>
            <Link href="/admin/dashboard">
              <button className="flex items-center gap-1 text-xs text-red-600 hover:underline font-medium">
                Open admin dashboard <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* KYC Banner — skip for admins */}
      {!isVerified && !isAdmin && (
        <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <div
            className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-colors"
            onClick={() => setKycBannerOpen(!kycBannerOpen)}
          >
            <div className="flex items-center gap-3">
              <KycStatusDot status={me.kycStatus} />
              <div className="font-semibold text-sm">Complete KYC Verification</div>
              <div className="text-xs text-muted-foreground hidden sm:block">· {kycMessage}</div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              {kycBannerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {kycBannerOpen && (
            <div className="px-5 pb-5 border-t border-amber-500/10 pt-5">
              {showForm ? (
                me.entityType === "individual" ? (
                  <IndividualKycForm retry={forceRetry} />
                ) : (
                  <CompanyKycForm retry={forceRetry} />
                )
              ) : (
                <KycStatusCard
                  me={me}
                  latestSubmission={kyc?.latestSubmission ?? null}
                  onRetry={
                    me.kycStatus === "rejected"
                      ? () => { setForceRetry(true); void refetchKyc() }
                      : undefined
                  }
                />
              )}
            </div>
          )}
        </Card>
      )}

      {/* Main portal tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setLocation(`/account/${val}`)}
        className="w-full"
      >
        <PortalNav />

        <div className="mt-6">
          {/* Shared: overview dashboard */}
          <TabsContent value="overview" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <LazyTab><DashboardTab /></LazyTab>
          </TabsContent>

          {/* Investor tabs */}
          {isInvestor && (
            <>
              <TabsContent value="portfolio" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><PortfolioTab /></LazyTab>
              </TabsContent>
              <TabsContent value="wallet" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><WalletTab /></LazyTab>
              </TabsContent>
              <TabsContent value="deposit" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><DepositTab /></LazyTab>
              </TabsContent>
              <TabsContent value="withdrawal" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><WithdrawalTab /></LazyTab>
              </TabsContent>
              <TabsContent value="financial" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><FinancialHistoryTab /></LazyTab>
              </TabsContent>
            </>
          )}

          {/* Buyer-only tabs (not shown to suppliers or admins) */}
          {!isInvestor && !isSupplier && !isAdmin && (
            <>
              <TabsContent value="analytics" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><AnalyticsTab /></LazyTab>
              </TabsContent>
              <TabsContent value="rfqs" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><RfqsTab /></LazyTab>
              </TabsContent>
              <TabsContent value="orders" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><OrdersTab /></LazyTab>
              </TabsContent>
              <TabsContent value="contracts" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><ContractsTab /></LazyTab>
              </TabsContent>
              <TabsContent value="invoices" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><InvoicesTab /></LazyTab>
              </TabsContent>
              <TabsContent value="shipments" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <LazyTab><ShipmentsTab /></LazyTab>
              </TabsContent>
            </>
          )}

          {/* Supplier-only: restricted offer status view (no buyer info) */}
          {isSupplier && (
            <TabsContent value="my-offers" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <LazyTab><SupplierOffersTab /></LazyTab>
            </TabsContent>
          )}

          {/* Shared tabs */}
          <TabsContent value="profile" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <LazyTab><ProfileTab /></LazyTab>
          </TabsContent>
          <TabsContent value="support" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <LazyTab><SupportTab /></LazyTab>
          </TabsContent>
          <TabsContent value="notifications" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <LazyTab><NotificationsTab /></LazyTab>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
