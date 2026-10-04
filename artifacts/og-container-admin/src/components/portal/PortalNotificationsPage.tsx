import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "wouter"
import { Bell, BellOff, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api, unwrapPage } from "@/lib/api"
import { notify } from "@/lib/notify"
import {
  APPROVAL_NOTIFICATION_TYPES,
  dispatchUnreadNotificationsEvent,
  mapPortalNotification,
  type ApiNotification,
  type MappedNotification,
  type PortalNotifTab,
} from "@/lib/portal-notifications"

const TABS: { key: PortalNotifTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approvals", label: "Approvals" },
  { key: "transactions", label: "Transactions" },
  { key: "kyc", label: "KYC" },
  { key: "platform", label: "Platform" },
]

interface Props {
  apiBase?: string
  queryKey: string[]
  title?: string
}

export function PortalNotificationsPage({
  apiBase = "/api/notifications",
  queryKey,
  title = "Notifications",
}: Props) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<PortalNotifTab>("all")

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get(apiBase)
      return unwrapPage<ApiNotification>(res).data.map(mapPortalNotification)
    },
  })

  const notifications = data ?? []

  const markReadMutation = useMutation({
    mutationFn: async (n: MappedNotification) => {
      await api.post(`${apiBase}/${n.id}/read`)
      return n
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      dispatchUnreadNotificationsEvent()
    },
    onError: () => notify.error("Could not mark notification as read."),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post(`${apiBase}/read-all`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      dispatchUnreadNotificationsEvent(0)
      notify.success("All notifications marked as read.")
    },
    onError: () => notify.error("Could not mark all notifications as read."),
  })

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications
    return notifications.filter(n => (n as ReturnType<typeof mapPortalNotification>).portalTab === activeTab)
  }, [activeTab, notifications])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(tab => {
            const count = tab.key === "all"
              ? unreadCount
              : notifications.filter(n => !(n as ReturnType<typeof mapPortalNotification>).read
                && (n as ReturnType<typeof mapPortalNotification>).portalTab === tab.key).length
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                    activeTab === tab.key ? "bg-white/25 text-white" : "bg-accent/20 text-accent"
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
            Mark All Read
          </Button>
        )}
      </div>

      <Card className="glass-card">
        {isLoading ? (
          <CardContent className="py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        ) : isError ? (
          <CardContent className="py-16 text-center">
            <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Could not load notifications.</p>
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="py-16 text-center">
            <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No notifications in this category.</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(n => {
              const Icon = n.icon
              return (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read) markReadMutation.mutate(n) }}
                  className={`flex gap-4 px-5 py-5 hover:bg-muted/20 transition-colors cursor-pointer relative ${!n.read ? "bg-primary/3" : ""}`}
                >
                  {!n.read && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-full" />}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}>
                    <Icon className={`w-5 h-5 ${n.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className={`text-sm font-semibold ${!n.read ? "text-foreground" : "text-foreground/80"}`}>
                        {n.title}
                        {APPROVAL_NOTIFICATION_TYPES.has(n.rawType) && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-accent">Approval</span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
                      </div>
                    </div>
                    {n.desc && <p className="text-xs text-muted-foreground leading-relaxed">{n.desc}</p>}
                    {n.action && (
                      <Link href={n.action.href} onClick={e => e.stopPropagation()}>
                        <button type="button" className="mt-3 text-xs font-semibold text-accent hover:underline">
                          {n.action.label} →
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Bell className="w-3 h-3" /> {title} — approval alerts for KYC, deposits, and withdrawals appear here.
      </p>
    </div>
  )
}
