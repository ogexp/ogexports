import { useQuery } from "@tanstack/react-query"
import { Link } from "wouter"
import { Bell, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, unwrapPage } from "@/lib/api"
import {
  APPROVAL_NOTIFICATION_TYPES,
  mapPortalNotification,
  type ApiNotification,
} from "@/lib/portal-notifications"

interface Props {
  apiBase?: string
  listHref: string
  limit?: number
}

export function RecentAlertsCard({
  apiBase = "/api/notifications",
  listHref,
  limit = 5,
}: Props) {
  const { data } = useQuery({
    queryKey: ["portal", "recent-alerts", apiBase],
    queryFn: async () => {
      const res = await api.get(`${apiBase}?per_page=20`)
      return unwrapPage<ApiNotification>(res).data
        .map(mapPortalNotification)
        .filter(n => !n.read && APPROVAL_NOTIFICATION_TYPES.has(n.rawType))
        .slice(0, limit)
    },
  })

  const items = data ?? []

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" /> Recent Alerts
          </CardTitle>
          <Link href={listHref} className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No new approval alerts.</p>
        ) : (
          <div className="space-y-2">
            {items.map(n => {
              const Icon = n.icon
              return (
                <Link
                  key={n.id}
                  href={n.action?.href ?? listHref}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.iconBg}`}>
                    <Icon className={`w-4 h-4 ${n.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{n.title}</p>
                    {n.desc && <p className="text-[10px] text-muted-foreground line-clamp-1">{n.desc}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
