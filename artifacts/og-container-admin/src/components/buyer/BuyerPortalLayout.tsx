import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Building2, Package, FileText, ClipboardList,
  ShoppingCart, Ship, FolderOpen, CreditCard, RefreshCw, BarChart3,
  MessageSquare, Settings, ChevronRight, LogOut, Menu, X,
  Globe, ShoppingBag, UserCircle2, LogIn, BellRing
} from "lucide-react"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { ImpersonationBanner } from "@/components/ImpersonationBanner"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/hooks/useCart"
import { api, resolveMediaUrl } from "@/lib/api"
import { kycTopBarBadge } from "@/lib/kyc-badge"
import { NotificationBellDropdown } from "@/components/portal/NotificationBellDropdown"

const BUYER_LINKS = [
  { href: "/buyer/dashboard",      label: "Executive Dashboard",   icon: LayoutDashboard, group: "main"     },
  { href: "/buyer/analytics",      label: "Analytics",             icon: BarChart3,       group: "main"     },
  { href: "/buyer/messages",       label: "Messages",              icon: MessageSquare,   group: "main", badgeKey: "messages" as const },
  { href: "/buyer/notifications",  label: "Notifications",         icon: BellRing,        group: "main", badgeKey: "notifications" as const },
  { href: "/buyer/profile",        label: "My Profile",            icon: UserCircle2,     group: "account"  },
  { href: "/buyer/company",        label: "Company Profile",       icon: Building2,       group: "account"  },
  { href: "/buyer/settings",       label: "Security & Settings",   icon: Settings,        group: "account"  },
  { href: "/buyer/catalogue",      label: "Product Catalogue",     icon: Package,         group: "trade"    },
  { href: "/buyer/cart",           label: "My Cart",               icon: ShoppingBag,     group: "trade", cartBadge: true },
  { href: "/buyer/rfq",            label: "Request for Quotation", icon: ClipboardList,   group: "trade"    },
  { href: "/buyer/quotations",     label: "Quotations",            icon: FileText,        group: "trade"    },
  { href: "/buyer/orders",         label: "Order Management",      icon: ShoppingCart,    group: "trade"    },
  { href: "/buyer/repeat-orders",  label: "Repeat Orders",         icon: RefreshCw,       group: "trade"    },
  { href: "/buyer/shipments",      label: "Shipment Tracking",     icon: Ship,            group: "logistics"},
  { href: "/buyer/documents",      label: "Trade Documents",       icon: FolderOpen,      group: "logistics"},
  { href: "/buyer/payments",       label: "Trade Finance",         icon: CreditCard,      group: "logistics"},
]

const GROUP_LABELS: Record<string, string> = {
  main:     "Overview",
  account:  "Account",
  trade:    "Trade Operations",
  logistics:"Logistics & Finance",
}

const GROUP_ORDER = ["main", "account", "trade", "logistics"]

interface Props { children: React.ReactNode; title: string; subtitle?: string }

export function BuyerPortalLayout({ children, title, subtitle }: Props) {
  const [location, setLocation] = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { displayName, email, avatarUrl, logout, impersonating, stopImpersonating } = useSafeAuth()
  const { itemCount } = useCart()
  const [msgUnread, setMsgUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)
  const buyerAvatar = resolveMediaUrl(avatarUrl)

  const { data: dashPayload, refetch: refetchDash } = useQuery({
    queryKey: ["buyer", "dashboard"],
    queryFn: () => api.get<{ data: { kyc_status?: string | null; kyc_approved?: boolean } }>("/api/buyer/dashboard"),
  })
  const kycTopBar = kycTopBarBadge(dashPayload?.data?.kyc_status)

  useEffect(() => { setSidebarOpen(false) }, [location])

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
  }, [fetchUnread])

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

  const initials = (displayName || email || "B").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const sidebarKycLabel = kycTopBar.approved
    ? "Verified Trade Account"
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

  const Sidebar = () => (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0">
      {/* User info — links to My Profile */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: "linear-gradient(160deg, #0F3D2E 0%, #14503C 100%)" }}>
        <Link href="/buyer/profile" className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:opacity-90" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(198,169,105,0.25)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden" style={{ background: buyerAvatar ? "transparent" : "#C6A969", color: "#0F3D2E" }}>
            {buyerAvatar ? <img src={buyerAvatar} alt="Profile" className="w-full h-full object-cover" /> : (displayName?.[0]?.toUpperCase() ?? "B")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-white">{displayName ?? "Buyer"}</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{email ?? ""}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
        </Link>
        <div className="mt-2 flex items-center gap-1.5 px-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: sidebarDotColor, boxShadow: `0 0 6px ${sidebarDotColor}` }}
          />
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
            {sidebarKycLabel}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {GROUP_ORDER.map(group => {
          const links = BUYER_LINKS.filter(l => l.group === group)
          return (
            <div key={group} className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 pb-2">
                {GROUP_LABELS[group]}
              </div>
              <div className="space-y-0.5">
                {links.map(({ href, label, icon: Icon, badgeKey, cartBadge }) => {
                  const isActive    = location === href || location.startsWith(href + "/")
                  const displayBadge = cartBadge
                    ? (itemCount > 0 ? itemCount : null)
                    : badgeKey === "messages" && msgUnread > 0 ? msgUnread
                    : badgeKey === "notifications" && notifUnread > 0 ? notifUnread
                    : null
                  return (
                    <Link key={href} href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                        isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:text-foreground hover:bg-foreground/6"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {displayBadge && !isActive && (
                        <Badge
                          className="ml-auto text-[10px] h-4 px-1.5 border-0"
                          style={{ background: "#C6A96920", color: "#C6A969" }}
                        >
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

      {/* Bottom — Back to Site + logout (admin-style) */}
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
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/6 transition-all">
          <Globe className="w-4 h-4" />
          Back to Site
        </Link>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-foreground/[0.04] border border-border/60">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #D4A012, #8a6000)" }}
          >
            {buyerAvatar ? <img src={buyerAvatar} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{displayName ?? "Buyer"}</div>
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
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
          <Sidebar />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        {/* Top bar */}
        <div className="relative z-20 h-14 bg-card border-b border-border flex items-center gap-4 px-6 shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-heading font-bold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBellDropdown
              apiBase="/api/notifications"
              listHref="/buyer/notifications"
              extraUnread={msgUnread}
            />

            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${kycTopBar.className}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kycTopBar.dotClassName}${kycTopBar.approved ? " animate-pulse" : ""}`} />
              {kycTopBar.label}
            </div>

            {/* Cart icon with badge */}
            <Link href="/buyer/cart" className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              {itemCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#C6A969", color: "#1F2933" }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* New RFQ CTA */}
            <Link href="/buyer/rfq">
              <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: "#C6A969", color: "#1F2933" }}>
                <ClipboardList className="w-3.5 h-3.5" /> New RFQ
              </button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
