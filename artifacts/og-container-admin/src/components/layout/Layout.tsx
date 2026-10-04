import { lazy, Suspense, useEffect, useState } from "react"
import { useLocation } from "wouter"
import { Navbar } from "./Navbar"
import { Footer } from "./Footer"
import { FaWhatsapp } from "react-icons/fa"

const OGAssistant = lazy(() =>
  import("@/components/home/OGAssistant").then((module) => ({
    default: module.OGAssistant,
  })),
)

// Portal areas (after login) — public Navbar / Footer / floating CTAs are hidden here
const PORTAL_PREFIXES = ["/buyer", "/admin", "/supplier", "/my-admin"]

// Investor portal lives under /invest/*; keep public /invest as a site page
const INVEST_PORTAL_SEGMENTS = [
  "dashboard",
  "wallet",
  "notifications",
  "messages",
  "containers",
  "markets",
  "plant",
  "feeds",
  "ricemill",
  "cold-storage",
  "domestic-trading",
  "opportunities",
  "deposit",
  "withdraw",
  "kyc",
  "reports",
  "profile",
  "settings",
]

function isPortalRoute(pathname: string): boolean {
  if (PORTAL_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return true
  }
  if (pathname.startsWith("/invest/")) {
    const seg = pathname.split("/")[2] ?? ""
    if (INVEST_PORTAL_SEGMENTS.includes(seg)) return true
    // Investment detail pages: /invest/6, /invest/123, etc.
    if (/^\d+$/.test(seg)) return true
    return false
  }
  return false
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [pathname] = useLocation()
  const [isPageLoading, setIsPageLoading] = useState(true)

  useEffect(() => {
    window.scrollTo(0, 0)
    setIsPageLoading(true)

    const timer = window.setTimeout(() => {
      setIsPageLoading(false)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [pathname])

  const isPortal = isPortalRoute(pathname)
  const pageLoader = isPageLoading ? (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-background"
      role="status"
      aria-label="Loading page"
    >
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
      </div>
    </div>
  ) : null

  // Portal pages supply their own full-screen sidebar layout — no public chrome
  if (isPortal) {
    return (
      <>
        {pageLoader}
        <div className="min-h-[100dvh]">{children}</div>
      </>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {pageLoader}
      <Navbar />
      <main id="main-content" className="flex-1 flex flex-col pt-20">
        {children}
      </main>
      <Footer />

      {/* Floating WhatsApp CTA — public pages only */}
      <a
        href="https://wa.me/923032569000"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with OG Exports on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 px-4 py-3 text-sm font-semibold hover:bg-[#1ebe5d] hover:shadow-[#25D366]/50 transition-all duration-200 group"
      >
        <FaWhatsapp className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          +92 303 256 9000
        </span>
      </a>

      {/* Floating AI Trade Assistant — public pages only */}
      <Suspense fallback={null}>
        <OGAssistant />
      </Suspense>
    </div>
  )
}
