import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCurrency } from "@/lib/use-currency"
import { formatInvestorLedgerAmount } from "@/lib/format-investor-ledger"
import { api, ApiError, downloadAuthenticatedFile } from "@/lib/api"
import { notify } from "@/lib/notify"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  FileText, Download, TrendingUp, DollarSign, Calendar,
  BarChart3, FileSpreadsheet, CheckCircle2, Loader2
} from "lucide-react"

const REPORT_TYPES = [
  { id: "portfolio", label: "Portfolio Report", icon: BarChart3, desc: "Full snapshot of all investments, balances and allocation" },
  { id: "profit", label: "Profit Report", icon: TrendingUp, desc: "Detailed breakdown of all earnings, ROI and profit trends" },
  { id: "annual", label: "Annual Report", icon: Calendar, desc: "Comprehensive yearly financial summary for tax purposes" },
  { id: "monthly", label: "Monthly Report", icon: FileText, desc: "Month-by-month performance overview" },
  { id: "custom", label: "Custom Date Range", icon: Calendar, desc: "Generate a report for any specific date range" },
]

interface ReportsSummary {
  total_invested: number
  total_profit_earned: number
  total_invested_usd?: number | null
  total_profit_earned_usd?: number | null
  lifetime_roi: number
  reports_generated: number
}

interface MonthlyPoint {
  month: string
  month_key?: string
  investment: number
  profit: number
  roi: number
}

interface ReportHistoryItem {
  id: number
  name: string
  date?: string | null
  date_label?: string | null
  type: string
  size?: number
  size_label: string
  status: string
}

interface ReportsPayload {
  has_investments: boolean
  summary: ReportsSummary
  monthly_series: MonthlyPoint[]
  history: ReportHistoryItem[]
}

