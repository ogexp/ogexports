import * as React from "react"
import { useLocation, Link } from "wouter"
import { cn } from "@/lib/utils"
import { Menu, X, UserCircle2, LogOut, Settings, User, LayoutDashboard, CircleDollarSign, ArrowUpRight, BarChart2, UserCog, SlidersHorizontal, Shield, Users, ShoppingCart, Package, Truck, FileText, Tag, MessageSquare, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { KycStatusDot } from "@/components/account/KycStatusDot"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export function Navbar() {
  const [location, setLocation] = useLocation()
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { isSignedIn, displayName, email, accountType, logout, impersonating, stopImpersonating } = useSafeAuth()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const { t } = useTranslation()

  // Only fetch from API when using Clerk (no displayName means Clerk mode)
  const isLocalAuth = !!displayName || displayName === null && !!logout
  const { data: me } = useGetMe({
    query: { enabled: !!isSignedIn && !logout, queryKey: getGetMeQueryKey() },
  })

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  React.useEffect(() => { setMobileMenuOpen(false) }, [location])

  async function handleSignOut() {
    if (impersonating && stopImpersonating) {
      const res = await stopImpersonating()
      setLocation(res.redirect || "/admin/dashboard")
      return
    }
    if (logout) {
      logout()
      setLocation("/")
    }
  }

  // User display for local auth
  const userInitials = displayName ? getInitials(displayName) : null
  const userLabel = displayName || email || t('navbar.myAccount')

  const NAV_LINKS = [
    { href: "/", label: t('nav.home') },
    { href: "/products", label: t('nav.products') },
    { href: "/invest", label: t('nav.investment'), investorOnly: true },
    { href: "/news", label: "World News" },
    { href: "/invest/dashboard",    label: t('nav.portal'),   portal: true,         roleMatch: "investor" },
    { href: "/buyer/dashboard",     label: "Buyer Portal",    buyerPortal: true,    roleMatch: "buyer" },
    { href: "/supplier/dashboard",  label: "Supplier Portal", supplierPortal: true, roleMatch: "supplier" },
    { href: "/admin/dashboard",     label: "Admin Panel",     adminPortal: true,    roleMatch: "admin" },
    { href: "/company-profile", label: t('nav.company') },
    { href: "/about", label: t('nav.about') },
    { href: "/contact", label: t('nav.contact') },
  ]

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-background/92 backdrop-blur-xl border-b shadow-sm"
          : "bg-transparent border-b border-transparent"
      )}
      style={isScrolled ? { borderBottomColor: "hsl(var(--border))", boxShadow: "0 1px 0 0 hsl(var(--accent) / 0.12), 0 4px 16px -4px hsl(0 0% 0% / 0.12)" } : {}}
    >
      <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <img
            src={`${import.meta.env.BASE_URL}og-logo.png`}
            alt="OG Exports"
            className="h-20 w-auto object-contain transition-all duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] group-hover:drop-shadow-[0_0_14px_hsl(43_88%_52%_/_0.45)]"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const l = link as any
            const isActive = location === link.href
              || (l.portal        && location.startsWith("/invest/"))
              || (l.buyerPortal   && location.startsWith("/buyer/"))
              || (l.supplierPortal&& location.startsWith("/supplier/"))
              || (l.adminPortal   && location.startsWith("/admin/"))

            // Role-gated portal tabs: only show when signed in AND on that portal's routes
            if (l.investorOnly)   { if (!investmentModuleEnabled || !isSignedIn || accountType !== "investor") return null }
            if (l.portal)         { if (!investmentModuleEnabled || !isSignedIn || !location.startsWith("/invest/"))    return null }
            if (l.buyerPortal)    { if (!isSignedIn || !location.startsWith("/buyer/"))     return null }
            if (l.supplierPortal) {
              if (!supplierModuleEnabled || !isSignedIn || !location.startsWith("/supplier/")) return null
            }
            if (l.adminPortal)    { if (!isSignedIn || !location.startsWith("/admin/"))    return null }

            if (l.portal || l.buyerPortal || l.supplierPortal || l.adminPortal) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-semibold transition-all duration-200 rounded-md border flex items-center gap-1.5",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-primary border-primary/30 bg-primary/8 hover:bg-primary/15 hover:border-primary/50"
                  )}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              )
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-md",
                  isActive
                    ? "text-accent"
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-accent"
                    style={{ boxShadow: "0 0 8px hsl(43 88% 52% / 0.7)" }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Language switcher */}
          <LanguageSwitcher />

          {isSignedIn ? (
            logout ? (
              /* ── Local auth user dropdown ── */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-accent/50 transition-all duration-200 focus:outline-none"
                    data-testid="link-account"
                  >
                    {userInitials ? (
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}
                      >
                        {userInitials}
                      </div>
                    ) : (
                      <UserCircle2 className="w-5 h-5 text-foreground/70" />
                    )}
                    <span className="text-sm font-medium text-foreground/80 max-w-[120px] truncate">
                      {displayName || t('navbar.account')}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="font-semibold text-foreground truncate">{displayName}</div>
                    <div className="text-xs text-muted-foreground font-normal truncate mt-0.5">{email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* ── Admin Panel ── */}
                  {accountType === "admin" && (<>
                    <div className="px-2 pt-1 pb-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-red-600/70 px-1 mb-1">Admin Panel</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="flex items-center gap-2 cursor-pointer font-medium text-red-600 dark:text-red-400">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="flex items-center gap-2 cursor-pointer">
                        <Users className="w-4 h-4 text-blue-600" /> Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/finance" className="flex items-center gap-2 cursor-pointer">
                        <CircleDollarSign className="w-4 h-4 text-emerald-600" /> Finance
                      </Link>
                    </DropdownMenuItem>
                    {investmentModuleEnabled && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/investments" className="flex items-center gap-2 cursor-pointer">
                        <BarChart2 className="w-4 h-4 text-violet-600" /> Investments
                      </Link>
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 text-muted-foreground" /> Settings
                      </Link>
                    </DropdownMenuItem>
                  </>)}

                  {/* ── Buyer Portal ── */}
                  {accountType === "buyer" && (<>
                    <div className="px-2 pt-1 pb-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600/70 px-1 mb-1">Buyer Portal</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/buyer/dashboard" className="flex items-center gap-2 cursor-pointer font-medium text-amber-600">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/buyer/orders" className="flex items-center gap-2 cursor-pointer">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" /> My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/buyer/rfq" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4 text-blue-600" /> RFQ
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/buyer/shipments" className="flex items-center gap-2 cursor-pointer">
                        <Truck className="w-4 h-4 text-violet-600" /> Shipments
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/buyer/settings" className="flex items-center gap-2 cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 text-muted-foreground" /> Settings
                      </Link>
                    </DropdownMenuItem>
                  </>)}

                  {/* ── Supplier Portal ── */}
                  {supplierModuleEnabled && accountType === "supplier" && (<>
                    <div className="px-2 pt-1 pb-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600/70 px-1 mb-1">Supplier Portal</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/supplier/dashboard" className="flex items-center gap-2 cursor-pointer font-medium text-blue-600">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/supplier/my-offers" className="flex items-center gap-2 cursor-pointer">
                        <Tag className="w-4 h-4 text-emerald-600" /> My Offers
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/supplier/submit-offer" className="flex items-center gap-2 cursor-pointer">
                        <Package className="w-4 h-4 text-amber-600" /> Submit Offer
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/supplier/messages" className="flex items-center gap-2 cursor-pointer">
                        <MessageSquare className="w-4 h-4 text-blue-600" /> Messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/supplier/settings" className="flex items-center gap-2 cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 text-muted-foreground" /> Settings
                      </Link>
                    </DropdownMenuItem>
                  </>)}

                  {/* ── Investment Portal (investor or unknown) ── */}
                  {investmentModuleEnabled && (accountType === "investor" || !accountType) && (<>
                    <div className="px-2 pt-1 pb-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 px-1 mb-1">{t('navbar.investmentPortal')}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/dashboard" className="flex items-center gap-2 cursor-pointer font-medium text-primary">
                        <LayoutDashboard className="w-4 h-4" /> {t('navbar.dashboard')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/messages" className="flex items-center gap-2 cursor-pointer">
                        <MessageSquare className="w-4 h-4 text-blue-600" /> Messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/deposit" className="flex items-center gap-2 cursor-pointer">
                        <CircleDollarSign className="w-4 h-4 text-emerald-600" /> {t('navbar.deposit')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/withdraw" className="flex items-center gap-2 cursor-pointer">
                        <ArrowUpRight className="w-4 h-4 text-amber-600" /> {t('navbar.withdraw')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/reports" className="flex items-center gap-2 cursor-pointer">
                        <BarChart2 className="w-4 h-4 text-blue-600" /> {t('navbar.reports')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/profile" className="flex items-center gap-2 cursor-pointer">
                        <UserCog className="w-4 h-4 text-violet-600" /> {t('navbar.investorProfile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invest/settings" className="flex items-center gap-2 cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 text-muted-foreground" /> {t('navbar.portalSettings')}
                      </Link>
                    </DropdownMenuItem>
                  </>)}

                  <DropdownMenuSeparator />

                  {/* Account group */}
                  <div className="px-2 pt-1 pb-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-1 mb-1">{t('navbar.account')}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" /> {t('navbar.myAccount')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" /> {t('navbar.profileSettings')}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/8 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* ── Clerk user icon ── */
              <Link href="/account" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('navbar.myAccount')}
                  data-testid="link-account"
                  className="hover:text-accent hover:bg-foreground/8"
                >
                  <UserCircle2 className="w-5 h-5" />
                </Button>
                {me && (
                  <div className="absolute -top-1 -right-1">
                    <KycStatusDot status={me.kycStatus} />
                  </div>
                )}
              </Link>
            )
          ) : (
            /* ── Guest buttons ── */
            <div className="flex items-center gap-2.5 ml-1">
              <Link href="/sign-in">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="link-sign-in"
                  className="h-9 px-5 text-xs font-semibold tracking-wide border-primary/25 text-primary/75 hover:border-primary/55 hover:text-primary hover:bg-primary/6"
                >
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  variant="accent"
                  size="sm"
                  data-testid="link-sign-up"
                  className="h-9 px-5 text-xs font-semibold tracking-wide"
                >
                  {t('nav.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="lg:hidden flex items-center gap-1">
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:text-accent hover:bg-foreground/8 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Gold separator line when scrolled */}
      {isScrolled && (
        <div
          className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, hsl(43 88% 52% / 0.25) 30%, hsl(43 88% 52% / 0.25) 70%, transparent)" }}
        />
      )}

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-20 inset-x-0 bg-background/97 backdrop-blur-xl border-b shadow-xl animate-in slide-in-from-top-4 max-h-[80vh] overflow-y-auto"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, hsl(43 88% 52% / 0.5) 50%, transparent)" }} />
          <div className="container mx-auto px-4 py-5 flex flex-col gap-1">
            {NAV_LINKS.map(link => {
              const l = link as any
              const isActive = location === link.href
                || (l.portal        && location.startsWith("/invest/"))
                || (l.buyerPortal   && location.startsWith("/buyer/"))
                || (l.supplierPortal&& location.startsWith("/supplier/"))
                || (l.adminPortal   && location.startsWith("/admin/"))

              if (l.investorOnly)   { if (!investmentModuleEnabled || !isSignedIn || accountType !== "investor") return null }
              if (l.portal)         { if (!investmentModuleEnabled || !isSignedIn || !location.startsWith("/invest/"))    return null }
              if (l.buyerPortal)    { if (!isSignedIn || !location.startsWith("/buyer/"))     return null }
              if (l.supplierPortal) {
                if (!supplierModuleEnabled || !isSignedIn || !location.startsWith("/supplier/")) return null
              }
              if (l.adminPortal)    { if (!isSignedIn || !location.startsWith("/admin/"))    return null }

              if (l.portal || l.buyerPortal || l.supplierPortal || l.adminPortal) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-primary border-primary/30 bg-primary/8 hover:bg-primary/15"
                    )}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {link.label}
                  </Link>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent/12 text-accent border border-accent/25"
                      : "text-foreground/70 hover:bg-foreground/6 hover:text-foreground border border-transparent"
                  )}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent mr-3 flex-shrink-0" style={{ boxShadow: "0 0 6px hsl(43 88% 52% / 0.8)" }} />}
                  {link.label}
                </Link>
              )
            })}

            <div className="border-t mt-3 pt-4 flex flex-col gap-2.5" style={{ borderColor: "hsl(var(--border))" }}>
              {isSignedIn ? (
                <>
                  {displayName && (
                    <div className="flex items-center gap-3 px-2 py-2 mb-1">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}
                      >
                        {getInitials(displayName)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{displayName}</div>
                        <div className="text-xs text-muted-foreground">{email}</div>
                      </div>
                    </div>
                  )}
                  {/* Role-specific portal quick links */}
                  {(() => {
                    type PortalLink = { href: string; label: string; Icon: React.ElementType }
                    let title = ""
                    let links: PortalLink[] = []
                    let colorClass = "text-primary"
                    let borderClass = "border-primary/20 bg-primary/5"

                    if (accountType === "admin") {
                      title = "Admin Panel"
                      colorClass = "text-red-600"
                      borderClass = "border-red-200/40 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/20"
                      links = [
                        { href: "/admin/dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
                        { href: "/admin/users",        label: "Users",        Icon: Users },
                        { href: "/admin/finance",      label: "Finance",      Icon: CircleDollarSign },
                        ...(investmentModuleEnabled
                          ? [{ href: "/admin/investments", label: "Investments", Icon: BarChart2 }]
                          : []),
                        { href: "/admin/orders",       label: "Orders",       Icon: ClipboardList },
                        { href: "/admin/settings",     label: "Settings",     Icon: SlidersHorizontal },
                      ]
                    } else if (accountType === "buyer") {
                      title = "Buyer Portal"
                      colorClass = "text-amber-600"
                      borderClass = "border-amber-200/40 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/20"
                      links = [
                        { href: "/buyer/dashboard",  label: "Dashboard", Icon: LayoutDashboard },
                        { href: "/buyer/orders",     label: "Orders",    Icon: ShoppingCart },
                        { href: "/buyer/rfq",        label: "RFQ",       Icon: FileText },
                        { href: "/buyer/shipments",  label: "Shipments", Icon: Truck },
                        { href: "/buyer/payments",   label: "Payments",  Icon: CircleDollarSign },
                        { href: "/buyer/settings",   label: "Settings",  Icon: SlidersHorizontal },
                      ]
                    } else if (supplierModuleEnabled && accountType === "supplier") {
                      title = "Supplier Portal"
                      colorClass = "text-blue-600"
                      borderClass = "border-blue-200/40 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/20"
                      links = [
                        { href: "/supplier/dashboard",     label: "Dashboard",    Icon: LayoutDashboard },
                        { href: "/supplier/my-offers",     label: "My Offers",    Icon: Tag },
                        { href: "/supplier/submit-offer",  label: "Submit Offer", Icon: Package },
                        { href: "/supplier/messages",      label: "Messages",     Icon: MessageSquare },
                        { href: "/supplier/profile",       label: "Profile",      Icon: UserCog },
                        { href: "/supplier/settings",      label: "Settings",     Icon: SlidersHorizontal },
                      ]
                    } else if (accountType === "supplier" && !supplierModuleEnabled) {
                      title = ""
                      colorClass = ""
                      borderClass = ""
                      links = []
                    } else if (accountType === "investor" && !investmentModuleEnabled) {
                      title = ""
                      colorClass = ""
                      borderClass = ""
                      links = []
                    } else {
                      title = t('navbar.investmentPortal')
                      links = [
                        { href: "/invest/dashboard", label: t('navbar.dashboard'),  Icon: LayoutDashboard },
                        { href: "/invest/messages",  label: "Messages",             Icon: MessageSquare },
                        { href: "/invest/deposit",   label: t('navbar.deposit'),    Icon: CircleDollarSign },
                        { href: "/invest/withdraw",  label: t('navbar.withdraw'),   Icon: ArrowUpRight },
                        { href: "/invest/reports",   label: t('navbar.reports'),    Icon: BarChart2 },
                        { href: "/invest/profile",   label: t('navbar.invProfile'), Icon: UserCog },
                        { href: "/invest/settings",  label: t('navbar.settings'),   Icon: SlidersHorizontal },
                      ]
                    }

                    return (
                      <div className={`rounded-xl border p-3 space-y-1.5 ${borderClass}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-widest px-1 ${colorClass} opacity-70`}>{title}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {links.map(({ href, label, Icon }) => (
                            <Link key={href} href={href}>
                              <button className={`flex items-center gap-1.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-black/5 transition-colors ${colorClass}`}>
                                <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                              </button>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  <Link href="/account">
                    <Button variant="outline" className="w-full gap-2 border-foreground/20 hover:border-accent/40 hover:text-accent">
                      <UserCircle2 className="w-4 h-4" /> {t('navbar.myAccount')}
                    </Button>
                  </Link>
                  <Link href="/account/profile">
                    <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-foreground">
                      <Settings className="w-4 h-4" /> {t('navbar.profileSettings')}
                    </Button>
                  </Link>
                  {logout && (
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="w-full gap-2 text-red-400 hover:text-red-400 hover:bg-red-500/8"
                    >
                      <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Link href="/sign-in">
                    <Button variant="outline" className="w-full border-foreground/20 hover:border-accent/40 hover:text-accent">{t('nav.login')}</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-[0_2px_12px_hsl(43_88%_52%_/_0.3)]">{t('nav.register')}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
