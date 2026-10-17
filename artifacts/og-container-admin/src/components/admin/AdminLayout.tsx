import { useState, useEffect, useCallback } from "react"
import { Link, useLocation } from "wouter"
import { initAdminData } from "@/lib/admin-data"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { useAdminModuleCounts } from "@/hooks/useAdminModuleCounts"
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell"
import { api } from "@/lib/api"
import {
  LayoutDashboard, Users, Building2,
  BarChart3, ShoppingBag, Ship, Package, Factory, ArrowDownCircle, ArrowUpCircle,
  CreditCard, Target, FileCheck, ScrollText, Layout, Search, Image,
  MessageSquare, BarChart2, Lock, Settings, Menu, X, ChevronDown,
  ChevronRight, Globe, LogOut, Layers, Newspaper, Landmark, Megaphone, MessagesSquare, Banknote, DollarSign,
   Sprout, TrendingUp, Zap,
  CalendarClock,
} from "lucide-react"

const GOLD = "#c5b487"
const SIDEBAR_BG = "#203b31"
const SIDEBAR_HOVER = "rgba(215,224,211,0.08)"
const SIDEBAR_ACTIVE = "rgba(215,224,211,0.13)"

const NAV = [
  {
    group: "COMMAND CENTER",
    items: [
      { label: "Executive Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    ],
  },
  {
    group: "USER MANAGEMENT",
    items: [
      { label: "Users", icon: Users, href: "/admin/users" },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { label: "Investments", icon: BarChart3, href: "/admin/investments" },
      { label: "Orders & RFQs", icon: ShoppingBag, href: "/admin/orders" },
      { label: "Quotations & FOB Prices", icon: CreditCard, href: "/admin/quotations" },
      { label: "Shipments", icon: Ship, href: "/admin/shipments" },
      { label: "Products", icon: Package, href: "/admin/products" },
      { label: "Auto-invest Mobile", icon: Zap, href: "/admin/auto-invest-products" },
    ],
  },
  {
    group: "INVESTMENT MANAGEMENT",
    items: [
      { label: "Container Investments", icon: Ship, href: "/admin/container-investments" },
      { label: "Fresh Produce", icon: Sprout, href: "/admin/fresh-produce", visibilityKey: "produce" as const },
      { label: "Processing Plant", icon: Factory, href: "/admin/processing-plant", visibilityKey: "plant" as const },
      { label: "Rice Mill", icon: Factory, href: "/admin/rice-mill", visibilityKey: "ricemill" as const },
      { label: "Feed Mill", icon: Factory, href: "/admin/feed-mill", visibilityKey: "feeds" as const },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { label: "Buyer Deposits", icon: ArrowDownCircle, href: "/admin/finance?tab=buyer-deposits" },
      { label: "Investor Deposits", icon: Banknote, href: "/admin/finance?tab=investor-deposits" },
      { label: "Project Deposits", icon: DollarSign, href: "/admin/project-deposits" },
      { label: "Payout Progress", icon: CalendarClock, href: "/admin/investment-payouts" },
      { label: "Active Projects", icon: Ship, href: "/admin/active-projects" },
      { label: "Pending Withdrawals", icon: TrendingUp, href: "/admin/pending-withdrawals" },
      { label: "Withdrawals", icon: ArrowUpCircle, href: "/admin/finance?tab=withdrawals" },
      { label: "Transactions", icon: CreditCard, href: "/admin/finance?tab=transactions" },
      { label: "Bank Accounts", icon: Landmark, href: "/admin/finance?tab=bank-accounts" },
    ],
  },
  {
    group: "CRM",
    items: [
      { label: "Lead Pipeline", icon: Target, href: "/admin/crm" },
      { label: "Segments", icon: Layers, href: "/admin/crm?tab=segments" },
    ],
  },
  {
    group: "COMPLIANCE",
    items: [
      { label: "KYC Review", icon: FileCheck, href: "/admin/compliance" },
      { label: "Audit Logs", icon: ScrollText, href: "/admin/compliance?tab=audit" },
    ],
  },
  {
    group: "CONTENT",
    items: [
      { label: "CMS", icon: Layout, href: "/admin/cms" },
      { label: "SEO", icon: Search, href: "/admin/settings?tab=seo" },
      { label: "Media", icon: Image, href: "/admin/settings?tab=media" },
    ],
  },
  {
    group: "SUPPORT",
    items: [
      { label: "Messages", icon: MessagesSquare, href: "/admin/messages" },
      { label: "Tickets", icon: MessageSquare, href: "/admin/support" },
      { label: "Announcements", icon: Megaphone, href: "/admin/announcements" },
    ],
  },
  {
    group: "SUPPLIER CENTER",
    items: [
      { label: "Supplier Offer Center", icon: Building2, href: "/admin/suppliers" },
    ],
  },
  {
    group: "TRADE INTELLIGENCE",
    items: [
      { label: "Global Trade Intel Center", icon: Newspaper, href: "/admin/trade-intelligence" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Reports", icon: BarChart2, href: "/admin/reports" },
      { label: "Security", icon: Lock, href: "/admin/security" },
      { label: "Settings", icon: Settings, href: "/admin/settings" },
    ],
  },
]

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [location, setLocation] = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [msgUnread, setMsgUnread] = useState(0)
  const [ticketUnread, setTicketUnread] = useState(0)
  const [queryVersion, setQueryVersion] = useState(0)
  const { logout } = useSafeAuth()
  const { supplierModuleEnabled, investmentModuleEnabled, investCategoryVisible } = usePlatformSettings()
  const { badgeForHref } = useAdminModuleCounts()
  const navGroups = NAV
    .filter(g => supplierModuleEnabled || g.group !== "SUPPLIER CENTER")
    .map(g => ({
      ...g,
      items: g.items.filter(item => {
        if (
          !investmentModuleEnabled && (
            item.href === "/admin/investments"
            || item.href === "/admin/project-deposits"
            || item.href === "/admin/investment-payouts"
            || item.href === "/admin/active-projects"
            || item.href === "/admin/processing-plant"
            || item.href === "/admin/rice-mill"
            || item.href === "/admin/feed-mill"
            || item.href === "/admin/container-investments"
            || item.href === "/admin/fresh-produce"
            || item.href === "/admin/pending-withdrawals"
            || item.href.includes("investor-deposits")
          )
        ) {
          return false
        }
        const visibilityKey = (item as { visibilityKey?: keyof typeof investCategoryVisible }).visibilityKey
        if (visibilityKey && !investCategoryVisible[visibilityKey]) return false
        return true
      }),
    }))
    .filter(g => g.items.length > 0)

  const fetchUnread = useCallback(async () => {
    try {
      const [msgRes, ticketRes] = await Promise.all([
        api.get<{ data: { unread_count: number } }>("/api/admin/messages/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/admin/support/tickets/unread-count"),
      ])
      setMsgUnread(msgRes?.data?.unread_count ?? 0)
      setTicketUnread(ticketRes?.data?.unread_count ?? 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => { initAdminData() }, [])

  useEffect(() => {
    const bump = () => setQueryVersion(v => v + 1)
    window.addEventListener("popstate", bump)
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = (...args) => { origPush(...args); bump() }
    history.replaceState = (...args) => { origReplace(...args); bump() }
    return () => {
      window.removeEventListener("popstate", bump)
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [location])

  useEffect(() => {
    fetchUnread()
    const onCustom = () => { fetchUnread() }
    window.addEventListener("og-admin-unread", onCustom)
    const t = setInterval(fetchUnread, 30000)
    return () => {
      window.removeEventListener("og-admin-unread", onCustom)
      clearInterval(t)
    }
  }, [fetchUnread])

  function handleLogout() {
    logout?.()
    setLocation("/my-admin/login")
  }

  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    const onPath = location === path || location.startsWith(path + "/")
    if (!onPath) return false
    if (path === "/admin/finance" && query) {
      void queryVersion
      const expectedTab = new URLSearchParams(query).get("tab") || "overview"
      const currentTab = new URLSearchParams(window.location.search).get("tab") || "overview"
      return expectedTab === currentTab
    }
    if (query) {
      void queryVersion
      const expectedTab = new URLSearchParams(query).get("tab")
      const currentTab = new URLSearchParams(window.location.search).get("tab")
      if (expectedTab && currentTab !== expectedTab) return false
    }
    return true
  }

  const badgeFor = (href: string): number => {
    if (href === "/admin/messages") return msgUnread + badgeForHref(href)
    if (href === "/admin/support") return ticketUnread
    return badgeForHref(href)
  }

  const sidebarNav = (
    <div style={{ background: SIDEBAR_BG }} className="flex flex-col h-full w-64 shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(229,237,225,0.10)" }}>
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-none">OG Exports</div>
            <div className="text-[10px] font-semibold tracking-[0.14em] mt-0.5" style={{ color: GOLD }}>
              SUPER ADMIN
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 px-3 space-y-5">
        {navGroups.map(section => (
          <div key={section.group}>
            <p className="text-[9px] font-semibold tracking-[0.12em] px-2 mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = isActive(item.href)
                const badge = badgeFor(item.href)
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                      style={{
                        background: active ? SIDEBAR_ACTIVE : "transparent",
                        color: active ? "#e2dcc9" : "rgba(255,255,255,0.72)",
                      }}
                       onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = SIDEBAR_HOVER; (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.96)" }}
                       onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.72)" } }}
                    >
                      <item.icon className="w-4 h-4 shrink-0" style={{ color: active ? GOLD : undefined }} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className="ml-auto text-[10px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center"
                          style={{ background: "#ef4444", color: "#fff" }}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                      {active && badge <= 0 && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: GOLD }} />}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom user */}
      <div className="px-3 py-3 border-t shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "rgba(215,224,211,0.16)" }}>
            SA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">Super Admin</div>
            <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>admin@ogexports.co</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        {sidebarNav}
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10">
            {sidebarNav}
          </div>
          <button className="absolute top-4 right-4 text-white z-20" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="h-16 bg-card/90 border-b border-border flex items-center gap-4 px-5 shrink-0">
          <button className="lg:hidden text-foreground/60 hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            {title && (
              <div>
                <h1 className="text-sm font-bold text-foreground leading-none">{title}</h1>
                {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* System health dot */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(76,175,80,0.1)", color: "#4CAF50" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-700/70" />
              Systems Normal
            </div>

            {/* Notifications */}
            <AdminNotificationBell
              open={notifOpen}
              onToggle={() => setNotifOpen(p => !p)}
              onClose={() => setNotifOpen(false)}
            />

            {/* Admin avatar */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}>
              SA
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
