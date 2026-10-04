import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  FileText,
  Globe,
  Info,
  MessageSquare,
  Package,
  Shield,
  Ship,
  Star,
  TrendingUp,
} from "lucide-react"

export type InvestNotifTab = "all" | "investments" | "transactions" | "platform" | "kyc"

export interface ApiNotification {
  id: number | string
  type: string
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at?: string | null
  unread?: boolean
}

export interface MappedNotification {
  id: string
  type: InvestNotifTab
  rawType: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  title: string
  desc: string
  time: string
  read: boolean
  action?: { label: string; href: string }
}

interface TypeConfig {
  icon: LucideIcon
  color: string
  bg: string
  tab: InvestNotifTab
  actionLabel?: string
  defaultHref?: string
}

export const NOTIFICATION_TYPE_CONFIG: Record<string, TypeConfig> = {
  deposit: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "transactions", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  deposit_approved: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "transactions", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  withdrawal: { icon: ArrowUpRight, color: "text-red-400", bg: "bg-red-500/15", tab: "transactions", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  withdrawal_approved: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/15", tab: "transactions", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  withdrawal_processing: { icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/15", tab: "transactions", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  return: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/15", tab: "transactions", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  investment_return: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/15", tab: "transactions", actionLabel: "View Reports", defaultHref: "/invest/reports" },
  investment: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/15", tab: "investments", actionLabel: "View Opportunities", defaultHref: "/invest/opportunities" },
  investment_approved: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/15", tab: "investments", actionLabel: "View Containers", defaultHref: "/invest/containers" },
  update: { icon: Info, color: "text-primary", bg: "bg-primary/15", tab: "investments", actionLabel: "View Containers", defaultHref: "/invest/containers" },
  shipment_update: { icon: Ship, color: "text-blue-500", bg: "bg-blue-500/15", tab: "investments", actionLabel: "Track Container", defaultHref: "/invest/containers" },
  freight_accepted: { icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/15", tab: "investments", actionLabel: "View Containers", defaultHref: "/invest/containers" },
  document: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/15", tab: "kyc", actionLabel: "View KYC", defaultHref: "/invest/kyc" },
  admin_announcement: { icon: Globe, color: "text-primary", bg: "bg-primary/15", tab: "platform", actionLabel: "View Messages", defaultHref: "/invest/messages" },
  announcement: { icon: Globe, color: "text-primary", bg: "bg-primary/15", tab: "platform", actionLabel: "View Messages", defaultHref: "/invest/messages" },
  kyc_approved: { icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "kyc", actionLabel: "View KYC Status", defaultHref: "/invest/kyc" },
  kyc_rejected: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/15", tab: "kyc", actionLabel: "View KYC Status", defaultHref: "/invest/kyc" },
  kyc_pending: { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/15", tab: "kyc", actionLabel: "View KYC Status", defaultHref: "/invest/kyc" },
  new_message: { icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/15", tab: "platform", actionLabel: "Open Messages", defaultHref: "/invest/messages" },
  support_ticket: { icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/15", tab: "platform", actionLabel: "View Ticket", defaultHref: "/invest/messages" },
  registration: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "platform" },
}

const DEFAULT_CONFIG: TypeConfig = {
  icon: Bell,
  color: "text-muted-foreground",
  bg: "bg-muted",
  tab: "platform",
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return "Just now"

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`

  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`

  const diffWeek = Math.floor(diffDay / 7)
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`

  return date.toLocaleDateString()
}

export function getDefaultAction(type: string, data?: Record<string, unknown> | null): { label: string; href: string } | undefined {
  const href = typeof data?.href === "string" ? data.href : undefined
  const cfg = NOTIFICATION_TYPE_CONFIG[type] ?? DEFAULT_CONFIG

  if (href && cfg.actionLabel) {
    return { label: cfg.actionLabel, href }
  }
  if (cfg.defaultHref && cfg.actionLabel) {
    return { label: cfg.actionLabel, href: cfg.defaultHref }
  }

  if (type === "support_ticket" && data?.ticket_id) {
    return { label: "View Ticket", href: "/invest/messages" }
  }
  if (type === "new_message") {
    return { label: "Open Messages", href: "/invest/messages" }
  }
  if (type === "announcement" && data?.announcement_id) {
    return { label: "View Announcement", href: "/invest/messages" }
  }

  return undefined
}

export function mapApiNotification(row: ApiNotification): MappedNotification {
  const rawType = row.type || "update"
  const cfg = NOTIFICATION_TYPE_CONFIG[rawType] ?? DEFAULT_CONFIG
  const read = row.unread === false || Boolean(row.read_at)
  const data = row.data && typeof row.data === "object" ? row.data : null

  return {
    id: String(row.id),
    type: cfg.tab,
    rawType,
    icon: cfg.icon,
    iconColor: cfg.color,
    iconBg: cfg.bg,
    title: row.title || "Notification",
    desc: row.body || "",
    time: formatRelativeTime(row.created_at),
    read,
    action: getDefaultAction(rawType, data),
  }
}

export function dispatchUnreadNotificationsEvent(count?: number) {
  window.dispatchEvent(new CustomEvent("og-unread-notifications", { detail: { count } }))
}

export function dispatchKycUpdatedEvent() {
  window.dispatchEvent(new Event("og-kyc-updated"))
}

export const KYC_NOTIFICATION_TYPES = new Set(["kyc_approved", "kyc_rejected", "kyc_pending", "document"])
