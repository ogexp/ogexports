import { useCallback, useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { api, unwrapPage } from "@/lib/api"
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  CheckCircle2,
  MessageSquare,
  Ship,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { formatRelativeTime } from "@/lib/investor-notifications"

type AdminNotif = {
  id: number | string
  type: string
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at?: string | null
}

const TYPE_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  admin_user_registered: { icon: Users, color: "#4CAF50" },
  admin_kyc_submitted: { icon: AlertTriangle, color: "#f59e0b" },
  admin_deposit_submitted: { icon: ArrowDownCircle, color: "#3b82f6" },
  admin_buyer_deposit_submitted: { icon: ArrowDownCircle, color: "#3b82f6" },
  admin_withdrawal_submitted: { icon: ArrowUpCircle, color: "#ef4444" },
  admin_investment_created: { icon: Ship, color: "#8b5cf6" },
  admin_contact_submitted: { icon: MessageSquare, color: "#0ea5e9" },
}

function iconFor(type: string) {
  return TYPE_ICON[type] ?? { icon: MessageSquare, color: "#64748b" }
}

interface Props {
  open: boolean
  onToggle: () => void
  onClose: () => void
}

export function AdminNotificationBell({ open, onToggle, onClose }: Props) {
  const [, setLocation] = useLocation()
  const [items, setItems] = useState<AdminNotif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get("/api/admin/notifications?per_page=8"),
        api.get<{ data: { unread_count: number } }>("/api/admin/notifications/unread-count"),
      ])
      setItems(unwrapPage<AdminNotif>(listRes).data)
      setUnread(countRes?.data?.unread_count ?? 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void fetchAll()
    const onCustom = () => { void fetchAll() }
    window.addEventListener("og-admin-unread", onCustom)
    const t = setInterval(() => { void fetchAll() }, 30000)
    return () => {
      window.removeEventListener("og-admin-unread", onCustom)
      clearInterval(t)
    }
  }, [fetchAll])

  useEffect(() => {
    if (open) void fetchAll()
  }, [open, fetchAll])

  async function markRead(n: AdminNotif) {
    if (!n.read_at) {
      try {
        await api.post(`/api/admin/notifications/${n.id}/read`)
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
        setUnread(u => Math.max(0, u - 1))
        window.dispatchEvent(new CustomEvent("og-admin-unread"))
      } catch {
        // ignore
      }
    }
    const href = typeof n.data?.href === "string" ? n.data.href : null
    onClose()
    if (href) setLocation(href)
  }

  async function markAllRead() {
    if (unread === 0 || loading) return
    setLoading(true)
    try {
      await api.post("/api/admin/notifications/read-all")
      setItems(prev => prev.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
      setUnread(0)
      window.dispatchEvent(new CustomEvent("og-admin-unread"))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        onClick={onToggle}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-foreground/70" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  {unread} new
                </span>
              )}
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            items.map(n => {
              const { icon: Icon, color } = iconFor(n.type)
              const unreadItem = !n.read_at
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => void markRead(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer border-b border-border/50 ${unreadItem ? "bg-amber-50/40" : ""}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${color}18` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${unreadItem ? "font-semibold text-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {unreadItem && <CheckCircle2 className="w-3 h-3 text-transparent shrink-0" />}
                  {unreadItem && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
