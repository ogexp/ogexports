import { useState, useRef, useEffect, useCallback } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Link } from "wouter"
import { MessageSquare, AlertTriangle, CheckCircle2, Clock, Search, User, ArrowUpRight, Send, X, Loader2 } from "lucide-react"
import { getTickets, initAdminData, type AdminTicket } from "@/lib/admin-data"
import { api } from "@/lib/api"
import { notify } from "@/lib/notify"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  open: { bg: "#eff6ff", color: "#3b82f6" },
  escalated: { bg: "#fef2f2", color: "#ef4444" },
  pending: { bg: "#fffbeb", color: "#f59e0b" },
  resolved: { bg: "#f0fdf4", color: GREEN },
  closed: { bg: "#f8fafc", color: "#94a3b8" },
}

const PRIORITY_MAP: Record<string, { bg: string; color: string }> = {
  high: { bg: "#fef2f2", color: "#ef4444" },
  medium: { bg: "#fffbeb", color: "#f59e0b" },
  low: { bg: "#f0fdf4", color: GREEN },
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

export default function AdminSupport() {
  const [tickets, setTickets] = useState<AdminTicket[]>(() => getTickets())
  const [counts, setCounts] = useState({ open: 0, pending: 0, escalated: 0, resolved: 0, total: 0 })
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<AdminTicket | null>(null)
  const [reply, setReply] = useState("")
  const [toast, setToast] = useState("")
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [savingSupportAction, setSavingSupportAction] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    await initAdminData()
    const updated = getTickets()
    setTickets(updated)
    if (selected) {
      const found = updated.find(t => t.id === selected.id)
      if (found) setSelected(prev => prev ? { ...found, messages: prev.messages?.length ? prev.messages : found.messages } : found)
    }
    try {
      const res = await api.get<any>("/api/admin/support/tickets", { per_page: 1 })
      if (res?.counts) {
        setCounts({
          open: res.counts.open ?? 0,
          pending: res.counts.pending ?? 0,
          escalated: res.counts.escalated ?? 0,
          resolved: res.counts.resolved ?? 0,
          total: res.counts.total ?? updated.length,
        })
      } else {
        setCounts({
          open: updated.filter(t => t.status === "open").length,
          pending: updated.filter(t => t.status === "pending").length,
          escalated: updated.filter(t => t.status === "escalated").length,
          resolved: updated.filter(t => t.status === "resolved" || t.status === "closed").length,
          total: updated.length,
        })
      }
    } catch {
      setCounts({
        open: updated.filter(t => t.status === "open").length,
        pending: updated.filter(t => t.status === "pending").length,
        escalated: updated.filter(t => t.status === "escalated").length,
        resolved: updated.filter(t => t.status === "resolved" || t.status === "closed").length,
        total: updated.length,
      })
    }
  }, [selected])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const refreshCounts = async () => {
    try {
      const res = await api.get<any>("/api/admin/support/tickets", { per_page: 1 })
      if (res?.counts) {
        setCounts({
          open: res.counts.open ?? 0,
          pending: res.counts.pending ?? 0,
          escalated: res.counts.escalated ?? 0,
          resolved: res.counts.resolved ?? 0,
          total: res.counts.total ?? 0,
        })
      }
    } catch {
      // Preserve the last known counts if the summary request fails.
    }
  }

  useEffect(() => {
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selected?.messages?.length])

  async function selectTicket(t: AdminTicket) {
    setSelected(t)
    setLoadingDetail(true)
    try {
      const res = await api.get<{ data: any }>(`/api/admin/support/tickets/${t.id}`)
      const raw = res.data
      const msgs = Array.isArray(raw.messages)
        ? raw.messages.map((m: any) => ({
          from: m.user?.name || (m.is_admin ? "OGSupport" : "User"),
          text: m.body || "",
          time: m.created_at ? new Date(m.created_at).toLocaleString() : "",
          isAdmin: Boolean(m.is_admin),
        }))
        : []
      setSelected({
        ...t,
        ticketNumber: raw.ticket_number || t.ticketNumber,
        subject: raw.subject || t.subject,
        contactName: raw.contact_name,
        contactEmail: raw.contact_email,
        contactPhone: raw.contact_phone,
        messages: msgs,
        msgs: msgs.length,
      })
      await api.post(`/api/admin/support/tickets/${t.id}/read`).catch(() => null)
      window.dispatchEvent(new CustomEvent("og-admin-unread"))
    } catch (e: any) {
      notify.error(e?.message || "Failed to load ticket")
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleReply = async () => {
    if (!selected || !reply.trim() || savingSupportAction) return
    const body = reply.trim()
    setSavingSupportAction(true)
    try {
      const response = await api.post<{ data?: any }>(`/api/admin/support/tickets/${selected.id}/reply`, { body })
      const message = response?.data
      const sentAt = message?.created_at ? new Date(message.created_at).toLocaleString() : new Date().toLocaleString()
      setSelected(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), {
          from: message?.user?.name || "OGSupport",
          text: message?.body || body,
          time: sentAt,
          isAdmin: true,
        }],
        msgs: (prev.msgs || 0) + 1,
        status: prev.status === "open" ? "pending" : prev.status,
      } : prev)
      setTickets(prev => prev.map(ticket => ticket.id === selected.id
        ? { ...ticket, status: ticket.status === "open" ? "pending" : ticket.status, msgs: (ticket.msgs || 0) + 1, lastReply: sentAt }
        : ticket))
      setReply("")
      showToast("Reply sent")
      void refreshCounts()
    } catch (e: any) {
      notify.error(e?.message || "Failed to send reply")
    } finally {
      setSavingSupportAction(false)
    }
  }

  const handleStatus = async (status: AdminTicket["status"]) => {
    if (!selected || savingSupportAction) return
    setSavingSupportAction(true)
    try {
      await api.patch(`/api/admin/support/tickets/${selected.id}/status`, { status })
      setSelected(prev => prev ? { ...prev, status } : prev)
      setTickets(prev => prev.map(ticket => ticket.id === selected.id ? { ...ticket, status } : ticket))
      showToast(`Ticket ${selected.ticketNumber || selected.id} updated to ${status}`)
      void refreshCounts()
    } catch (e: any) {
      notify.error(e?.message || "Failed to update ticket")
    } finally {
      setSavingSupportAction(false)
    }
  }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    return (
      t.subject.toLowerCase().includes(q) ||
      t.user.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.ticketNumber || "").toLowerCase().includes(q)
    )
  })

  return (
    <AdminLayout title="Support Center" subtitle="Ticket management, escalations and resolution tracking">
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-900/10 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white p-2 text-emerald-900"><MessageSquare className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">Need to help someone right now?</p>
              <p className="mt-1 text-xs text-emerald-900/70">Open live conversations, reply to investors, and track unread messages.</p>
            </div>
          </div>
          <Link href="/admin/messages" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900">
            <MessageSquare className="h-4 w-4" /> Open live chat
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Open", value: String(counts.open), icon: MessageSquare, color: "#3b82f6" },
            { label: "Pending", value: String(counts.pending), icon: Clock, color: "#f59e0b" },
            { label: "Escalated", value: String(counts.escalated), icon: AlertTriangle, color: "#ef4444" },
            { label: "Completed", value: String(counts.resolved), icon: CheckCircle2, color: GREEN },
            { label: "Total", value: String(counts.total), icon: Clock, color: GOLD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by number, title, user…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {filtered.map(t => {
                const st = STATUS_MAP[t.status] || STATUS_MAP.open
                const pr = PRIORITY_MAP[t.priority] || PRIORITY_MAP.medium
                const isSelected = selected?.id === t.id
                return (
                  <div
                    key={t.id}
                    className={`p-4 border-b border-border/50 cursor-pointer transition-colors ${isSelected ? "bg-muted/50" : "hover:bg-muted/20"}`}
                    onClick={() => selectTicket(t)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{t.ticketNumber || t.id}</span>
                      <div className="flex gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: pr.bg, color: pr.color }}>{t.priority.toUpperCase()}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold capitalize" style={{ background: st.bg, color: st.color }}>{t.status}</span>
                      </div>
                    </div>
                    <p className="text-[12px] font-semibold text-foreground mb-1 leading-snug">{t.subject}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" /> {t.user}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> {t.msgs}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t.lastReply}</div>
                  </div>
                )
              })}
              {filtered.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No tickets found</div>}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl border border-border flex flex-col min-h-[400px]">
            {selected ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-mono text-muted-foreground">{selected.ticketNumber || selected.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: PRIORITY_MAP[selected.priority]?.bg, color: PRIORITY_MAP[selected.priority]?.color }}>{selected.priority} priority</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: STATUS_MAP[selected.status]?.bg, color: STATUS_MAP[selected.status]?.color }}>{selected.status}</span>
                      </div>
                      <h3 className="text-sm font-bold leading-snug">{selected.subject}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{selected.user} ({selected.type})</span>
                        {selected.contactEmail && <span>{selected.contactEmail}</span>}
                        {selected.contactPhone && <span>{selected.contactPhone}</span>}
                        <span>Created: {selected.created}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      {(selected.status === "open" || selected.status === "escalated" || selected.status === "pending") && (
                        <button onClick={() => handleStatus("resolved")}
                          disabled={savingSupportAction}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: GREEN }}>
                          <CheckCircle2 className="w-3 h-3" /> Resolve
                        </button>
                      )}
                      {selected.status === "open" && (
                        <button onClick={() => handleStatus("escalated")}
                          disabled={savingSupportAction}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white">
                          <ArrowUpRight className="w-3 h-3" /> Escalate
                        </button>
                      )}
                      {selected.status === "resolved" && (
                        <button onClick={() => handleStatus("closed")}
                          disabled={savingSupportAction}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-600 text-white">
                          <X className="w-3 h-3" /> Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[200px] max-h-[320px]">
                  {loadingDetail && (
                    <div className="flex justify-center py-8 text-muted-foreground gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  )}
                  {(selected.messages || []).map((msg, i) => (
                    <div key={i} className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.isAdmin ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                        style={{
                          background: msg.isAdmin ? "#f1f5f9" : "#fef2f2",
                          color: "#1e293b",
                          border: msg.isAdmin ? undefined : "1px solid #fecaca",
                        }}
                      >
                        <div className="text-[11px] font-semibold mb-0.5 opacity-80">
                          {msg.isAdmin ? "OGSupport" : msg.from} · {msg.time}
                        </div>
                        <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      rows={2}
                      placeholder="Write a reply…"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!reply.trim() || savingSupportAction}
                      className="px-4 rounded-lg text-white disabled:opacity-50 self-end"
                      style={{ background: EMERALD }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a ticket to view details
              </div>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </AdminLayout>
  )
}
