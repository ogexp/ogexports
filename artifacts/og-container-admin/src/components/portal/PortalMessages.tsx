import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  MessageSquare, Send, Paperclip, TicketIcon, Bell,
  Search, User, Building2, Loader2, ImageIcon, X,
} from "lucide-react"
import { api, resolveAttachmentUrl, isImageMime } from "@/lib/api"
import { ChatImagePreview } from "@/components/chat/ChatImagePreview"
import { useLocalAuth } from "@/lib/local-auth"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { notify } from "@/lib/notify"

type ChatMessage = {
  id: number
  sender_id: number
  body: string
  attachment_path?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_mime?: string | null
  created_at: string
  sender?: { id: number; name: string; email: string }
}

type Ticket = {
  id: number
  ticket_number: string
  subject: string
  status: string
  priority: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  created_at: string
  messages?: Array<{
    id: number
    body: string
    is_admin: boolean
    created_at: string
    user?: { name: string }
  }>
}

type Announcement = {
  id: number
  title: string
  body: string
  audience: string
  published_at: string
  is_read?: boolean
  creator?: { name: string }
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return String(iso)
  }
}

type LayoutProps = {
  children: ReactNode
  title: string
  subtitle?: string
}

type PortalMessagesProps = {
  Layout: ComponentType<LayoutProps>
  /** When set, overrides role-based Support tab visibility (buyer/investor portals pass true). */
  showSupport?: boolean
}

