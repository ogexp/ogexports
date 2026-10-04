import { useEffect, useState } from "react"
import { useParams, Link } from "wouter"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { useLocalAuth } from "@/lib/local-auth"
import { useGetMe } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContainerStatusBadge } from "@/components/portal/status-badges"
import { FundingProgress } from "@/components/invest/FundingProgress"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Ship, TrendingUp, Calendar, Lock, CheckCircle2, FileText, AlertCircle, Building2, Package, Loader2 } from "lucide-react"
import { type ContainerInvestment, type LongTermProject } from "@/data/investments"
import { InvestNowModal } from "@/components/invest/InvestNowModal"
import { InvestorKycGate, InvestorKycRequiredBanner } from "@/components/invest/InvestorKycGate"
import { api, downloadAuthenticatedFile } from "@/lib/api"
import { getInvestProjects, loadInvestProjects, mapInvestProject, type AdminInvestProject, type AdminInvestProjectDocument } from "@/lib/admin-data"
import {
  CONTAINER_EXPORT_STAGES,
  containerProjectStageIndex,
  containerProjectStatusLabel,
  isContainerProjectInvestable,
} from "@/lib/container-project-statuses"
import { adminToContainer } from "@/lib/invest-mappers"
import { getFundingMetrics } from "@/lib/funding-metrics"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/lib/use-currency"

function adminToLongTerm(p: AdminInvestProject): LongTermProject {
  const statusMap: Partial<Record<AdminInvestProject["status"], LongTermProject["status"]>> = {
    funding: "open", active: "in-progress", completed: "completed",
  }
  const months = p.investmentPeriodDays
    ? Math.max(1, Math.round(p.investmentPeriodDays / 30))
    : (p.type === "plant" ? 48 : 24)
  return {
    id: p.id, slug: p.id, name: p.title,
    category: p.type === "plant" ? "processing" : "fresh-produce",
    shortDescription: p.description || p.title,
    fullDescription: p.description || p.title,
    fundingTarget: p.target, currentFunding: p.raised,
    minInvestment: p.minInvestment || 1000, maxInvestment: p.maxInvestment ?? 0,
    investmentPeriodMonths: months,
    expectedReturnPct: p.expectedReturnPct || parseFloat(p.roi) || 12,
    expectedCompletionDate: p.completion || "",
    riskLevel: p.riskLevel || "medium",
    status: statusMap[p.status] || "open",
    totalInvestors: p.investors,
    imageUrls: p.imageUrl ? [p.imageUrl] : [],
    highlights: p.description ? [p.description] : [],
    documents: [],
  }
}

function mapApiToAdmin(raw: any): AdminInvestProject {
  return mapInvestProject(raw)
}

