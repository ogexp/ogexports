import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bell, CheckCircle2, BellOff, Settings, Loader2, ChevronRight,
} from "lucide-react"
import { Link } from "wouter"
import { api, unwrapPage } from "@/lib/api"
import { notify } from "@/lib/notify"
import {
  dispatchUnreadNotificationsEvent,
  dispatchKycUpdatedEvent,
  KYC_NOTIFICATION_TYPES,
  mapApiNotification,
  type ApiNotification,
  type InvestNotifTab,
  type MappedNotification,
} from "@/lib/investor-notifications"
import { Skeleton } from "@/components/ui/skeleton"

const TABS: { key: InvestNotifTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "investments", label: "Investments" },
  { key: "transactions", label: "Transactions" },
  { key: "platform", label: "Platform" },
  { key: "kyc", label: "KYC" },
]

export default function InvestNotifications() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<InvestNotifTab>("all")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["investor", "notifications"],
    queryFn: async () => {
      const res = await api.get("/api/investor/notifications")
      return unwrapPage<ApiNotification>(res).data.map(mapApiNotification)
    },
  })

  const notifications = data ?? []

  const markReadMutation = useMutation({
    mutationFn: async (n: MappedNotification) => {
      await api.post(`/api/investor/notifications/${n.id}/read`)
      return n.rawType
    },
    onSuccess: (rawType) => {
      if (KYC_NOTIFICATION_TYPES.has(rawType)) {
        dispatchKycUpdatedEvent()
      }
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications-unread"] })
      dispatchUnreadNotificationsEvent()
    },
    onError: () => {
      notify.error("Could not mark notification as read.")
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/investor/notifications/read-all")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
      void queryClient.invalidateQueries({ queryKey: ["investor", "notifications-unread"] })
      dispatchUnreadNotificationsEvent(0)
      notify.success("All notifications marked as read.")
    },
    onError: () => {
      notify.error("Could not mark all notifications as read.")
    },
  })

  const filtered = useMemo(
    () => (activeTab === "all" ? notifications : notifications.filter(n => n.type === activeTab)),
    [activeTab, notifications]
  )

  const unreadCount = notifications.filter(n => !n.read).length

  function markRead(n: MappedNotification) {
    if (n.read || markReadMutation.isPending) return
    markReadMutation.mutate(n)
  }

  function markAllRead() {
    if (unreadCount === 0 || markAllReadMutation.isPending) return
    markAllReadMutation.mutate()
  }

  return (
    <InvestPortalLayout title="Notifications" subtitle="Investment activity, platform updates and account alerts">
      <div className="space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {TABS.map(tab => {
              const count = tab.key === "all"
                ? unreadCount
                : notifications.filter(n => n.type === tab.key && !n.read).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllRead} disabled={markAllReadMutation.isPending}>
                {markAllReadMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Mark All Read
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href="/invest/settings">
                <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
              </Link>
            </Button>
          </div>
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
              <p className="text-sm text-muted-foreground">Could not load notifications. Please try again.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="py-16 text-center">
              <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No notifications in this category.</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(n => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={() => markRead(n)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage email, SMS, and in-app notification preferences for deposits, withdrawals, KYC updates, and platform announcements.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/invest/settings">
                Manage in Settings <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </InvestPortalLayout>
  )
}

function NotificationRow({
  notification: n,
  onMarkRead,
}: {
  notification: MappedNotification
  onMarkRead: () => void
}) {
  const Icon = n.icon

  return (
    <div
      onClick={onMarkRead}
      className={`flex gap-4 px-5 py-5 hover:bg-muted/20 transition-colors cursor-pointer relative ${
        !n.read ? "bg-primary/3" : ""
      }`}
    >
      {!n.read && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent rounded-full" />
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}>
        <Icon className={`w-5 h-5 ${n.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h4 className={`text-sm font-semibold ${!n.read ? "text-foreground" : "text-foreground/80"}`}>
            {n.title}
          </h4>
          <div className="flex items-center gap-2 shrink-0">
            {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
            <span className="text-xs text-muted-foreground whitespace-nowrap">{n.time}</span>
          </div>
        </div>
        {n.desc && (
          <p className="text-xs text-muted-foreground leading-relaxed">{n.desc}</p>
        )}
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
}
