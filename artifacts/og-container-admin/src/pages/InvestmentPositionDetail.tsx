import { useEffect, useState } from "react"
import { Link, useParams } from "wouter"
import { ArrowLeft, Download, FileText, Loader2, Package } from "lucide-react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { InvestmentPositionCard, mapRowToPosition, type InvestmentPositionData } from "@/components/invest/InvestmentPositionCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api, downloadAuthenticatedFile } from "@/lib/api"
import { downloadInvestmentPdf } from "@/lib/investment-download"
import { notify } from "@/lib/notify"
import { formatInvestorProjectAmount } from "@/lib/invest-format"
import { containerProjectStatusLabel } from "@/lib/container-project-statuses"
import { investmentStatusLabel } from "@/lib/investment-statuses"

export default function InvestmentPositionDetail() {
  const params = useParams<{ id: string }>()
  const investmentId = Number(params.id)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [position, setPosition] = useState<InvestmentPositionData | null>(null)
  const [raw, setRaw] = useState<any>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setRefreshVersion(version => version + 1)
    window.addEventListener("og-investor-records-updated", refresh)
    return () => window.removeEventListener("og-investor-records-updated", refresh)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!investmentId) return
      setLoading(true)
      try {
        const res = await api.get<{ data: any }>(`/api/investor/investments/${investmentId}`)
        const row = res?.data ?? res
        if (!cancelled) {
          setRaw(row)
          setPosition(mapRowToPosition(row))
        }
      } catch {
        if (!cancelled) {
          setRaw(null)
          setPosition(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [investmentId, refreshVersion])

  const project = raw?.project || {}
  const docs = Array.isArray(project.documents) ? project.documents : []

  async function handleDownloadPdf() {
    if (!position || pdfLoading) return
    setPdfLoading(true)
    try {
      await downloadInvestmentPdf(
        position.investmentId,
        position.investmentReference || position.projectReference,
      )
    } catch (error) {
      notify.error(
        "Download failed",
        error instanceof Error ? error.message : "Could not export this investment.",
      )
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <InvestPortalLayout
      title="Investment Details"
      subtitle="Full details of your investment position"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/invest/containers">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to positions
            </Link>
          </Button>
          {position && (
            <Button
              size="sm"
              variant="outline"
              disabled={pdfLoading}
              onClick={() => void handleDownloadPdf()}
            >
              {pdfLoading
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <Download className="w-3.5 h-3.5 mr-1.5" />}
              {pdfLoading ? "Preparing…" : "Download PDF"}
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading investment…
          </div>
        )}

        {!loading && !position && (
          <Card className="glass-card">
            <CardContent className="py-16 text-center space-y-3">
              <Package className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="font-medium">Investment not found</p>
              <Button asChild>
                <Link href="/invest/containers">Back to containers</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {position && (
          <>
            <InvestmentPositionCard inv={position} hideDownloadActions />

            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Position Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {position.investmentReference && (
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-muted-foreground">Investment Reference</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground border border-primary/25 bg-primary/5 px-3 py-1.5 rounded-lg">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ref</span>
                        {position.investmentReference}
                      </span>
                    </div>
                  )}
                  {position.projectReference && (
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-muted-foreground">Project Reference</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground border border-border bg-muted/50 px-3 py-1.5 rounded-lg">
                        {position.projectReference}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Project status</span>
                    <Badge className="border-0 text-[10px]">{containerProjectStatusLabel(position.projectStatus)}</Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Investment status</span>
                    <Badge className="border-0 text-[10px]">
                      {investmentStatusLabel(position.investmentStatus, {
                        projectType: position.projectType,
                        projectStatus: position.projectStatus,
                      })}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Invested</span>
                    <span className="font-bold">{formatInvestorProjectAmount(position.amount, position.currency)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Profit amount</span>
                    <span className="font-bold text-emerald-500">
                      {formatInvestorProjectAmount(position.expectedProfit, position.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Total return</span>
                    <span className="font-bold">Not provided</span>
                  </div>
                  {project.description && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Project Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No documents attached.</p>
                  ) : (
                    <ul className="space-y-2">
                      {docs.map((doc: any) => (
                        <li key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{doc.title || doc.name || `Document ${doc.id}`}</span>
                          </div>
                          {position.projectId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await downloadAuthenticatedFile(
                                    `/api/investor/projects/${position.projectId}/documents/${doc.id}/download`,
                                    doc.title || "document",
                                  )
                                } catch {
                                  notify.error("Download failed", "Could not download document.")
                                }
                              }}
                            >
                              Download
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </InvestPortalLayout>
  )
}
