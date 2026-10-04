import { useCallback, useEffect, useRef, useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { ChatImagePreview } from "@/components/chat/ChatImagePreview"
import { Badge } from "@/components/ui/badge"
import { Search, Send, Paperclip, User, Building2, Loader2, ImageIcon, X, MessageSquare } from "lucide-react"
import { api, resolveAttachmentUrl, isImageMime } from "@/lib/api"
import { notify } from "@/lib/notify"
import { useLocalAuth } from "@/lib/local-auth"

const EMERALD = "#0F3D2E"

type ConvListItem = {
  id: number | null
  user_id: number
  subject?: string
  user: { id: number; name: string; email: string; role?: string; company?: string } | null
  last_message: { body: string; attachment_name?: string; created_at: string; sender_id: number } | null
  unread_count: number
  has_unread?: boolean
  is_new_chat?: boolean
  updated_at?: string | null
}

type ChatMessage = {
  id: number
  sender_id: number
  body: string
  attachment_path?: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_mime?: string | null
  created_at: string
}

type ListMeta = {
  new_chat_count: number
  unread_messages_count: number
  unread_conversations_count: number
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

export default function AdminMessages() {
  const { user } = useLocalAuth()
  const myId = Number(user?.id || 0)

  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<ConvListItem[]>([])
  const [listMeta, setListMeta] = useState<ListMeta>({
    new_chat_count: 0,
    unread_messages_count: 0,
    unread_conversations_count: 0,
  })
  const [loadingList, setLoadingList] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<ConvListItem["user"]>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingChat, setLoadingChat] = useState(false)
  const [newMsg, setNewMsg] = useState("")
  const [sending, setSending] = useState(false)
  const [pendingImage, setPendingImage] = useState<{
    path: string; url: string; name: string; mime: string
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadConversations = useCallback(async (q = search) => {
    setLoadingList(true)
    try {
      const res = await api.get<any>("/api/admin/conversations", {
        per_page: 100,
        search: q || undefined,
      })
      const list = Array.isArray(res?.data) ? res.data : []
      setConversations(list)
      if (res?.meta) {
        setListMeta({
          new_chat_count: res.meta.new_chat_count ?? 0,
          unread_messages_count: res.meta.unread_messages_count ?? 0,
          unread_conversations_count: res.meta.unread_conversations_count ?? 0,
        })
      }
      window.dispatchEvent(new CustomEvent("og-admin-unread"))
    } catch (e: any) {
      notify.error(e?.message || "Failed to load chats")
    } finally {
      setLoadingList(false)
    }
  }, [search])

  const openConversation = useCallback(async (item: ConvListItem) => {
    setSelectedUser(item.user)
    setSelectedUserId(item.user_id)
    setLoadingChat(true)
    try {
      let convId = item.id
      if (!convId) {
        const ensured = await api.post<{ data: { id: number } }>("/api/admin/conversations/ensure", {
          user_id: item.user_id,
        })
        convId = ensured.data.id
        setConversations(prev =>
          prev.map(c => (c.user_id === item.user_id ? { ...c, id: convId } : c))
        )
      }
      setSelectedId(convId)
      const res = await api.get<{ data: { messages: ChatMessage[] } }>(
        `/api/admin/conversations/${convId}/messages`
      )
      setMessages(res.data.messages || [])
      await api.post(`/api/admin/conversations/${convId}/read`)
      setConversations(prev =>
        prev.map(c => (c.user_id === item.user_id ? {
          ...c,
          id: convId,
          unread_count: 0,
          has_unread: false,
          is_new_chat: false,
        } : c))
      )
      window.dispatchEvent(new CustomEvent("og-admin-unread"))
    } catch (e: any) {
      notify.error(e?.message || "Failed to load messages")
    } finally {
      setLoadingChat(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    const t = setInterval(() => loadConversations(), 20000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    if (!selectedId) return
    const t = setInterval(async () => {
      try {
        const res = await api.get<{ data: { messages: ChatMessage[] } }>(
          `/api/admin/conversations/${selectedId}/messages`
        )
        setMessages(res.data.messages || [])
        await api.post(`/api/admin/conversations/${selectedId}/read`)
        window.dispatchEvent(new CustomEvent("og-admin-unread"))
      } catch {
        // ignore
      }
    }, 12000)
    return () => clearInterval(t)
  }, [selectedId])

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      notify.error("Please choose an image file")
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
    if (!selectedId) return
    if (!newMsg.trim() && !pendingImage) return
    setSending(true)
    try {
      const res = await api.post<{ data: ChatMessage }>(
        `/api/admin/conversations/${selectedId}/messages`,
        {
          body: newMsg.trim() || "",
          attachment_path: pendingImage?.path,
          attachment_url: pendingImage?.url,
          attachment_name: pendingImage?.name,
          attachment_mime: pendingImage?.mime,
        }
      )
      setMessages(prev => [...prev, res.data])
      setNewMsg("")
      setPendingImage(null)
      loadConversations()
    } catch (e: any) {
      notify.error(e?.message || "Failed to send")
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminLayout title="Messages" subtitle="Direct chat with buyers, suppliers and investors">
      <div className="p-6">
        <div className="grid lg:grid-cols-5 gap-5 bg-white rounded-xl border border-border overflow-hidden" style={{ minHeight: 560 }}>
          {/* User chat list */}
          <div className="lg:col-span-2 border-r border-border flex flex-col max-h-[70vh]">
            <div className="p-4 border-b border-border space-y-3">
              {(listMeta.new_chat_count > 0 || listMeta.unread_messages_count > 0) && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {listMeta.new_chat_count > 0 && (
                    <Badge className="bg-accent text-accent-foreground border-0">
                      {listMeta.new_chat_count} new chat{listMeta.new_chat_count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {listMeta.unread_messages_count > 0 && (
                    <Badge variant="destructive">
                      {listMeta.unread_messages_count} unread message{listMeta.unread_messages_count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") loadConversations(search) }}
                  placeholder="Search users…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingList && conversations.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              )}
              {!loadingList && conversations.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No conversations yet</div>
              )}
              {conversations.map(c => {
                const active = selectedUserId === c.user_id
                const preview = c.last_message?.body || c.last_message?.attachment_name || "No messages yet"
                return (
                  <button
                    key={c.user_id}
                    type="button"
                    onClick={() => openConversation(c)}
                    className={`w-full text-left p-4 border-b border-border/50 transition-colors ${
                      active ? "bg-muted/50" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: EMERALD }}
                      >
                        {(c.user?.name || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-semibold truncate">{c.user?.name || "Unknown"}</p>
                            {c.is_new_chat && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-accent text-accent-foreground border-0 shrink-0">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.last_message?.created_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {fmtDateTime(c.last_message.created_at)}
                              </span>
                            )}
                            {c.unread_count > 0 && (
                              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {c.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{c.user?.email}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{preview}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Chat window */}
          <div className="lg:col-span-3 flex flex-col max-h-[70vh]">
            {!selectedId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <p className="text-sm">Select a user chat to view messages</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-bold">{selectedUser?.name || "User"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedUser?.email}
                    {selectedUser?.role ? ` · ${selectedUser.role}` : ""}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingChat && (
                    <div className="flex justify-center py-8 text-muted-foreground gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
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
                            isMine ? "bg-primary/10" : "bg-accent/20"
                          }`}
                        >
                          {isMine
                            ? <Building2 className="w-4 h-4 text-primary" />
                            : <User className="w-4 h-4 text-accent" />}
                        </div>
                        <div className={`max-w-[75%] flex flex-col gap-1 ${isMine ? "items-start" : "items-end"}`}>
                          <p className="text-[10px] text-muted-foreground px-1">
                            {isMine ? "OGSupport" : (selectedUser?.name || "User")} · {fmtDateTime(m.created_at)}
                          </p>
                          <div
                            className={`p-3 rounded-xl text-sm space-y-2 ${
                              isMine
                                ? "bg-muted/50"
                                : "bg-destructive/10 border border-destructive/20"
                            }`}
                          >
                            {m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                            {fileUrl && showAsImage && (
                              <ChatImagePreview
                                src={fileUrl}
                                alt={m.attachment_name || "attachment"}
                                thumbnailClassName="max-h-40 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
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

                <div className="p-4 border-t border-border space-y-2">
                  {pendingImage && (
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="truncate flex-1">{pendingImage.name}</span>
                      <button type="button" onClick={() => setPendingImage(null)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder="Reply as OGSupport…"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
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
                      className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={sending || (!newMsg.trim() && !pendingImage)}
                      className="px-3 rounded-lg text-white disabled:opacity-50"
                      style={{ background: EMERALD }}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
