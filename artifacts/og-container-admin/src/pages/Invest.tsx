import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { formatInvestorProjectAmount } from "@/lib/invest-format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FundingProgress } from "@/components/invest/FundingProgress"
import { ContainerOpportunityCard } from "@/components/invest/ContainerOpportunityCard"
import { ArrowRight, LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react"
import { type AdminInvestProject } from "@/lib/admin-data"
import { fetchInvestorOpportunities } from "@/lib/investor-opportunities"
import { adminToContainer, adminToLongTerm } from "@/lib/invest-mappers"
import { InvestHowItWorks } from "@/components/invest/InvestHowItWorks"
import { InvestRiskDisclosure } from "@/components/invest/InvestRiskDisclosure"
import { InvestBottomCta } from "@/components/invest/InvestBottomCta"

export default function Invest({ embedded = false }: { embedded?: boolean } = {}) {
  const { isSignedIn, accountType } = useSafeAuth()
  const [location] = useLocation()
  const routeTypeByPath: Record<string, AdminInvestProject["type"]> = {
    "/invest/plant": "plant",
    "/invest/feeds": "feed",
    "/invest/ricemill": "ricemill",
    "/invest/cold-storage": "cold_storage",
    "/invest/domestic-trading": "domestic_trading",
  }
  const requestedProjectType = routeTypeByPath[location.replace(/\/+$/, "")]
  const typeLabels: Partial<Record<AdminInvestProject["type"], string>> = {
    plant: "plant",
    feed: "feed mill",
    ricemill: "rice mill",
    cold_storage: "cold storage",
    domestic_trading: "domestic trading",
  }
  const [tab, setTab] = useState<"containers" | "projects">("containers")
  const visibleTab = requestedProjectType ? "projects" : tab
  const [containerFilter, setContainerFilter] = useState<"all" | "open" | "shipping" | "completed">("all")
  const filterClientProjects = (list: AdminInvestProject[]) =>
    list.filter(p => p.status !== "cancelled" && p.status !== "closed")

  const [projects, setProjects] = useState<AdminInvestProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    let refreshing = false

    const load = async (showSpinner: boolean) => {
      if (refreshing) return
      refreshing = true
      setLoadError(false)
      if (showSpinner) {
        setLoading(true)
        setProjects([])
      }
      try {
        const context = isSignedIn && accountType === "investor" ? "investor" : "public"
        const list = await fetchInvestorOpportunities(context)
        if (!cancelled) setProjects(filterClientProjects(list))
      } catch {
        if (!cancelled) {
          setProjects([])
          setLoadError(true)
        }
      } finally {
        if (!cancelled && showSpinner) setLoading(false)
        refreshing = false
      }
    }

    void load(true)

    const onFocus = () => { void load(false) }
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load(false)
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [isSignedIn, accountType, retryVersion])

  const allContainers = projects
    .filter(p => p.type === "container")
    .map(adminToContainer)
  const containers = containerFilter === "all"
    ? allContainers
    : allContainers.filter(c => c.status === containerFilter)

  const longTermProjects = projects
    .filter(p => p.type !== "container" && (!requestedProjectType || p.type === requestedProjectType))
    .map(adminToLongTerm)

  return (
    <div className={embedded ? "bg-background" : "min-h-screen bg-background"}>

      {/* Investor Portal Banner — always visible */}
      <div className="bg-primary/8 border-b border-primary/20">
        <div className="container px-4 md:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <LayoutDashboard className="w-4 h-4" />
            <span>{isSignedIn ? "Investor Portal — manage your investments, deposits and withdrawals" : "Already an investor? Access your portal below"}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isSignedIn ? (
              <>
                <Link href="/invest/dashboard">
                  <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                  </Button>
                </Link>
                <Link href="/invest/deposit">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs">
                    <ArrowDownToLine className="w-3.5 h-3.5" /> Deposit
                  </Button>
                </Link>
                <Link href="/invest/withdraw">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs">
                    <ArrowUpFromLine className="w-3.5 h-3.5" /> Withdraw
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/sign-in">
                <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs">
                  Investor Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b border-border/40">
        <div className="container px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-3xl space-y-6">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">Investment Platform</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight leading-[1.1]">
              Invest in Pakistan&apos;s <span className="text-primary">Agricultural Exports</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Co-invest in container shipments and long-term infrastructure projects. Transparent funding, real trade assets, and competitive returns.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" className="gap-2" onClick={() => document.getElementById("investments")?.scrollIntoView({ behavior: "smooth" })}>
                Browse Opportunities <ArrowRight className="w-4 h-4" />
              </Button>
              {!isSignedIn && (
                <Link href="/sign-up">
                  <Button size="lg" variant="outline">Create Account</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <InvestHowItWorks />

      {/* Investments listing */}
      <div id="investments" className="py-16 md:py-24">
        <div className="container px-4 md:px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-heading font-bold">Open Investments</h2>
              <p className="text-muted-foreground text-lg">Co-invest in active export shipments, strategic imports, and expanding infrastructure.</p>
            </div>
            {!requestedProjectType && <div className="flex bg-card p-1.5 rounded-xl border border-border/60 shadow-sm">
              <Button variant={visibleTab === "containers" ? "default" : "ghost"} size="sm" onClick={() => setTab("containers")} className="rounded-lg">
                Import &amp; Export Containers
              </Button>
              <Button variant={visibleTab === "projects" ? "default" : "ghost"} size="sm" onClick={() => setTab("projects")} className="rounded-lg">
                Long-Term Projects
              </Button>
            </div>}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading investments…
            </div>
          )}

          {!loading && loadError && (
            <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center space-y-3">
              <p className="font-medium">Live opportunities could not be loaded.</p>
              <p className="text-sm text-muted-foreground">No cached investment values are shown. Check your connection and try again.</p>
              <Button variant="outline" onClick={() => setRetryVersion(version => version + 1)}>Retry</Button>
            </div>
          )}

          {!loading && !loadError && !requestedProjectType && visibleTab === "containers" && (
            <div className="space-y-6">
              <div className="flex gap-2">
                {["all", "open", "shipping", "completed"].map(f => (
                  <Button key={f} size="sm" variant={containerFilter === f ? "secondary" : "outline"} onClick={() => setContainerFilter(f as any)} className="capitalize h-8 text-xs">
                    {f}
                  </Button>
                ))}
              </div>
              {containers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No container projects available right now.</div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {containers.map((c) => (
                    <ContainerOpportunityCard
                      key={c.id}
                      container={c}
                      imageFailed={failedImages.has(c.id)}
                      onImageError={(id) => setFailedImages(prev => new Set(prev).add(id))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !loadError && visibleTab === "projects" && (
            <div className="grid md:grid-cols-2 gap-6">
              {longTermProjects.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                  {requestedProjectType
                    ? `No ${typeLabels[requestedProjectType] || "investment"} opportunities are available right now.`
                    : "No long-term projects are available right now."}
                </div>
              )}
              {longTermProjects.map(p => (
                  <Link key={p.id} href={`/invest/${p.slug}`}>
                    <Card className="glass-card flex flex-col hover:border-primary/40 transition-all hover:-translate-y-1 cursor-pointer overflow-hidden">
                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="p-6 space-y-4 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <Badge variant="outline" className="mb-3 text-primary border-primary/20 bg-primary/5 capitalize">{p.category.replace("-", " ")}</Badge>
                              <h3 className="font-heading font-semibold text-xl leading-tight">{p.name}</h3>
                            </div>
                            <Badge className={p.status === 'open' ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}>{p.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{p.shortDescription}</p>
                          <FundingProgress
                            raised={p.currentFunding}
                            target={p.fundingTarget}
                            fundingPercentage={p.fundingPercentage}
                            remainingAmount={p.remainingAmount}
                            currency={p.currency}
                            variant="compact"
                            className="pt-2"
                          />
                        </div>
                        <div className="bg-muted/30 p-6 grid grid-cols-3 gap-4 border-t border-border/50 mt-auto">
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Annual Return</div>
                            <div className="font-bold text-emerald-500 text-lg">{p.expectedReturnPct == null ? "Not provided" : `${p.expectedReturnPct}%`}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Term</div>
                            <div className="font-bold text-foreground text-lg">
                              {p.investmentPeriodDays != null
                                ? `${p.investmentPeriodDays}d`
                                : p.investmentPeriodMonths == null
                                  ? "Not provided"
                                  : `${p.investmentPeriodMonths}mo`}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min Inv.</div>
                            <div className="font-bold text-foreground text-lg">{formatInvestorProjectAmount(p.minInvestment, p.currency)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <InvestRiskDisclosure />

      <InvestBottomCta variant="public" />
    </div>
  )
}