export function PortalMessages({ Layout, showSupport: showSupportProp }: PortalMessagesProps) {
  const { user } = useLocalAuth()
  const { accountType: safeAccountType } = useSafeAuth()
  const accountType = user?.accountType ?? safeAccountType
  const showSupport = showSupportProp ?? (accountType === "buyer" || accountType === "investor")
  const [activeTab, setActiveTab] = useState<"inbox" | "tickets" | "announcements">("inbox")
  const [unreadInbox, setUnreadInbox] = useState(0)
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0)
  const [unreadTickets, setUnreadTickets] = useState(0)

  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMsg, setNewMsg] = useState("")
  const [inboxLoading, setInboxLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [pendingImage, setPendingImage] = useState<{
    path: string; url: string; name: string; mime: string
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketSearch, setTicketSearch] = useState("")
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    body: "",
    contact_name: user?.fullName || user?.name || "",
    contact_email: user?.email || "",
    contact_phone: user?.phone || "",
  })
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketDetailOpen, setTicketDetailOpen] = useState(false)
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [annLoading, setAnnLoading] = useState(false)

  const myId = Number(user?.id || 0)

  const refreshUnread = useCallback(async () => {
    try {
      const requests: Array<Promise<{ data: { unread_count: number } }>> = [
        api.get<{ data: { unread_count: number } }>("/api/messages/unread-count"),
        api.get<{ data: { unread_count: number } }>("/api/announcements/unread-count"),
      ]
      if (showSupport) {
        requests.push(api.get<{ data: { unread_count: number } }>("/api/support/tickets/unread-count"))
      }
      const [msgRes, annRes, ticketRes] = await Promise.all(requests)
      const msgCount = msgRes?.data?.unread_count ?? 0
      const annCount = annRes?.data?.unread_count ?? 0
      const ticketCount = showSupport ? (ticketRes?.data?.unread_count ?? 0) : 0
      setUnreadInbox(msgCount)
      setUnreadAnnouncements(annCount)
      setUnreadTickets(ticketCount)
      window.dispatchEvent(new CustomEvent("og-unread-messages", {
        detail: { count: msgCount + annCount + ticketCount },
      }))
    } catch {
      // ignore
    }
  }, [showSupport])

  const loadInbox = useCallback(async () => {
    setInboxLoading(true)
    try {
      const res = await api.get<{
        data: { conversation: { id: number }; messages: ChatMessage[]; unread_count: number }
      }>("/api/conversations/with-admin")
      setConversationId(res.data.conversation.id)
      setMessages(res.data.messages || [])
      setUnreadInbox(res.data.unread_count || 0)
      await api.post(`/api/conversations/${res.data.conversation.id}/read`)
      await refreshUnread()
    } catch (e: any) {
      notify.error(e?.message || "Failed to load chat")
    } finally {
      setInboxLoading(false)
    }
  }, [refreshUnread])

  const loadTickets = useCallback(async (search = "") => {
    try {
      const res = await api.get<any>("/api/support/tickets", {
        per_page: 50,
        search: search || undefined,
      })
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || [])
      setTickets(list)
    } catch (e: any) {
      notify.error(e?.message || "Failed to load tickets")
    }
  }, [])

  const loadAnnouncements = useCallback(async () => {
    setAnnLoading(true)
    try {
      const res = await api.get<any>("/api/announcements", { per_page: 50 })
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || [])
      setAnnouncements(list)
      await Promise.all(
        list.filter((a: Announcement) => !a.is_read).map((a: Announcement) =>
          api.post(`/api/announcements/${a.id}/read`).catch(() => null)
        )
      )
      await refreshUnread()
    } catch (e: any) {
      notify.error(e?.message || "Failed to load announcements")
    } finally {
      setAnnLoading(false)
    }
  }, [refreshUnread])

  useEffect(() => {
    refreshUnread()
    const t = setInterval(refreshUnread, 30000)
    return () => clearInterval(t)
  }, [refreshUnread])

  useEffect(() => {
    if (!showSupport && activeTab === "tickets") {
      setActiveTab("inbox")
    }
  }, [showSupport, activeTab])

  useEffect(() => {
    if (activeTab === "inbox") loadInbox()
    if (showSupport && activeTab === "tickets") {
      setTicketForm(f => ({
        ...f,
        contact_name: f.contact_name || user?.fullName || user?.name || "",
        contact_email: f.contact_email || user?.email || "",
        contact_phone: f.contact_phone || user?.phone || "",
      }))
      loadTickets(ticketSearch)
    }
    if (activeTab === "announcements") loadAnnouncements()
  }, [activeTab, showSupport]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, activeTab])

  useEffect(() => {
    if (activeTab !== "inbox" || !conversationId) return
    const t = setInterval(async () => {
      try {
        const res = await api.get<any>(`/api/conversations/${conversationId}/messages`, { per_page: 100 })
        const list = Array.isArray(res?.data) ? res.data : []
        const sorted = [...list].sort(
          (a: ChatMessage, b: ChatMessage) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(sorted)
        await api.post(`/api/conversations/${conversationId}/read`)
        await refreshUnread()
      } catch {
        // ignore poll errors
      }
    }, 15000)
    return () => clearInterval(t)
  }, [activeTab, conversationId, refreshUnread])

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      notify.error("Please choose an image file")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error("Image must be under 10 MB")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "chat")
      const res = await api.upload<{ data: { path: string; url: string; name: string; mime: string } }>(
        "/api/uploads",
        fd
      )
      setPendingImage({
        path: res.data.path,
        url: res.data.url,
        name: res.data.name,
        mime: res.data.mime,
      })
    } catch (e: any) {
      notify.error(e?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function sendMessage() {
    if (!conversationId) return
    if (!newMsg.trim() && !pendingImage) return
    setSending(true)
    try {
      const res = await api.post<{ data: ChatMessage }>(
        `/api/conversations/${conversationId}/messages`,
        {
          body: newMsg.trim() || (pendingImage ? "" : undefined),
          attachment_path: pendingImage?.path,
          attachment_url: pendingImage?.url,
          attachment_name: pendingImage?.name,
          attachment_mime: pendingImage?.mime,
        }
      )
      setMessages(prev => [...prev, res.data])
      setNewMsg("")
      setPendingImage(null)
    } catch (e: any) {
      notify.error(e?.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketForm.subject.trim() || !ticketForm.body.trim()) {
      notify.error("Title and message are required")
      return
    }
    setSubmittingTicket(true)
    try {
      await api.post("/api/support/tickets", {
        subject: ticketForm.subject.trim(),
        body: ticketForm.body.trim(),
        contact_name: ticketForm.contact_name.trim(),
        contact_email: ticketForm.contact_email.trim(),
        contact_phone: ticketForm.contact_phone.trim(),
      })
      notify.success("Support ticket submitted")
      setTicketForm(f => ({ ...f, subject: "", body: "" }))
      await loadTickets(ticketSearch)
    } catch (e: any) {
      notify.error(e?.message || "Failed to submit ticket")
    } finally {
      setSubmittingTicket(false)
    }
  }

  async function openTicket(ticket: Ticket) {
    setTicketDetailLoading(true)
    setTicketDetailOpen(true)
    try {
      const res = await api.get<{ data: Ticket }>(`/api/support/tickets/${ticket.id}`)
      setSelectedTicket(res.data)
      await api.post(`/api/support/tickets/${ticket.id}/read`).catch(() => null)
      await refreshUnread()
    } catch (e: any) {
      notify.error(e?.message || "Failed to load ticket")
      setSelectedTicket(ticket)
    } finally {
      setTicketDetailLoading(false)
    }
  }

  const filteredTickets = tickets.filter(t => {
    const q = ticketSearch.toLowerCase()
    if (!q) return true
    return (
      t.subject.toLowerCase().includes(q) ||
      (t.ticket_number || "").toLowerCase().includes(q)
    )
  })

  const tabs = [
    { key: "inbox" as const, label: "Inbox", badge: unreadInbox },
    ...(showSupport
      ? [{ key: "tickets" as const, label: "Support", badge: unreadTickets }]
      : []),
    { key: "announcements" as const, label: "Announcements", badge: unreadAnnouncements },
  ]

  return (
    <Layout
      title="Communication Centre"
      subtitle={showSupport
        ? "Secure messaging, support tickets and announcements"
        : "Secure messaging and announcements"}
    >
      <div className="space-y-5">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "inbox" && (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Chat with OGSupport
                {unreadInbox > 0 && (
                  <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5 py-0 h-5">
                    {unreadInbox} unread
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col" style={{ height: "min(70vh, 640px)" }}>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {inboxLoading && (
                  <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading messages…
                  </div>
                )}
                {!inboxLoading && messages.length === 0 && (
                  <div className="text-center py-16 text-sm text-muted-foreground">
                    No messages yet. Say hello to OGSupport.
                  </div>
                )}
                {messages.map(m => {
                  const isMine = m.sender_id === myId
                  const fileUrl = resolveAttachmentUrl(m.attachment_path, m.attachment_url)
                  const showAsImage = fileUrl && isImageMime(m.attachment_mime, m.attachment_name)
                  return (
                    <div key={m.id} className={`flex gap-3 ${isMine ? "" : "flex-row-reverse"}`}>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isMine ? "bg-accent/20" : "bg-primary/10"
                        }`}
                      >
                        {isMine
                          ? <User className="w-4 h-4 text-accent" />
                          : <Building2 className="w-4 h-4 text-primary" />}
                      </div>
                      <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${isMine ? "items-start" : "items-end"}`}>
                        <p className="text-[10px] text-muted-foreground px-1">
                          {isMine ? "You" : "OGSupport"} · {fmtDateTime(m.created_at)}
                        </p>
                        <div
                          className={`p-3 rounded-xl text-sm space-y-2 ${
                            isMine
                              ? "bg-accent/15 text-foreground"
                              : "bg-destructive/10 text-foreground border border-destructive/20"
                          }`}
                        >
                          {m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                          {fileUrl && showAsImage && (
                            <ChatImagePreview
                              src={fileUrl}
                              alt={m.attachment_name || "attachment"}
                            />
                          )}
                          {fileUrl && !showAsImage && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
                            >
                              {m.attachment_name || "Open attachment"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
                {pendingImage && (
                  <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate flex-1">{pendingImage.name}</span>
                    <button type="button" onClick={() => setPendingImage(null)}>
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Type a message…"
                    className="flex-1"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) uploadImage(f)
                      e.target.value = ""
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors border border-border"
                    title="Upload image"
                  >
                    {uploading
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : <Paperclip className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <Button size="sm" onClick={sendMessage} disabled={sending || (!newMsg.trim() && !pendingImage)}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showSupport && activeTab === "tickets" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-accent" /> Submit Support Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Ticket Title</Label>
                    <Input
                      value={ticketForm.subject}
                      onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="Brief title for your request"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Your Message</Label>
                    <textarea
                      value={ticketForm.body}
                      onChange={e => setTicketForm(f => ({ ...f, body: e.target.value }))}
                      rows={5}
                      required
                      placeholder="Describe your issue…"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Contact Name</Label>
                      <Input
                        value={ticketForm.contact_name}
                        onChange={e => setTicketForm(f => ({ ...f, contact_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input
                        value={ticketForm.contact_phone}
                        onChange={e => setTicketForm(f => ({ ...f, contact_phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={ticketForm.contact_email}
                      onChange={e => setTicketForm(f => ({ ...f, contact_email: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" disabled={submittingTicket} className="w-full">
                    {submittingTicket ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Ticket
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="space-y-3">
                <CardTitle className="font-heading text-base">Your Tickets</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={ticketSearch}
                    onChange={e => {
                      setTicketSearch(e.target.value)
                      loadTickets(e.target.value)
                    }}
                    placeholder="Search by title or ticket number…"
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
                {filteredTickets.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No tickets found.</p>
                )}
                {filteredTickets.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openTicket(t)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground">{t.ticket_number || `#${t.id}`}</p>
                        <p className="text-sm font-semibold truncate">{t.subject}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{t.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{fmtDateTime(t.created_at)}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="space-y-3">
            {annLoading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading announcements…
              </div>
            )}
            {!annLoading && announcements.length === 0 && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No announcements yet.
                </CardContent>
              </Card>
            )}
            {announcements.map(a => (
              <Card key={a.id} className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-heading font-bold text-sm">{a.title}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize">{a.audience}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {a.creator?.name || "OG Exports"} · {fmtDateTime(a.published_at)}
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-foreground/90">{a.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={ticketDetailOpen} onOpenChange={setTicketDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {selectedTicket?.ticket_number || "Ticket"} — {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {ticketDetailLoading && (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {selectedTicket && !ticketDetailLoading && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">{selectedTicket.status}</Badge>
                <Badge variant="outline" className="capitalize">{selectedTicket.priority}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Contact: {selectedTicket.contact_name || "—"}</div>
                <div>Email: {selectedTicket.contact_email || "—"}</div>
                <div>Phone: {selectedTicket.contact_phone || "—"}</div>
                <div>Created: {fmtDateTime(selectedTicket.created_at)}</div>
              </div>
              <div className="space-y-3 border-t border-border pt-3">
                {(selectedTicket.messages || []).map(m => (
                  <div key={m.id} className={`p-3 rounded-xl ${m.is_admin ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {m.is_admin ? "OGSupport" : (m.user?.name || "You")} · {fmtDateTime(m.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
