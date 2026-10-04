import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useLocation } from "wouter"
import { Bell, CheckCheck } from "lucide-react"
import { api, unwrapPage } from "@/lib/api"
import {
  dispatchUnreadNotificationsEvent,
  formatRelativeTime,
  mapPortalNotification,
  type ApiNotification,
} from "@/lib/portal-notifications"

interface Props {
  /** API base for notifications, e.g. /api/notifications or /api/investor/notifications */
  apiBase?: string
  /** Full notifications page path */
  listHref: string
  /** Extra unread (messages etc.) shown on the red badge together with notifs */
  extraUnread?: number
  className?: string
}

const PANEL_WIDTH = 320 // w-80

export function NotificationBellDropdown({
  apiBase = "/api/notifications",
  listHref,
  extraUnread = 0,
  className = "",
}: Props) {
  const [, setLocation] = useLocation()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReturnType<typeof mapPortalNotification>[]>([])
  const [unread, setUnread] = useState(0)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get(`${apiBase}?per_page=8`),
        api.get<{ data: { unread_count: number } }>(`${apiBase}/unread-count`),
      ])
      const rows = unwrapPage<ApiNotification>(listRes).data.map(mapPortalNotification)
      setItems(rows)
      setUnread(countRes?.data?.unread_count ?? 0)
    } catch {
      // ignore
    }
  }, [apiBase])

  const updatePanelPosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const left = Math.min(
      Math.max(8, rect.right - PANEL_WIDTH),
      window.innerWidth - PANEL_WIDTH - 8,
    )
    setPanelPos({ top: rect.bottom + 8, left })
  }, [])

  useEffect(() => {
    void fetchAll()
    const onNotif = () => { void fetchAll() }
    window.addEventListener("og-unread-notifications", onNotif)
    const t = setInterval(() => { void fetchAll() }, 30000)
    return () => {
      window.removeEventListener("og-unread-notifications", onNotif)
      clearInterval(t)
    }
  }, [fetchAll])

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null)
      return
    }
    updatePanelPosition()
  }, [open, updatePanelPosition])

  useEffect(() => {
    if (!open) return
    void fetchAll()
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onReposition = () => updatePanelPosition()
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("resize", onReposition)
    window.addEventListener("scroll", onReposition, true)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("resize", onReposition)
      window.removeEventListener("scroll", onReposition, true)
    }
  }, [open, fetchAll, updatePanelPosition])

  const badge = unread + extraUnread

  async function markRead(id: string, href?: string) {
    try {
      await api.post(`${apiBase}/${id}/read`)
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnread(u => Math.max(0, u - 1))
      dispatchUnreadNotificationsEvent()
    } catch {
      // ignore
    }
    setOpen(false)
    if (href) setLocation(href)
  }

  async function markAllRead() {
    try {
      await api.post(`${apiBase}/read-all`)
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
      dispatchUnreadNotificationsEvent(0)
    } catch {
      // ignore
    }
  }

  const panel = open && panelPos && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed w-80 bg-card border border-border rounded-xl shadow-xl z-[200] overflow-hidden"
          style={{ top: panelPos.top, left: panelPos.left }}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all
                </button>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">No notifications yet.</div>
          ) : (
            items.map(n => {
              const Icon = n.icon
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void markRead(n.id, n.action?.href)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/40 border-b border-border/50 ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.iconBg}`}>
                    <Icon className={`w-4 h-4 ${n.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                    {n.desc && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.time || formatRelativeTime()}</p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                </button>
              )
            })
          )}

          <Link
            href={listHref}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs font-semibold text-accent hover:bg-muted/40"
          >
            View all notifications
          </Link>
        </div>,
        document.body,
      )
    : null

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        onClick={() => setOpen(p => !p)}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-accent text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      {panel}
    </div>
  )
}