export default function InvestDetail() {
  const params = useParams()
  const slug = params.id
  const { toast } = useToast()
  const c = useCurrency()
  const { isSignedIn } = useSafeAuth()
  const { user: localUser } = useLocalAuth()
  const { data: me } = useGetMe({ query: { enabled: !!isSignedIn } })
  const isInvestor = me?.accountType === "investor" || localUser?.accountType === "investor"

  const [amount, setAmount] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<AdminInvestProject | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletCurrency, setWalletCurrency] = useState("USD")
  const [walletLoading, setWalletLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!slug) return
      setLoading(true)

      // Prefer live API detail (includes documents)
      if (/^\d+$/.test(slug)) {
        try {
          const res: any = await api.get(`/api/investments/${slug}`)
          const data = res?.data ?? res
          if (!cancelled && data) {
            setProject(mapApiToAdmin(data))
            setLoading(false)
            return
          }
        } catch { /* fall through to cache */ }
      }

      await loadInvestProjects({ context: isInvestor ? "investor" : "public" })
      const cached = getInvestProjects().find(p => p.id === slug)
      if (!cancelled) {
        setProject(cached || null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug, isInvestor])

  useEffect(() => {
    setImageFailed(false)
  }, [slug])

  useEffect(() => {
    if (!isSignedIn || !isInvestor) {
      setWalletBalance(null)
      setWalletLoading(false)
      return
    }
    let cancelled = false
    setWalletLoading(true)
    api.get("/api/investor/wallet")
      .then((res: unknown) => {
        const payload = res as { data?: { available_balance?: number; currency?: string } }
        const w = payload?.data ?? (payload as { available_balance?: number; currency?: string })
        if (!cancelled) {
          setWalletBalance(Number(w?.available_balance ?? 0))
          setWalletCurrency(String(w?.currency || "USD").toUpperCase())
        }
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(0)
      })
      .finally(() => {
        if (!cancelled) setWalletLoading(false)
      })
    return () => { cancelled = true }
  }, [isSignedIn, isInvestor])

  if (loading) {
    return (
      <InvestPortalLayout title="Investment Detail" subtitle="Loading opportunity details…">
        <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading investment…
        </div>
      </InvestPortalLayout>
    )
  }

  if (!project) {
    return (
      <InvestPortalLayout title="Investment Detail" subtitle="Opportunity not found">
        <div className="py-16 text-center space-y-4">
          <p className="text-xl font-medium text-muted-foreground">Investment not found.</p>
          <Link href="/invest/opportunities"><Button variant="outline">Back to Investments</Button></Link>
        </div>
      </InvestPortalLayout>
    )
  }

  const isProject = project.type === "produce" || project.type === "plant"
  const container = !isProject ? adminToContainer(project) : null
  const longTerm = isProject ? adminToLongTerm(project) : null
  const inv = (container || longTerm)!

  const title = project.title || (isProject ? longTerm!.name : container!.commodity)
  const projectReference = project.reference
  const target = isProject ? longTerm!.fundingTarget : container!.targetFunding
  const current = inv.currentFunding
  const pendingReserved = project.pendingReserved || 0
  const { remaining, isFull } = getFundingMetrics(current, target, pendingReserved)
  const capacityRemaining = project.remainingAmount != null ? project.remainingAmount : remaining
  const capacityFull = project.isFull || isFull || capacityRemaining <= 0
  const canInvest = (isProject
    ? longTerm!.status === "open"
    : isContainerProjectInvestable(project.status)) && !capacityFull

  const containerStage = container ? containerProjectStageIndex(project.status) : 0
  const containerStageDates = container
    ? [
        container.fundingDeadlineDate,
        container.fundingDeadlineDate,
        container.estimatedDepartureDate,
        container.estimatedDepartureDate,
        container.estimatedArrivalDate,
        container.expectedProjectCompletionDate || container.estimatedArrivalDate,
      ]
    : []
  const timelinePct = container
    ? Math.min(100, Math.round((containerStage / Math.max(CONTAINER_EXPORT_STAGES.length - 1, 1)) * 100))
    : 0

  const val = Number(amount)
  const estReturn = val ? val * (inv.expectedReturnPct / 100) : 0
  const showPkrDual = c.isPK
  const estReturnPkr = showPkrDual && val ? c.convert(estReturn) : null
  const valPkr = showPkrDual && val ? c.convert(val) : null
  const usePkrWallet = showPkrDual && walletCurrency === "PKR"
  const walletDebitNeeded = usePkrWallet && val > 0 ? c.convert(val) : val
  const investAmountDisabled =
    walletLoading
    || walletBalance == null
    || walletBalance <= 0
    || !amount
    || val < inv.minInvestment
    || (inv.maxInvestment ? val > inv.maxInvestment : false)
    || val > capacityRemaining
    || (val > 0 && walletDebitNeeded > (walletBalance ?? 0))

  const handleInvestClick = () => {
    if (!isSignedIn) return
    if (!isInvestor) {
      toast({ title: "Investor Account Required", description: "Please switch to an investor account.", variant: "destructive" })
      return
    }
    if (capacityFull) {
      toast({ title: "Fully subscribed", description: "No investment capacity remaining.", variant: "destructive" })
      return
    }
    setModalOpen(true)
  }

  const typeLabel = isProject ? "Long-Term Project" : "Container Export"
  const layoutSubtitle = container
    ? `${typeLabel}${projectReference ? ` · ${projectReference}` : ""} · ${containerProjectStatusLabel(project.status)}`
    : projectReference ? `${typeLabel} · ${projectReference}` : typeLabel
  const imageUrl = isProject ? (longTerm!.imageUrls[0] || "") : container!.imageUrl
  const projectDocuments: AdminInvestProjectDocument[] = project.documents || []

  const handleDownloadDocument = async (doc: AdminInvestProjectDocument) => {
    try {
      const path = doc.downloadUrl
        || `/api/investor/projects/${project.id}/documents/${doc.id}/download`
      const apiPath = path.startsWith("http")
        ? path.replace(/^https?:\/\/[^/]+/, "")
        : path
      await downloadAuthenticatedFile(apiPath, doc.title || "document")
      toast({ title: "Download started", description: doc.title })
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Could not download this document.",
        variant: "destructive",
      })
    }
  }

  return (
    <InvestPortalLayout title={title} subtitle={layoutSubtitle}>
      <div className="space-y-8">
        <Link href="/invest/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Investments
        </Link>
        <InvestorKycRequiredBanner />

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-64 md:h-96 w-full overflow-hidden rounded-2xl relative bg-muted">
              {imageUrl && !imageFailed ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-muted-foreground/30" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge className="bg-primary text-white border-0">{typeLabel}</Badge>
                  {projectReference && (
                    <Badge variant="outline" className="font-mono text-[10px] border-white/30 text-white bg-white/10">
                      {projectReference}
                    </Badge>
                  )}
                  {container && <ContainerStatusBadge status={container.status} />}
                  {longTerm && (
                    <Badge className={longTerm.status === "open" ? "bg-emerald-500" : "bg-muted text-muted-foreground"}>
                      {longTerm.status}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-heading font-bold text-white">{title}</h1>
                {!isProject && container && container.commodity && container.commodity !== title && (
                  <p className="text-sm text-white/80 mt-2">{container.commodity}{container.variety ? ` · ${container.variety}` : ""}</p>
                )}
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <h3 className="font-heading text-2xl">Investment Overview</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {isProject ? longTerm!.fullDescription : container!.description}
              </p>
            </div>

            {!isProject && container && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" /> Container Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commodity</span>
                      <span className="font-medium">{container.variety || container.commodity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Container Number</span>
                      <span className="font-medium font-mono">{container.containerNumber || "TBD"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Container Size</span>
                      <span className="font-medium uppercase">{container.containerType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-medium">{c.fmtDual(container.containerValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                      <Ship className="w-5 h-5 text-primary" /> Shipment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Route</span>
                      <span className="font-medium text-right">
                        {container.portOfLoading || container.origin} <br/>
                        <span className="text-muted-foreground text-xs">to</span> <br/>
                        {container.portOfDischarge || container.destination}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Incoterm</span>
                      <span className="font-medium">{container.incoterm}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping Line</span>
                      <span className="font-medium">{container.shippingLine || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vessel Name</span>
                      <span className="font-medium">{container.vesselName || 'TBD'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="sm:col-span-2 bg-card/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" /> Project Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Progress</span>
                          <span>{timelinePct}% complete</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${timelinePct}%` }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {CONTAINER_EXPORT_STAGES.map((stageLabel, i) => {
                          const isComplete = i < containerStage || project.status === "settled"
                          const isCurrent = i === containerStage && project.status !== "settled" && project.status !== "cancelled"
                          return (
                            <div key={stageLabel} className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
                                ${isComplete ? "bg-primary text-primary-foreground"
                                  : isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                                  : "bg-muted text-muted-foreground"}`}>
                                {isComplete ? "✓" : i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm ${isCurrent ? "font-semibold text-foreground" : isComplete ? "text-muted-foreground" : "text-muted-foreground"}`}>
                                  {stageLabel}
                                </span>
                                <p className="text-[10px] text-muted-foreground">{containerStageDates[i] || "TBD"}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {isProject && longTerm && longTerm.highlights.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-heading text-2xl">Project Highlights</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {longTerm.highlights.map((h: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 bg-muted/30 p-4 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-heading text-2xl">Documents</h3>
              {(!isSignedIn || !isInvestor) ? (
                <div className="bg-muted/50 rounded-xl p-8 text-center flex flex-col items-center">
                  <Lock className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Documents Locked</p>
                  <p className="text-xs text-muted-foreground mt-1">Sign in as an investor to view financial documents and agreements.</p>
                </div>
              ) : projectDocuments.length === 0 ? (
                <div className="bg-muted/50 rounded-xl p-8 text-center flex flex-col items-center">
                  <FileText className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No documents available</p>
                  <p className="text-xs text-muted-foreground mt-1">Documents for this investment will appear here when uploaded by OG Exports.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {projectDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{doc.size || "—"}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => void handleDownloadDocument(doc)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-500">
                <AlertCircle className="w-5 h-5" />
                <h4 className="font-semibold">Risk Disclosure</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-amber-700/80 dark:text-amber-500/80 space-y-2">
                <li>Capital is at risk. Returns are not guaranteed and depend on successful trade execution.</li>
                <li>Investments are locked for the duration of the term ({isProject ? `${longTerm!.investmentPeriodMonths} months` : `${container!.investmentPeriodDays} days`}).</li>
                <li>Returns are subject to currency fluctuations and final settlement deductions.</li>
              </ul>
            </div>
          </div>

          <div className="sticky top-6 space-y-6">
            <Card className="glass-card shadow-xl border-primary/20">
              <CardContent className="p-6 space-y-6">
                <FundingProgress
                  raised={current}
                  target={target}
                  variant="detailed"
                  investors={inv.totalInvestors}
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-muted-foreground">Remaining</div>
                    <div className="font-semibold">{c.fmtDual(capacityRemaining)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="text-muted-foreground">Pending holds</div>
                    <div className="font-semibold">{c.fmtDual(pendingReserved)}</div>
                  </div>
                </div>
                {capacityFull && (
                  <p className="text-xs text-amber-600 text-center font-medium">Fully subscribed — no slots remaining</p>
                )}

                <div className="grid grid-cols-2 gap-4 py-5 border-y border-border/50">
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-500 font-heading font-bold text-2xl">
                      <TrendingUp className="w-5 h-5" /> {inv.expectedReturnPct}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Expected return</div>
                  </div>
                  <div>
                    <div className="font-heading font-bold text-2xl text-foreground">
                      {isProject ? `${longTerm!.investmentPeriodMonths}mo` : `${container!.investmentPeriodDays}d`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Investment term</div>
                  </div>
                </div>

                {!canInvest ? (
                  <Button className="w-full h-12 text-lg font-semibold bg-muted text-muted-foreground hover:bg-muted" disabled>
                    {capacityFull ? "Fully Subscribed" : "Funding Closed"}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <label className="font-medium">Investment Amount (USD)</label>
                        <span className="text-muted-foreground">Min: {c.fmtDual(inv.minInvestment)}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          className="pl-8 h-12 text-lg font-medium"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      {showPkrDual && val > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {c.fmtDual(val, valPkr)}
                        </p>
                      )}
                    </div>

                    {val > 0 && (
                      <div className="bg-primary/5 rounded-lg p-3 text-sm flex justify-between items-center gap-2 border border-primary/10">
                        <span className="text-muted-foreground shrink-0">Est. Return:</span>
                        <span className="font-bold text-emerald-500 text-right">
                          +{c.fmtDual(estReturn, estReturnPkr)}
                        </span>
                      </div>
                    )}

                    {!isSignedIn ? (
                      <Link href="/sign-in"><Button className="w-full h-12 text-lg font-semibold">Sign In to Invest</Button></Link>
                    ) : (
                      <>
                        <InvestorKycGate
                          className="w-full h-12 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                          actionName="invest in this opportunity"
                          onClick={handleInvestClick}
                          disabled={investAmountDisabled}
                        >
                          Invest Amount
                        </InvestorKycGate>
                        {!walletLoading && walletBalance != null && walletBalance <= 0 && (
                          <p className="text-xs text-center text-muted-foreground">
                            Add funds to your wallet to invest.{" "}
                            <Link href="/invest/deposit" className="text-primary font-medium hover:underline">
                              Deposit now
                            </Link>
                          </p>
                        )}
                        {!walletLoading && walletBalance != null && walletBalance > 0 && val > 0 && walletDebitNeeded > walletBalance && (
                          <p className="text-xs text-red-500 text-center">
                            Amount exceeds available balance ({c.fmtWalletAmount(walletBalance, walletCurrency)})
                          </p>
                        )}
                      </>
                    )}

                    {val > capacityRemaining && <p className="text-xs text-red-500 text-center">Amount exceeds remaining capacity ({c.fmtDual(capacityRemaining)})</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-5 flex gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Need help?</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Our investment team is ready to answer your questions.</p>
                  <a href="mailto:investments@ogexports.co" className="text-xs font-medium text-primary mt-2 inline-block hover:underline">investments@ogexports.co</a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {modalOpen && (
        <InvestNowModal
          investment={inv}
          initialAmount={Number(amount)}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          pendingReserved={pendingReserved}
          remainingAmount={capacityRemaining}
          isFull={capacityFull}
          onSuccess={async () => {
            try {
              const res: any = await api.get(`/api/investments/${project.id}`)
              const data = res?.data ?? res
              if (data) setProject(mapApiToAdmin(data))
            } catch { /* ignore */ }
          }}
        />
      )}
    </InvestPortalLayout>
  )
}
