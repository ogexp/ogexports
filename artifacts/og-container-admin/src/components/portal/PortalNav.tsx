import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGetMe, useListNotifications } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import {
  LayoutDashboard, BarChart3, Package, TrendingUp, Wallet,
  Ship, ClipboardList, ScrollText, Receipt, Bell,
  HeadphonesIcon, User, CircleDollarSign, ArrowUpRight, History,
  ShoppingCart,
} from "lucide-react"

export function PortalNav() {
  const { data: me } = useGetMe()
  const { data: notifications } = useListNotifications()
  const { supplierModuleEnabled } = usePlatformSettings()
  const unreadCount = notifications?.filter(n => !n.read).length || 0

  const isSupplier = supplierModuleEnabled && me?.accountType === "supplier"
  const isInvestor = me?.accountType === "investor"
  const isAdmin = me?.accountType === "admin"
  const isBuyer = !isInvestor && !isSupplier && !isAdmin

  const trigger = (value: string, icon: any, label: string, badge?: number) => {
    const Icon = icon
    return (
      <TabsTrigger
        key={value}
        value={value}
        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs px-3 py-2 h-auto"
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">{label}</span>
        {badge != null && badge > 0 && (
          <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] min-w-[16px] justify-center bg-accent text-accent-foreground border-0 ml-0.5">
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </TabsTrigger>
    )
  }

  return (
    <TabsList className="w-full flex-wrap h-auto p-1.5 bg-muted/50 justify-start gap-1 rounded-xl">
      {trigger("overview", LayoutDashboard, "Dashboard")}
      {isBuyer && trigger("analytics", BarChart3, "Analytics")}
      {isSupplier && trigger("my-offers", Package, "My Offers")}
      {isInvestor && trigger("portfolio", TrendingUp, "Portfolio")}
      {isInvestor && trigger("wallet", Wallet, "Wallet")}
      {isInvestor && trigger("deposit", CircleDollarSign, "Deposit")}
      {isInvestor && trigger("withdrawal", ArrowUpRight, "Withdraw")}
      {isInvestor && trigger("financial", History, "History")}
      {isBuyer && trigger("rfqs", ClipboardList, "RFQs")}
      {isBuyer && trigger("orders", ShoppingCart, "Orders")}
      {isBuyer && trigger("contracts", ScrollText, "Contracts")}
      {isBuyer && trigger("invoices", Receipt, "Invoices")}
      {isBuyer && trigger("shipments", Ship, "Shipments")}
      {trigger("profile", User, "Profile")}
      {trigger("support", HeadphonesIcon, "Support")}
      {trigger("notifications", Bell, "Alerts", unreadCount)}
    </TabsList>
  )
}
