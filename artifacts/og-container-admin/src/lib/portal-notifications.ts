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
import {
  formatRelativeTime,
  mapApiNotification as mapInvestorNotification,
  type ApiNotification,
  type MappedNotification,
} from "@/lib/investor-notifications"

export type { ApiNotification, MappedNotification }
export { formatRelativeTime }

export type PortalNotifTab = "all" | "approvals" | "transactions" | "platform" | "kyc"

interface TypeConfig {
  icon: LucideIcon
  color: string
  bg: string
  tab: PortalNotifTab
  actionLabel?: string
  defaultHref?: string
}

const PORTAL_TYPE_CONFIG: Record<string, TypeConfig> = {
  deposit: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "transactions", actionLabel: "View", defaultHref: "/invest/wallet" },
  deposit_approved: { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "approvals", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  deposit_rejected: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/15", tab: "approvals", actionLabel: "View Wallet", defaultHref: "/invest/wallet" },
  withdrawal: { icon: ArrowUpRight, color: "text-red-400", bg: "bg-red-500/15", tab: "transactions", actionLabel: "View", defaultHref: "/invest/withdraw" },
  withdrawal_approved: { icon: ArrowUpRight, color: "text-blue-500", bg: "bg-blue-500/15", tab: "approvals", actionLabel: "View Withdrawals", defaultHref: "/invest/withdraw" },
  withdrawal_rejected: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/15", tab: "approvals", actionLabel: "View Withdrawals", defaultHref: "/invest/withdraw" },
  investment: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/15", tab: "approvals", actionLabel: "View", defaultHref: "/invest/containers" },
  investment_approved: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/15", tab: "approvals", actionLabel: "View", defaultHref: "/invest/containers" },
  update: { icon: Info, color: "text-primary", bg: "bg-primary/15", tab: "platform" },
  shipment_update: { icon: Ship, color: "text-blue-500", bg: "bg-blue-500/15", tab: "platform", actionLabel: "Track", defaultHref: "/buyer/shipments" },
  freight_accepted: { icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/15", tab: "platform" },
  document: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/15", tab: "kyc" },
  trade_document: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/15", tab: "platform", actionLabel: "View Documents", defaultHref: "/buyer/documents" },
  announcement: { icon: Globe, color: "text-primary", bg: "bg-primary/15", tab: "platform" },
  admin_announcement: { icon: Globe, color: "text-primary", bg: "bg-primary/15", tab: "platform" },
  kyc_approved: { icon: Shield, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "kyc", actionLabel: "View KYC", defaultHref: "/invest/kyc" },
  kyc_rejected: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/15", tab: "kyc", actionLabel: "View KYC", defaultHref: "/invest/kyc" },
  kyc_pending: { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/15", tab: "kyc" },
  buyer_payment_approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "approvals", actionLabel: "View Payments", defaultHref: "/buyer/payments" },
  buyer_payment_rejected: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/15", tab: "approvals", actionLabel: "View Payments", defaultHref: "/buyer/payments" },
  buyer_payment_cancelled: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/15", tab: "approvals", actionLabel: "View Payments", defaultHref: "/buyer/payments" },
  order_status: { icon: Package, color: "text-blue-500", bg: "bg-blue-500/15", tab: "approvals", actionLabel: "View Orders", defaultHref: "/buyer/orders" },
  quotation: { icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/15", tab: "approvals", actionLabel: "View Quotations", defaultHref: "/buyer/quotations" },
  quotation_reply: { icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/15", tab: "approvals", actionLabel: "View Quotations", defaultHref: "/buyer/quotations" },
  new_message: { icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/15", tab: "platform" },
  support_ticket: { icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-500/15", tab: "platform", actionLabel: "View Messages", defaultHref: "/buyer/messages" },
  return: { icon: Star, color: "text-amber-500", bg: "bg-amber-500/15", tab: "transactions" },
}

const DEFAULT_CONFIG: TypeConfig = {
  icon: Bell,
  color: "text-muted-foreground",
  bg: "bg-muted",
  tab: "platform",
}

export const APPROVAL_NOTIFICATION_TYPES = new Set([
  "kyc_approved",
  "kyc_rejected",
  "deposit_approved",
  "deposit_rejected",
  "withdrawal_approved",
  "withdrawal_rejected",
  "buyer_payment_approved",
  "buyer_payment_rejected",
  "buyer_payment_cancelled",
  "order_status",
  "quotation",
  "quotation_reply",
  "investment",
  "investment_approved",
])

export function mapPortalNotification(row: ApiNotification): MappedNotification & { portalTab: PortalNotifTab } {
  const base = mapInvestorNotification(row)
  const cfg = PORTAL_TYPE_CONFIG[row.type || ""] ?? DEFAULT_CONFIG
  const dataHref = typeof row.data?.href === "string" ? row.data.href : undefined

  return {
    ...base,
    portalTab: cfg.tab,
    icon: cfg.icon,
    iconColor: cfg.color,
    iconBg: cfg.bg,
    action: dataHref
      ? { label: cfg.actionLabel ?? "View", href: dataHref }
      : (cfg.defaultHref && cfg.actionLabel
          ? { label: cfg.actionLabel, href: cfg.defaultHref }
          : base.action),
  }
}

export function dispatchUnreadNotificationsEvent(count?: number) {
  window.dispatchEvent(new CustomEvent("og-unread-notifications", { detail: { count } }))
}
