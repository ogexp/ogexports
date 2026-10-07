import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, FileBarChart2,
  UserCircle2, Settings, ChevronRight, TrendingUp, LogOut,
  Menu, X, Container, Lock, Wallet, Leaf, Factory, ShieldCheck, BellRing,
  Wheat, LogIn, MessageSquare, Building2
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { ImpersonationBanner } from "@/components/ImpersonationBanner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api, resolveMediaUrl } from "@/lib/api"
import { kycTopBarBadge } from "@/lib/kyc-badge"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { NotificationBellDropdown } from "@/components/portal/NotificationBellDropdown"
import type { LucideIcon } from "lucide-react"

type InvestCategoryKey = "plant" | "feeds" | "ricemill" | "yellowMaize"

type PortalLink = {
  href: string
  label: string
  icon: LucideIcon
  group: string
  badgeKey?: "messages" | "notifications"
  hidden?: boolean
  visibilityKey?: InvestCategoryKey
}

const PORTAL_LINKS: PortalLink[] = [
  { href: "/invest/dashboard",      label: "Dashboard",           icon: LayoutDashboard, group: "main" },
  { href: "/invest/wallet",         label: "Wallet",              icon: Wallet,          group: "main" },
  { href: "/invest/messages",       label: "Messages",            icon: MessageSquare,   group: "main", badgeKey: "messages" as const },
  { href: "/invest/notifications",  label: "Notifications",       icon: BellRing,        group: "main", badgeKey: "notifications" as const },
  { href: "/invest/containers",     label: "Export Containers",   icon: Container,       group: "invest" },
  { href: "/invest/opportunities",  label: "Browse Opportunities",icon: TrendingUp,      group: "invest" },
  { href: "/invest/markets",        label: "Fruits & Veg Markets",icon: Leaf,            group: "invest", hidden: true },
  { href: "/invest/plant",          label: "Processing Plant",    icon: Factory,         group: "invest", visibilityKey: "plant" },
  { href: "/invest/feeds",          label: "Feeds",               icon: Wheat,           group: "invest", visibilityKey: "feeds" },
  { href: "/invest/ricemill",       label: "Rice Mill",           icon: Building2,       group: "invest", visibilityKey: "ricemill" },
  { href: "/invest/domestic-trading",label: "Domestic Trading",   icon: Wheat,           group: "invest", hidden: true },
  { href: "/invest/deposit",        label: "Deposit",             icon: ArrowDownToLine, group: "wallet" },
  { href: "/invest/withdraw",       label: "Withdraw",            icon: ArrowUpFromLine, group: "wallet" },
  { href: "/invest/kyc",            label: "KYC & Documents",     icon: ShieldCheck,     group: "account" },
  { href: "/invest/reports",        label: "Reports",             icon: FileBarChart2,   group: "account" },
  { href: "/invest/profile",        label: "Profile",             icon: UserCircle2,     group: "account" },
  { href: "/invest/settings",       label: "Settings",            icon: Settings,        group: "account" },
]

const GROUP_LABELS: Record<string, string> = {
  main:    "Overview",
  invest:  "Investment Categories",
  wallet:  "Funds",
  account: "Account",
}

interface InvestPortalLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function InvestPortalLayout({ children, title, subtitle }: InvestPortalLayoutProps) {
  const [location, setLocation] = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { displayName, email, isSignedIn, isLoaded, logout, impersonating, stopImpersonating } = useSafeAuth()
  const queryClient = useQueryClient()
  const { investCategoryVisible, refetch: refetchPlatformSettings } = usePlatformSettings()
  const [msgUnread, setMsgUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)

  // Pick up admin currency/display toggles without a hard refresh.
  useEffect(() => {
    void refetchPlatformSettings()
  }, [refetchPlatformSettings])

  const { data: dashPayload, refetch: refetchDash } = useQuery({
    queryKey: ["investor", "dashboard"],
    queryFn: () => api.get<{ data: { kyc_status?: string | null; kyc_approved?: boolean; user?: { avatar_url?: string | null } } }>("/api/investor/dashboard"),
    enabled: !!isSignedIn,
  })
  const kycTopBar = kycTopBarBadge(dashPayload?.data?.kyc_status)

  const refreshInvestorRecords = useCallback(() => {
    for (const queryKey of [
      ["investor", "deposits"],
      ["investor", "withdrawals"],
      ["investor", "positions"],
      ["investor", "notifications"],
      ["investor", "wallet"],
      ["investor-reports"],
      ["investor", "dashboard"],
    ]) {
      void queryClient.invalidateQueries({ queryKey })
    }
    window.dispatchEvent(new Event("og-investor-records-updated"))
  }, [queryClient])

