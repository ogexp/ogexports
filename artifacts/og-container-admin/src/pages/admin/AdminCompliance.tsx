import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { FileCheck, AlertTriangle, ScrollText, Shield, CheckCircle2, XCircle, Search, Landmark } from "lucide-react"
import { getKYC, getAML, getAuditLogs, approveKYCAsync, rejectKYCAsync, updateAMLStatus, type AdminKYC, type AdminAMLAlert, type AdminAuditLog } from "@/lib/admin-data"
import { AdminKycReviewPanel } from "@/components/admin/AdminKycReviewPanel"
import { BankAccountReviews } from "@/pages/admin/BankAccountReviews"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const TABS = [
  { id: "kyc", label: "KYC Review", icon: FileCheck },
  { id: "banks", label: "Bank Reviews", icon: Landmark },
  { id: "aml", label: "AML Alerts", icon: AlertTriangle },
  { id: "audit", label: "Audit Logs", icon: ScrollText },
  { id: "risk", label: "Risk Management", icon: Shield },
]

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm">
      {type === "success" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

export default function AdminCompliance() {
  const initialTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab")
      if (t && ["kyc", "banks", "aml", "audit", "risk"].includes(t)) return t
    } catch { /* ignore */ }
    return "kyc"
  })()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [kyc, setKYC] = useState<AdminKYC[]>(() => getKYC())
  const [aml, setAML] = useState<AdminAMLAlert[]>(() => getAML())
  const [logs, setLogs] = useState<AdminAuditLog[]>(() => getAuditLogs())
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLogs(getAuditLogs())
  }, [activeTab])

  useEffect(() => {
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get("tab")
      if (t && ["kyc", "banks", "aml", "audit", "risk"].includes(t)) setActiveTab(t)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  function selectTab(id: string) {
    setActiveTab(id)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", id)
    window.history.replaceState({}, "", url.toString())
  }
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [selectedKYC, setSelectedKYC] = useState<AdminKYC | null>(null)
  const [kycAction, setKycAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null)

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const refresh = () => {
    setKYC(getKYC())
    setAML(getAML())
    setLogs(getAuditLogs())
  }

  const handleApproveKYC = async (id: string, name: string) => {
    setKycAction({ id, action: "approve" })
    try {
      await approveKYCAsync(id)
      refresh()
      setSelectedKYC(null)
      showToast(`KYC approved — ${name}`, "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KYC approval failed", "error")
    } finally {
      setKycAction(null)
    }
  }

  const handleRejectKYC = async (id: string, name: string) => {
    setKycAction({ id, action: "reject" })
    try {
      await rejectKYCAsync(id)
      refresh()
      setSelectedKYC(null)
      showToast(`KYC rejected — ${name}`, "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "KYC rejection failed", "error")
    } finally {
      setKycAction(null)
    }
  }

  const handleAML = (id: string, status: AdminAMLAlert["status"]) => {
    updateAMLStatus(id, status)
    refresh()
    showToast(`AML alert ${id} updated to ${status}`)
  }

  const KYC_STATUS: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#fffbeb", color: "#f59e0b", label: "Pending" },
    approved: { bg: "#f0fdf4", color: GREEN, label: "Approved" },
    rejected: { bg: "#fef2f2", color: "#ef4444", label: "Rejected" },
    review: { bg: "#eff6ff", color: "#3b82f6", label: "Under Review" },
  }

  const AML_SEVERITY: Record<string, { bg: string; color: string }> = {
    high: { bg: "#fef2f2", color: "#ef4444" },
    medium: { bg: "#fffbeb", color: "#f59e0b" },
    low: { bg: "#f0fdf4", color: GREEN },
  }

  const AML_STATUS: Record<string, { bg: string; color: string }> = {
    open: { bg: "#eff6ff", color: "#3b82f6" },
    investigating: { bg: "#fffbeb", color: "#f59e0b" },
    resolved: { bg: "#f0fdf4", color: GREEN },
  }

  const filteredKYC = kyc.filter(k => k.name.toLowerCase().includes(search.toLowerCase()) || k.country.toLowerCase().includes(search.toLowerCase()))
  const filteredAML = aml.filter(a => a.user.toLowerCase().includes(search.toLowerCase()))
  const filteredLogs = logs.filter(l => l.action.toLowerCase().includes(search.toLowerCase()) || l.actor.toLowerCase().includes(search.toLowerCase()))

  const pendingKYC = kyc.filter(k => k.status === "pending" || k.status === "review").length
  const openAML = aml.filter(a => a.status === "open").length

  const lowRisk = kyc.filter(k => k.risk === "low").length
  const medRisk = kyc.filter(k => k.risk === "medium").length
  const highRisk = kyc.filter(k => k.risk === "high").length
  const riskTotal = Math.max(kyc.length, 1)
  const riskProfiles = [
    { category: "Low Risk", desc: "Verified buyers from low-risk jurisdictions", count: lowRisk, pct: Math.round((lowRisk / riskTotal) * 100), color: GREEN },
    { category: "Medium Risk", desc: "New buyers or unverified markets", count: medRisk, pct: Math.round((medRisk / riskTotal) * 100), color: GOLD },
    { category: "High Risk", desc: "Flagged by AML or from high-risk countries", count: highRisk, pct: Math.round((highRisk / riskTotal) * 100), color: "#ef4444" },
  ]

  const countryRiskMap = new Map<string, { country: string; risk: string; buyers: number; color: string }>()
  for (const row of kyc) {
    const country = (row.country || "Unknown").trim() || "Unknown"
    const existing = countryRiskMap.get(country)
    const riskRank = { high: 3, medium: 2, low: 1 } as const
    const nextRisk = row.risk || "low"
    if (!existing) {
      countryRiskMap.set(country, {
        country,
        risk: nextRisk.charAt(0).toUpperCase() + nextRisk.slice(1),
        buyers: 1,
        color: nextRisk === "high" ? "#ef4444" : nextRisk === "medium" ? GOLD : GREEN,
      })
    } else {
      existing.buyers += 1
      const currentRank = riskRank[existing.risk.toLowerCase() as keyof typeof riskRank] || 1
      const nextRank = riskRank[nextRisk] || 1
      if (nextRank > currentRank) {
        existing.risk = nextRisk.charAt(0).toUpperCase() + nextRisk.slice(1)
        existing.color = nextRisk === "high" ? "#ef4444" : nextRisk === "medium" ? GOLD : GREEN
      }
    }
  }
  const countryRisk = Array.from(countryRiskMap.values()).sort((a, b) => b.buyers - a.buyers)

  return (
    <AdminLayout title="Compliance Center" subtitle="KYC, AML monitoring, audit trails and risk management">
      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending KYC", value: String(pendingKYC), icon: FileCheck, color: "#f59e0b" },
            { label: "AML Alerts Open", value: String(openAML), icon: AlertTriangle, color: "#ef4444" },
            { label: "Approved", value: String(kyc.filter(k => k.status === "approved").length), icon: CheckCircle2, color: GREEN },
            { label: "Audit Logs", value: String(logs.length), icon: ScrollText, color: EMERALD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border">
          <div className="flex gap-1 p-4 border-b border-border overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { selectTab(t.id); setSearch("") }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {(activeTab === "kyc" || activeTab === "banks" || activeTab === "aml" || activeTab === "audit") && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none" />
                </div>
              </div>
            )}

            {activeTab === "banks" && (
              <BankAccountReviews search={search} onToast={showToast} />
            )}

            {/* KYC */}
            {activeTab === "kyc" && (
              <div className="space-y-3">
                {filteredKYC.map(k => {
                  const st = KYC_STATUS[k.status]
                  const riskColor = k.risk === "high" ? "#ef4444" : k.risk === "medium" ? "#f59e0b" : GREEN
                  return (
                    <div key={k.id} className="border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-mono text-muted-foreground">{k.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: k.risk === "high" ? "#fef2f2" : k.risk === "medium" ? "#fffbeb" : "#f0fdf4", color: riskColor }}>{k.risk} risk</span>
                          </div>
                          <div className="font-semibold text-sm">{k.name}</div>
                          <div className="text-[11px] text-muted-foreground">{k.type === "company" ? "Company" : "Individual"} · {k.country} · Submitted {k.submitted}</div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {k.docs.map(d => <span key={d} className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">{d}</span>)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button onClick={() => setSelectedKYC(selectedKYC?.id === k.id ? null : k)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted transition-colors">
                            {selectedKYC?.id === k.id ? "Hide" : "Review"}
                          </button>
                          {(k.status === "pending" || k.status === "review") && (
                            <>
                              <button disabled={kycAction?.id === k.id} onClick={() => void handleApproveKYC(k.id, k.name)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white"
                                style={{ background: GREEN }}>
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />{kycAction?.id === k.id && kycAction.action === "approve" ? "Approving…" : "Approve"}
                              </button>
                              <button disabled={kycAction?.id === k.id} onClick={() => void handleRejectKYC(k.id, k.name)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white">
                                <XCircle className="w-3 h-3 inline mr-1" />{kycAction?.id === k.id && kycAction.action === "reject" ? "Rejecting…" : "Reject"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedKYC?.id === k.id && (
                        <AdminKycReviewPanel
                          kyc={k}
                          onUpdated={refresh}
                          onClose={() => setSelectedKYC(null)}
                        />
                      )}
                    </div>
                  )
                })}
                {filteredKYC.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No KYC records found</div>}
              </div>
            )}

            {/* AML */}
            {activeTab === "aml" && (
              <div className="space-y-3">
                {filteredAML.map(a => {
                  const sev = AML_SEVERITY[a.severity]
                  const st = AML_STATUS[a.status]
                  return (
                    <div key={a.id} className="border border-border rounded-xl p-4 hover:bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-mono text-muted-foreground">{a.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: sev.bg, color: sev.color }}>{a.severity}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: st.bg, color: st.color }}>{a.status}</span>
                          </div>
                          <div className="font-semibold text-sm">{a.user}</div>
                          <div className="text-[11px] text-muted-foreground">{a.type} · {a.amount} · Flagged {a.flagged}</div>
                          <div className="text-[11px] mt-1 text-foreground/70">{a.details}</div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {a.status === "open" && <button onClick={() => handleAML(a.id, "investigating")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "#f59e0b" }}>Investigate</button>}
                          {a.status !== "resolved" && <button onClick={() => handleAML(a.id, "resolved")} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: GREEN }}>Resolve</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredAML.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No AML alerts found</div>}
              </div>
            )}

            {/* Audit Logs */}
            {activeTab === "audit" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Log ID", "Actor", "Action", "Module", "IP", "Timestamp"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(l => (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3 text-[10px] font-mono text-muted-foreground">{l.id}</td>
                        <td className="px-3 py-3 text-[11px] font-medium">{l.actor}</td>
                        <td className="px-3 py-3 text-[11px]">{l.action}</td>
                        <td className="px-3 py-3"><span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">{l.module}</span></td>
                        <td className="px-3 py-3 text-[11px] font-mono text-muted-foreground">{l.ip}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{l.timestamp}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No audit logs found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Risk */}
            {activeTab === "risk" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  {riskProfiles.map(r => (
                    <div key={r.category} className="p-4 border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-sm">{r.category}</div>
                        <span className="text-2xl font-bold" style={{ color: r.color }}>{r.count}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-3">Country Risk Profiles</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {countryRisk.length === 0 ? (
                      <div className="col-span-full text-sm text-muted-foreground py-6 text-center">No KYC country risk data yet</div>
                    ) : countryRisk.map(c => (
                      <div key={c.country} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                          <span className="text-sm font-medium">{c.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{c.buyers} buyers</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: c.color === GREEN ? "#f0fdf4" : c.color === GOLD ? "#fffbeb" : "#fef2f2", color: c.color }}>{c.risk}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
