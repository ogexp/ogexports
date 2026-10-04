import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { MOCK_NOTIFICATIONS } from "@/data/investments"
import {
  Bell, Check, CheckCheck, TrendingUp,
  FileText, AlertCircle, Info,
  CheckCircle2, ArrowDownRight, ArrowUpRight, Filter, Star,
  CircleDollarSign,
  MessageSquare,
  Package,
  Shield,
  Ship
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
type NotifCategory = "all" | "financial" | "investment" | "documents"

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; category: NotifCategory }> = {
  deposit: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/10", category: "financial" },
  deposit_approved: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/10", category: "financial" },
  withdrawal: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/10", category: "financial" },
  withdrawal_approved: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/10", category: "financial" },
  withdrawal_processing: { icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/10", category: "financial" },
  return: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10", category: "financial" },
  investment_return: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10", category: "financial" },
  investment: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/10", category: "investment" },
  investment_approved: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/10", category: "investment" },
  update: { icon: Info, color: "text-primary", bg: "bg-primary/10", category: "investment" },
  document: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", category: "documents" },
  admin_announcement: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", category: "documents" },
  shipment_update: { icon: Ship, color: "text-blue-500", bg: "bg-blue-500/10", category: "investment" },
  freight_accepted: { icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10", category: "investment" },
  kyc_approved: { icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/10", category: "documents" },
  kyc_rejected: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", category: "documents" },
  kyc_pending: { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10", category: "documents" },
  new_message: { icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/10", category: "documents" },
  registration: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", category: "documents" },
}

const CATEGORIES: { key: NotifCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "financial", label: "Financial" },
  { key: "investment", label: "Investments" },
  { key: "documents", label: "Documents & Updates" },
]

export function NotificationsTab() {
  const { toast } = useToast()
  const [category, setCategory] = useState<NotifCategory>("all")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  
  // Local state for read status simulation
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS)

  const unreadCount = notifs.filter(n => !n.read).length

  const handleMarkRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }
  
  const handleMarkAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    toast({ title: "All caught up", description: "All notifications marked as read." })
  }

  const filtered = notifs.filter(n => {
    if (showUnreadOnly && n.read) return false
    if (category === "all") return true
    const cfg = CATEGORY_CONFIG[n.type]
    return cfg?.category === category
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-heading font-bold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-accent text-accent-foreground border-0 px-2 py-0.5">{unreadCount} unread</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showUnreadOnly ? "default" : "outline"}
            className="text-xs gap-1.5 h-8"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <Filter className="w-3 h-3" /> Unread Only
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8" onClick={handleMarkAllRead}>
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const count = cat.key === "all"
            ? notifs.filter(n => !n.read).length
            : notifs.filter(n => !n.read && CATEGORY_CONFIG[n.type]?.category === cat.key).length
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
                category === cat.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                  category === cat.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-accent/20 text-accent-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground border-dashed border-border/60">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const cfg = CATEGORY_CONFIG[notif.type] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" }
            const Icon = cfg.icon
            return (
              <Card
                key={notif.id}
                className={`border transition-all ${
                  !notif.read
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border/40 bg-card/40 opacity-70"
                }`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!notif.read && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                        <h3 className={`text-sm leading-tight ${!notif.read ? 'font-bold' : 'font-semibold'}`}>{notif.title}</h3>
                        <Badge variant="outline" className={`text-[10px] capitalize ${cfg.bg.replace("bg-", "border-").replace("/10", "/30")} ${cfg.color}`}>
                          {cfg.category}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {new Date((notif as any).date || (notif as any).createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm mt-1.5 leading-relaxed ${!notif.read ? 'text-foreground/90' : 'text-muted-foreground'}`}>{notif.message}</p>
                  </div>
                  {/* Action */}
                  {!notif.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(notif.id)}
                      className="shrink-0 h-8 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