  // Redirect unauthenticated users to sign-in, preserving the intended destination
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation(`/sign-in?redirect=${encodeURIComponent(location)}`)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const onKyc = () => { void refetchDash() }
    const onFocus = () => {
      void refetchDash()
      refreshInvestorRecords()
    }
    window.addEventListener("og-kyc-updated", onKyc)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("og-kyc-updated", onKyc)
      window.removeEventListener("focus", onFocus)
    }
  }, [refetchDash, refreshInvestorRecords])

  const fetchUnread = useCallback(async () => {
    try {
      const [msgRes, annRes, ticketRes, notifRes] = await Promise.all([
        api.get<{ data: { unread_count: number } }>("/api/messages/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/announcements/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/support/tickets/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/investor/notifications/unread-count"),
      ])
      setMsgUnread(
        (msgRes?.data?.unread_count ?? 0) +
        (annRes?.data?.unread_count ?? 0) +
        (ticketRes?.data?.unread_count ?? 0)
      )
      setNotifUnread(notifRes?.data?.unread_count ?? 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!isSignedIn) return
    fetchUnread()
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.count === "number") setMsgUnread(detail.count)
      else fetchUnread()
    }
    window.addEventListener("og-unread-messages", onCustom)
    const onNotif = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.count === "number") setNotifUnread(detail.count)
      else fetchUnread()
    }
    window.addEventListener("og-unread-notifications", onNotif)
    const t = setInterval(() => {
      fetchUnread()
      refreshInvestorRecords()
    }, 30000)
    return () => {
      window.removeEventListener("og-unread-messages", onCustom)
      window.removeEventListener("og-unread-notifications", onNotif)
      clearInterval(t)
    }
  }, [isSignedIn, fetchUnread, refreshInvestorRecords])

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading portal…</p>
        </div>
      </div>
    )
  }

  // Auth wall — shown briefly before redirect fires
  if (!isSignedIn) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold mb-2">Investor Portal</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Please sign in or create an account to access the Investor Portal and manage your trade investments.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={`/sign-in?redirect=${encodeURIComponent(location)}`}>Sign In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-up">Create Account</Link>
            </Button>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to OG Exports
          </Link>
        </div>
      </div>
    )
  }

  const initials = displayName
    ? displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "IN"

  const investAvatar = resolveMediaUrl(dashPayload?.data?.user?.avatar_url || "")

  async function handleLogout() {
    if (impersonating && stopImpersonating) {
      const res = await stopImpersonating()
      setLocation(res.redirect || "/admin/dashboard")
      return
    }
    logout?.()
    setLocation("/sign-in")
  }

  async function handleReturnAdmin() {
    const res = await stopImpersonating?.()
    if (res?.success) setLocation(res.redirect || "/admin/dashboard")
  }

  return (
    <div className="h-[100dvh] bg-background flex overflow-hidden flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="h-12 flex items-center justify-end px-5 border-b border-border shrink-0 lg:hidden">
          <button className="text-foreground/60 hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Investor badge */}
        <div className="px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/8">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
              style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
              {investAvatar ? <img src={investAvatar} alt="avatar" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{displayName || "Investor"}</div>
              <div className="text-xs text-muted-foreground truncate">{email || "investor@ogexports.co"}</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {(["main", "invest", "wallet", "account"] as const).map(group => {
            const links = PORTAL_LINKS.filter(l => {
              if (l.group !== group) return false
              if (l.hidden) return false
              if (l.visibilityKey && !investCategoryVisible[l.visibilityKey]) return false
              return true
            })
            return (
              <div key={group} className="mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pb-2">
                  {GROUP_LABELS[group]}
                </div>
                <div className="space-y-0.5">
                  {links.map(({ href, label, icon: Icon, badgeKey }) => {
                    const isActive = location === href
                    const displayBadge = badgeKey === "messages" && msgUnread > 0
                      ? msgUnread
                      : badgeKey === "notifications" && notifUnread > 0
                        ? notifUnread
                        : null
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          isActive
              ? "bg-primary/10 text-primary border border-primary/10"
                            : "text-foreground/70 hover:text-foreground hover:bg-foreground/6"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{label}</span>
                        {displayBadge && !isActive && (
                          <Badge className="ml-auto bg-accent/20 text-accent text-[10px] h-4 px-1.5 border-0">{displayBadge}</Badge>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70 shrink-0" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Bottom actions — Back to Site + logout */}
        <div className="px-3 py-3 border-t border-border shrink-0 space-y-2">
          {impersonating && (
            <button
              type="button"
              onClick={handleReturnAdmin}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #0F3D2E, #14503C)" }}
            >
              <LogIn className="w-4 h-4" /> Return to Admin Panel
            </button>
          )}
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/6 transition-all">
            <TrendingUp className="w-4 h-4" />
            Back to Site
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-foreground/[0.04] border border-border/60">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
              style={{ background: "linear-gradient(135deg, #D4A012, #8a6000)", color: "white" }}
            >
              {investAvatar ? <img src={investAvatar} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{displayName || "Investor"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{email || ""}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="relative z-20 h-20 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-foreground/8 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-heading font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBellDropdown
              apiBase="/api/investor/notifications"
              listHref="/invest/notifications"
              extraUnread={msgUnread}
            />
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${kycTopBar.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kycTopBar.dotClassName}${kycTopBar.approved ? " animate-pulse" : ""}`} />
              {kycTopBar.label}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/invest/opportunities">View Opportunities</Link>
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      </div>
    </div>
  )
}
