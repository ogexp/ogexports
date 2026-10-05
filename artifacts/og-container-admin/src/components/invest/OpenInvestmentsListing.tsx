import { useEffect, useState } from "react"
import { Link } from "wouter"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ContainerStatusBadge } from "@/components/portal/status-badges"
import { FundingProgress } from "@/components/invest/FundingProgress"
import { Package, Loader2, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { api, unwrapPage } from "@/lib/api"
import { mapInvestProject, type AdminInvestProject } from "@/lib/admin-data"
import { adminToContainer, adminToLongTerm, formatInvestDate } from "@/lib/invest-mappers"
import { formatInvestorProjectAmount } from "@/lib/invest-format"

const PER_PAGE = 9

type Tab = "containers" | "projects"
type ContainerFilter = "all" | "open" | "shipping" | "completed"

function apiStatusFromFilter(filter: ContainerFilter): string | undefined {
  if (filter === "all") return undefined
  if (filter === "open") return "funding"
  if (filter === "shipping") return "in_transit"
  if (filter === "completed") return "settled"
  return filter
}

export function OpenInvestmentsListing() {
  const [tab, setTab] = useState<Tab>("containers")
  const [containerFilter, setContainerFilter] = useState<ContainerFilter>("all")
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState<AdminInvestProject[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [tab, containerFilter])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = {
          page,
          per_page: PER_PAGE,
        }

        if (tab === "containers") {
          params.type = "container"
          const status = apiStatusFromFilter(containerFilter)
          if (status) params.status = status
        } else {
          params.category = "long_term"
        }

        const res = await api.get("/api/investments", params)
        if (cancelled) return

        const { data, meta: pageMeta } = unwrapPage(res)
        setProjects(data.map(mapInvestProject))
        setMeta(pageMeta)
      } catch {
        if (!cancelled) {
          setProjects([])
          setMeta({ current_page: 1, last_page: 1, per_page: PER_PAGE, total: 0 })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [tab, containerFilter, page])

  const containers = projects.map(adminToContainer)
  const longTermProjects = projects.map(adminToLongTerm)
  const projectById = new Map(projects.map(p => [p.id, p]))

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-heading font-bold">Open Investments</h2>
          <p className="text-muted-foreground">
            Co-invest in active export shipments, strategic imports, and expanding infrastructure.
          </p>
        </div>
        <div className="flex bg-card p-1.5 rounded-xl border border-border/60 shadow-sm">
          <Button
            variant={tab === "containers" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("containers")}
            className="rounded-lg"
          >
            Import &amp; Export Containers
          </Button>
          <Button
            variant={tab === "projects" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("projects")}
            className="rounded-lg"
          >
            Long-Term Projects
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading investments…
        </div>
      )}

      {!loading && tab === "containers" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {(["all", "open", "shipping", "completed"] as const).map(f => (
              <Button
                key={f}
                size="sm"
                variant={containerFilter === f ? "secondary" : "outline"}
                onClick={() => setContainerFilter(f)}
                className="capitalize h-8 text-xs"
              >
                {f}
              </Button>
            ))}
          </div>

          {containers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No container projects available right now.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {containers.map(c => {
                const raw = projectById.get(c.id)
                return (
                  <Link key={c.id} href={`/invest/${c.slug}`}>
                    <Card className="glass-card h-full hover:border-accent/40 transition-all hover:-translate-y-1 cursor-pointer overflow-hidden group">
                      <div className="h-48 w-full overflow-hidden relative bg-muted">
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl}
                            alt={c.commodity}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5">
                          {c.destinationFlag} {c.destinationCountry}
                        </div>
                        <div className="absolute top-3 right-3">
                          <ContainerStatusBadge status={c.status} />
                        </div>
                      </div>
                      <CardContent className="p-6 space-y-5">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 text-xs font-medium text-muted-foreground">
                            <Package className="w-3.5 h-3.5" /> {c.containerType} Container
                            <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${c.tradeDirection === "import" ? "bg-sky-500/15 text-sky-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                              {c.tradeDirection}
                            </span>
                          </div>
                          <h3 className="font-heading font-semibold text-lg leading-tight">{c.commodity}</h3>
                        </div>

                        {(raw?.createdAt || raw?.fundingDeadlineDate) && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {raw.createdAt && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Posted {formatInvestDate(raw.createdAt)}
                              </span>
                            )}
                            {raw.fundingDeadlineDate && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Deadline {formatInvestDate(raw.fundingDeadlineDate)}
                              </span>
                            )}
                          </div>
                        )}

                        <FundingProgress
                          raised={c.currentFunding}
                          target={c.targetFunding}
                          currency={c.currency}
                          variant="compact"
                        />

                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Return</div>
                            <div className="font-bold text-emerald-500">{c.expectedReturnPct == null ? "Not provided" : `${c.expectedReturnPct}%`}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Term</div>
                            <div className="font-bold text-foreground">{c.investmentPeriodDays == null ? "Not provided" : `${c.investmentPeriodDays}d`}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Min Inv.</div>
                            <div className="font-bold text-foreground">{formatInvestorProjectAmount(c.minInvestment, c.currency)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "projects" && (
        <div className="grid md:grid-cols-2 gap-6">
          {longTermProjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No long-term projects available right now.
            </div>
          )}
          {longTermProjects.map(p => {
            const raw = projectById.get(String(p.id))
            return (
              <Link key={p.id} href={`/invest/${p.slug}`}>
                <Card className="glass-card flex flex-col hover:border-primary/40 transition-all hover:-translate-y-1 cursor-pointer overflow-hidden">
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="p-6 space-y-4 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge variant="outline" className="mb-3 text-primary border-primary/20 bg-primary/5 capitalize">
                            {p.category.replace("-", " ")}
                          </Badge>
                          <h3 className="font-heading font-semibold text-xl leading-tight">{p.name}</h3>
                        </div>
                        <Badge className={p.status === "open" ? "bg-emerald-500" : "bg-muted text-muted-foreground"}>
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{p.shortDescription}</p>

                      {(raw?.createdAt || raw?.completion) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {raw.createdAt && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Posted {formatInvestDate(raw.createdAt)}
                            </span>
                          )}
                          {raw.completion && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Completion {formatInvestDate(raw.completion)}
                            </span>
                          )}
                        </div>
                      )}

                      <FundingProgress
                        raised={p.currentFunding}
                        target={p.fundingTarget}
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
                        <div className="font-bold text-foreground text-lg">{p.investmentPeriodMonths == null ? "Not provided" : `${p.investmentPeriodMonths}mo`}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Min Inv.</div>
                        <div className="font-bold text-foreground text-lg">{formatInvestorProjectAmount(p.minInvestment, p.currency)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.last_page}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
