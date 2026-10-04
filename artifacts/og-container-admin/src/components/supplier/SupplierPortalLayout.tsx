import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, PlusCircle, ClipboardList, MessageSquare,
  UserCircle2, Settings, ChevronRight, LogOut, Menu, X,
  Lock, Building2, Package, BookOpen, LogIn, BellRing
} from "lucide-react"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { ImpersonationBanner } from "@/components/ImpersonationBanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { kycTopBarBadge } from "@/lib/kyc-badge"
import { NotificationBellDropdown } from "@/components/portal/NotificationBellDropdown"

const SUPPLIER_LINKS = [
  { href: "/supplier/dashboard",     label: "Dashboard",         icon: LayoutDashboard, group: "main" },
  { href: "/supplier/messages",      label: "Messages",          icon: MessageSquare,   group: "main", badgeKey: "messages" as const },
  { href: "/supplier/notifications", label: "Notifications",     icon: BellRing,        group: "main", badgeKey: "notifications" as const },
  { href: "/supplier/procedure",     label: "How It Works",      icon: BookOpen,        group: "main" },
  { href: "/supplier/submit-offer",  label: "Submit New Offer",  icon: PlusCircle,      group: "offers" },
  { href: "/supplier/my-offers",     label: "My Offers",         icon: ClipboardList,   group: "offers" },
  { href: "/supplier/profile",       label: "Company Profile",   icon: Building2,       group: "account" },
  { href: "/supplier/settings",      label: "Settings",          icon: Settings,        group: "account" },
]

const GROUP_LABELS: Record<string, string> = {
  main:    "Overview",
  offers:  "Product Offers",
  account: "Account",
}

const GROUP_ORDER = ["main", "offers", "account"]

interface Props { children: React.ReactNode; title: string; subtitle?: string }

export function SupplierPortalLayout({ children, title, subtitle }: Props) {
  const [location, setLocation] = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { displayName, email, isSignedIn, isLoaded, logout, impersonating, stopImpersonating } = useSafeAuth()
  const [msgUnread, setMsgUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    try { return localStorage.getItem("og-avatar-supplier") || "" } catch { return "" }
  })

  const { data: dashPayload, refetch: refetchDash } = useQuery({
    queryKey: ["supplier", "dashboard"],
    queryFn: () => api.get<{
      data: {
        kyc_status?: string | null
        kyc_approved?: boolean
        supplier?: { kyc_status?: string | null }
      }
    }>("/api/supplier/dashboard"),
    enabled: !!isSignedIn,
  })
  const kycTopBar = kycTopBarBadge(
    dashPayload?.data?.kyc_status ?? dashPayload?.data?.supplier?.kyc_status,
  )

  useEffect(() => { setSidebarOpen(false) }, [location])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation(`/sign-in?redirect=${encodeURIComponent(location)}`)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const onKyc = () => { void refetchDash() }
    const onFocus = () => { void refetchDash() }
    window.addEventListener("og-kyc-updated", onKyc)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("og-kyc-updated", onKyc)
      window.removeEventListener("focus", onFocus)
    }
  }, [refetchDash])

  useEffect(() => {
    const onStorage = () => setAvatarUrl(localStorage.getItem("og-avatar-supplier") || "")
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const [msgRes, annRes, ticketRes, notifRes] = await Promise.all([
        api.get<{ data: { unread_count: number } }>("/api/messages/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/announcements/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/support/tickets/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/notifications/unread-count"),
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
    const onNotif = () => { fetchUnread() }
    window.addEventListener("og-unread-notifications", onNotif)
    const t = setInterval(fetchUnread, 30000)
    return () => {
      window.removeEventListener("og-unread-messages", onCustom)
      window.removeEventListener("og-unread-notifications", onNotif)
      clearInterval(t)
    }
  }, [isSignedIn, fetchUnread])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading portal…</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "hsl(var(--primary) / 0.12)" }}>
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold mb-2">Supplier Portal</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Please sign in or create an account to access the Supplier Portal.
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
    : "SP"

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

  const sidebarKycLabel = kycTopBar.approved
    ? "Verified Supplier"
    : kycTopBar.label === "Under Review"
      ? "KYC Under Review"
      : kycTopBar.label === "KYC Rejected"
        ? "KYC Rejected"
        : "KYC Unverified"
  const sidebarDotColor = kycTopBar.approved
    ? "#4CAF50"
    : kycTopBar.label === "Under Review"
      ? "#F59E0B"
      : "#EF4444"
  const sidebarBadgeClass = kycTopBar.approved
    ? "bg-emerald-700/10 border-emerald-700/20 text-emerald-700"
    : kycTopBar.label === "Under Review"
      ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
      : "bg-red-500/10 border-red-500/30 text-red-600"

  const SidebarContent = () => (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0">
      {/* User badge */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0F3D2E, #2d7a4f)" }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{displayName ?? "Supplier"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{email ?? ""}</p>
          </div>
          <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </div>
        {/* KYC status badge */}
        <div className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md border ${sidebarBadgeClass}`}>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: sidebarDotColor, boxShadow: `0 0 6px ${sidebarDotColor}` }}
          />
          <span className="text-[10px] font-medium">{sidebarKycLabel}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {GROUP_ORDER.map(group => {
          const links = SUPPLIER_LINKS.filter(l => l.group === group)
          return (
            <div key={group} className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pb-2">
                {GROUP_LABELS[group]}
              </div>
              <div className="space-y-0.5">
                {links.map(({ href, label, icon: Icon, badgeKey }) => {
                  const isActive = location === href || location.startsWith(href + "/")
                  const displayBadge = badgeKey === "messages" && msgUnread > 0 ? msgUnread
                    : badgeKey === "notifications" && notifUnread > 0 ? notifUnread
                    : null
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/6"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {displayBadge && !isActive && (
                        <Badge className="ml-auto text-[10px] h-4 px-1.5 border-0" style={{ background: "hsl(var(--accent) / 0.2)", color: "hsl(var(--accent))" }}>
                          {displayBadge}
                        </Badge>
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

      {/* Bottom — Back to Site + logout */}
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
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/6 transition-all"
        >
          <Building2 className="w-4 h-4 shrink-0" />
          Back to Site
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-foreground/[0.04] border border-border/60">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #D4A012, #8a6000)" }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{displayName ?? "Supplier"}</div>
            <div className="text-[10px] text-muted-foreground truncate">{email ?? ""}</div>
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
  )

  return (
    <div className="h-screen bg-background flex overflow-hidden flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        "fixed top-0 left-0 z-50 h-full transition-transform duration-300 lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="relative h-full">
          <button
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/8 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
          <SidebarContent />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="relative z-20 h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-foreground/8 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-heading font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBellDropdown
              apiBase="/api/notifications"
              listHref="/supplier/notifications"
              extraUnread={msgUnread}
            />
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${kycTopBar.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kycTopBar.dotClassName}${kycTopBar.approved ? " animate-pulse" : ""}`} />
              {kycTopBar.label}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/supplier/submit-offer">+ Submit Offer</Link>
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