function n(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function ChartEmpty({ message = "Data not available" }: { message?: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export default function InvestReports() {
  const c = useCurrency()
  const queryClient = useQueryClient()
  const [selectedReport, setSelectedReport] = useState("portfolio")
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(0, 1)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [format, setFormat] = useState("PDF")
  const [generated, setGenerated] = useState(false)

  const { data: payload, isLoading } = useQuery({
    queryKey: ["investor-reports"],
    queryFn: () => api.get<{ data: ReportsPayload }>("/api/investor/reports"),
  })

  const reports = payload?.data
  const hasInvestments = Boolean(reports?.has_investments)
  const summary: ReportsSummary = {
    total_invested: n(reports?.summary?.total_invested),
    total_profit_earned: n(reports?.summary?.total_profit_earned),
    total_invested_usd: reports?.summary?.total_invested_usd != null
      ? n(reports.summary.total_invested_usd)
      : null,
    total_profit_earned_usd: reports?.summary?.total_profit_earned_usd != null
      ? n(reports.summary.total_profit_earned_usd)
      : null,
    lifetime_roi: n(reports?.summary?.lifetime_roi),
    reports_generated: n(reports?.summary?.reports_generated),
  }
  const monthlyData = useMemo(
    () => (reports?.monthly_series || []).map(row => ({
      month: row.month,
      investment: n(row.investment),
      profit: n(row.profit),
      roi: n(row.roi),
    })),
    [reports?.monthly_series],
  )
  const history = reports?.history || []

  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {
        report_type: selectedReport,
        format,
      }
      if (selectedReport === "custom" || selectedReport === "monthly") {
        if (startDate) body.start_date = startDate
        if (endDate) body.end_date = endDate
      }
      return api.post<{ data: { report: ReportHistoryItem; download_url: string } }>(
        "/api/investor/reports",
        body,
      )
    },
    onSuccess: async (res) => {
      const downloadUrl = res.data.download_url
      try {
        await downloadAuthenticatedFile(downloadUrl, res.data.report.name || "investor-report")
        setGenerated(true)
        notify.success("Report ready", "Your report has been downloaded.")
      } catch {
        notify.error("Download failed", "Report was generated but could not be downloaded.")
      }
      await queryClient.invalidateQueries({ queryKey: ["investor-reports"] })
    },
    onError: (error) => {
      setGenerated(false)
      const message = error instanceof ApiError
        ? error.message
        : "Unable to generate report."
      notify.error("Generate failed", message)
    },
  })

  function handleGenerate() {
    if (!hasInvestments) {
      notify.error(
        "No investments",
        "You have not invested yet please make new investments to view reports",
      )
      return
    }
    setGenerated(false)
    generateMutation.mutate()
  }

  const generating = generateMutation.isPending
  const cardValue = (value: string) => (isLoading ? "—" : value)
  const fmtWallet = (amount: number, usdAmount?: number | null) =>
    formatInvestorLedgerAmount(c, amount, {
      usdAmount,
      ledgerCurrency: c.walletCurrency,
      lockedRate: c.isPK && c.rate > 0 ? c.rate : null,
    })

  return (
    <InvestPortalLayout title="Investment Reports" subtitle="Generate and download detailed financial reports">
      <div className="space-y-8">

        {/* Summary KPIs */}
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "Total Invested", value: cardValue(fmtWallet(summary.total_invested, summary.total_invested_usd)), icon: DollarSign, color: "text-primary" },
            { label: "Total Profit Earned", value: cardValue(fmtWallet(summary.total_profit_earned, summary.total_profit_earned_usd)), icon: TrendingUp, color: "text-emerald-500" },
            { label: "Lifetime ROI", value: cardValue(`${summary.lifetime_roi}%`), icon: BarChart3, color: "text-accent" },
            { label: "Reports Generated", value: cardValue(String(summary.reports_generated)), icon: FileText, color: "text-blue-500" },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="font-heading font-bold text-lg">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">Monthly Investment vs Profit</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[220px] flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : monthlyData.length === 0 ? (
                <ChartEmpty message="No investment data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => fmtWallet(v)} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(v: number) => [fmtWallet(v), ""]}
                    />
                    <Bar dataKey="investment" fill="hsl(var(--primary))" name="Investment" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="profit" fill="#C6A969" name="Profit" radius={[3, 3, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">ROI Trend (%)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[220px] flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : monthlyData.length === 0 ? (
                <ChartEmpty message="No ROI data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(v: number) => [`${v}%`, "ROI"]}
                    />
                    <Line type="monotone" dataKey="roi" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a" }} name="ROI %" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report generator */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Generate Report</CardTitle>
            <p className="text-sm text-muted-foreground">Select a report type, configure parameters, and download</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isLoading && !hasInvestments ? (
              <div className="rounded-xl border border-border bg-muted/20 px-5 py-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  You have not invested yet please make new investments to view reports
                </p>
              </div>
            ) : (
              <>
                {/* Report type */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {REPORT_TYPES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReport(r.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${selectedReport === r.id ? "border-primary bg-primary/8 ring-1 ring-primary" : "border-border hover:border-border/80 bg-muted/20"}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <r.icon className={`w-4 h-4 ${selectedReport === r.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">{r.label}</span>
                        {selectedReport === r.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Date range (always show for custom, optionally for others) */}
                {(selectedReport === "custom" || selectedReport === "monthly") && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Start Date</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Date</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Format selection */}
                <div className="space-y-2">
                  <Label>Download Format</Label>
                  <div className="flex gap-3">
                    {[
                      { id: "PDF", icon: FileText, label: "PDF" },
                      { id: "Excel", icon: FileSpreadsheet, label: "Excel" },
                      { id: "CSV", icon: FileText, label: "CSV" },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${format === f.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"}`}
                      >
                        <f.icon className="w-4 h-4" />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 max-w-xs"
                    onClick={handleGenerate}
                    disabled={generating || isLoading || !hasInvestments}
                  >
                    {generating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate & Download {format}
                      </>
                    )}
                  </Button>
                  {generated && (
                    <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Report ready!
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Report history */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Report History</CardTitle>
            <p className="text-sm text-muted-foreground">Previously generated reports</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Report Name", "Generated", "Format", "Size", "Status", "Download"].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                        Loading report history…
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No reports generated yet
                      </td>
                    </tr>
                  ) : (
                    history.map(r => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 font-medium">{r.name}</td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{r.date_label || r.date || "—"}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{r.size_label}</td>
                        <td className="py-3 px-3">
                          <Badge className="text-[10px] border-0 bg-emerald-500/15 text-emerald-600">{r.status}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                            onClick={async () => {
                              try {
                                await downloadAuthenticatedFile(
                                  `/api/investor/reports/${r.id}/download`,
                                  r.name || "investor-report",
                                )
                              } catch {
                                notify.error("Download failed", "Unable to download this report.")
                              }
                            }}
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </InvestPortalLayout>
  )
}
