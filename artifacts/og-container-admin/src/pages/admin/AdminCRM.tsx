import { useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Target, Users, TrendingUp, Phone, Mail, Calendar, MessageSquare, Plus, CheckCircle2, DollarSign, Activity, X } from "lucide-react"
import { getCRMLeads, getCRMActivities, updateLeadStage, addCRMActivity, type AdminCRMLead, type AdminCRMActivity } from "@/lib/admin-data"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const TABS = [
  { id: "pipeline", label: "Buyer Pipeline" },
  { id: "leads", label: "Lead Management" },
  { id: "activities", label: "Activities" },
]

const STAGES = ["New Lead", "Contacted", "Meeting Scheduled", "RFQ Sent", "Negotiation", "Won", "Lost"]

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "#94a3b8",
  "Contacted": "#3b82f6",
  "Meeting Scheduled": "#f59e0b",
  "RFQ Sent": GOLD,
  "Negotiation": "#8b5cf6",
  "Won": GREEN,
  "Lost": "#ef4444",
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm">
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

export default function AdminCRM() {
  const [activeTab, setActiveTab] = useState("pipeline")
  const [leads, setLeads] = useState<AdminCRMLead[]>(() => getCRMLeads())
  const [activities, setActivities] = useState<AdminCRMActivity[]>(() => getCRMActivities())
  const [toast, setToast] = useState("")
  const [showActivity, setShowActivity] = useState<string | null>(null)
  const [actForm, setActForm] = useState({ type: "Email", note: "" })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }
  const refresh = () => { setLeads(getCRMLeads()); setActivities(getCRMActivities()) }

  const handleMoveStage = (id: string, stage: string) => {
    updateLeadStage(id, stage)
    refresh()
    showToast(`Lead moved to ${stage}`)
  }

  const handleAddActivity = (leadName: string) => {
    if (!actForm.note.trim()) return
    addCRMActivity({ lead: leadName, type: actForm.type, note: actForm.note, time: new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), user: "Admin" })
    refresh()
    setShowActivity(null)
    setActForm({ type: "Email", note: "" })
    showToast(`Activity logged for ${leadName}`)
  }

  const pipelineStages = STAGES.filter(s => s !== "Lost").map(stage => ({
    stage,
    leads: leads.filter(l => l.stage === stage),
    color: STAGE_COLORS[stage],
  }))

  const totalPipelineValue = leads
    .filter(l => l.stage !== "Lost")
    .reduce((sum, l) => {
      const v = parseFloat(l.value.replace(/[^0-9.]/g, ""))
      const multiplier = l.value.includes("M") ? 1000000 : l.value.includes("K") ? 1000 : 1
      return sum + (v * multiplier)
    }, 0)

  const wonLeads = leads.filter(l => l.stage === "Won")
  const wonValue = wonLeads.reduce((sum, l) => {
    const v = parseFloat(l.value.replace(/[^0-9.]/g, ""))
    const multiplier = l.value.includes("M") ? 1000000 : l.value.includes("K") ? 1000 : 1
    return sum + (v * multiplier)
  }, 0)

  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0

  return (
    <AdminLayout title="CRM System" subtitle="Lead management, buyer pipeline and customer analytics">
      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: String(leads.length), icon: Target, color: "#3b82f6" },
            { label: "Pipeline Value", value: `$${totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: GOLD },
            { label: "Win Rate", value: `${winRate}%`, icon: TrendingUp, color: GREEN },
            { label: "Won Value", value: `$${wonValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CheckCircle2, color: EMERALD },
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
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Pipeline */}
            {activeTab === "pipeline" && (
              <div className="overflow-x-auto">
                <div className="flex gap-3 min-w-max pb-2">
                  {pipelineStages.map(ps => (
                    <div key={ps.stage} className="w-56 shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: ps.color }} />
                        <span className="text-[12px] font-semibold">{ps.stage}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{ps.leads.length}</span>
                      </div>
                      <div className="space-y-2">
                        {ps.leads.map(lead => (
                          <div key={lead.id} className="bg-white border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="font-semibold text-[12px] mb-0.5">{lead.name}</div>
                            <div className="text-[10px] text-muted-foreground">{lead.contact} · {lead.country}</div>
                            <div className="text-[11px] font-bold mt-1.5" style={{ color: GOLD }}>{lead.value}</div>
                            <div className="text-[10px] text-muted-foreground">{lead.product}</div>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {STAGES.filter(s => s !== ps.stage).slice(0, 2).map(s => (
                                <button key={s} onClick={() => handleMoveStage(lead.id, s)}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors whitespace-nowrap">
                                  → {s}
                                </button>
                              ))}
                              <button onClick={() => setShowActivity(lead.id)}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors">
                                + Log
                              </button>
                            </div>
                          </div>
                        ))}
                        {ps.leads.length === 0 && <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-[11px] text-muted-foreground">No leads</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead Management */}
            {activeTab === "leads" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Lead", "Country", "Value", "Product", "Contact", "Stage", "Date", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3 font-semibold text-[13px]">{l.name}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{l.country}</td>
                        <td className="px-3 py-3 text-[12px] font-bold" style={{ color: GOLD }}>{l.value}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{l.product}</td>
                        <td className="px-3 py-3 text-[12px]">{l.contact}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${STAGE_COLORS[l.stage]}20`, color: STAGE_COLORS[l.stage] }}>{l.stage}</span>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{l.date}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {STAGES.indexOf(l.stage) < STAGES.length - 2 && (
                              <button onClick={() => handleMoveStage(l.id, STAGES[STAGES.indexOf(l.stage) + 1])}
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap"
                                style={{ background: EMERALD }}>
                                → Next Stage
                              </button>
                            )}
                            <button onClick={() => setShowActivity(l.id)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">Log</button>
                            {l.stage !== "Won" && <button onClick={() => handleMoveStage(l.id, "Won")} className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600">Won</button>}
                            {l.stage !== "Lost" && <button onClick={() => handleMoveStage(l.id, "Lost")} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500">Lost</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No leads found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Activities */}
            {activeTab === "activities" && (
              <div className="space-y-3">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-4 border border-border rounded-xl hover:bg-muted/20">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#eff6ff" }}>
                      {a.type === "Call" && <Phone className="w-4 h-4 text-blue-600" />}
                      {a.type === "Email" && <Mail className="w-4 h-4 text-blue-600" />}
                      {a.type === "Meeting" && <Calendar className="w-4 h-4 text-blue-600" />}
                      {a.type === "Note" && <MessageSquare className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{a.lead}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">{a.type}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{a.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{a.user} · {a.time}</p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No activities logged yet</div>}
              </div>
            )}
          </div>
        </div>

        {/* Log Activity Modal */}
        {showActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 className="font-bold text-sm">Log Activity</h3>
                <button onClick={() => setShowActivity(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Activity Type</label>
                  <select value={actForm.type} onChange={e => setActForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background">
                    {["Email", "Call", "Meeting", "Note", "Task"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Notes *</label>
                  <textarea value={actForm.note} onChange={e => setActForm(f => ({ ...f, note: e.target.value }))} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" placeholder="What happened? What was discussed?" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowActivity(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Cancel</button>
                  <button
                    onClick={() => {
                      const lead = leads.find(l => l.id === showActivity)
                      if (lead) handleAddActivity(lead.name)
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: EMERALD }}>
                    Log Activity
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </AdminLayout>
  )
}
