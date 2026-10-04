import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAdminDashboard, type DashboardPeriod } from "@/hooks/useAdminDashboard";
import {
  fetchAdminTradeNews,
  syncGoogleNews,
  type ApiTradeNews,
} from "@/lib/auto-news-fetch";
import {
  TrendingUp, Users, DollarSign, Package, Ship, Globe,
  Bell, AlertTriangle, CheckCircle, Clock, BarChart2, Activity, Zap,
  FileText, Truck, Warehouse, Brain, Calendar, Shield, Download,
  ArrowUpRight, ArrowDownRight, RefreshCw, Eye, Newspaper,
  ShoppingCart, Factory, CreditCard, Target, Award, ArrowDownCircle, ArrowUpCircle
} from "lucide-react";
import {
  CONTAINER_PROJECT_STATUSES,
  CONTAINER_PROJECT_STATUS_LABELS,
  containerProjectStatusBadgeStyle,
  type ContainerProjectStatus,
} from "@/lib/container-project-statuses";

const EMERALD = "hsl(158, 59%, 15%)";
const GOLD = "#D4A012";
const GOLD_LIGHT = "hsl(38, 55%, 72%)";

const fmtUsd = (v: number) =>
  `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (v: number) => {
  if (!v) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}%`;
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-xs text-muted-foreground">
      <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
      {message}
    </div>
  );
}

function ChartEmpty({ message = "No data yet" }: { message?: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
      {message}
    </div>
  );
}

function ActivityIcon({ iconName, color }: { iconName: string; color: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    FileText: <FileText className="w-3.5 h-3.5" />,
    CreditCard: <CreditCard className="w-3.5 h-3.5" />,
    Users: <Users className="w-3.5 h-3.5" />,
    CheckCircle: <CheckCircle className="w-3.5 h-3.5" />,
    Ship: <Ship className="w-3.5 h-3.5" />,
    TrendingUp: <TrendingUp className="w-3.5 h-3.5" />,
    Shield: <Shield className="w-3.5 h-3.5" />,
    ShoppingCart: <ShoppingCart className="w-3.5 h-3.5" />,
    Factory: <Factory className="w-3.5 h-3.5" />,
    Package: <Package className="w-3.5 h-3.5" />,
    AlertTriangle: <AlertTriangle className="w-3.5 h-3.5" />,
    Truck: <Truck className="w-3.5 h-3.5" />,
    Clock: <Clock className="w-3.5 h-3.5" />,
  };
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18", color }}>
      {iconMap[iconName] ?? <Activity className="w-3.5 h-3.5" />}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    order: { bg: "#eff6ff", color: "#3b82f6", label: "Order" },
    production: { bg: "#fffbeb", color: "#f59e0b", label: "Production" },
    loading: { bg: "#f0fdf4", color: "#16a34a", label: "Loading" },
    customs: { bg: "#ecfeff", color: "#06b6d4", label: "Customs" },
    transit: { bg: "#f0f9ff", color: "#0ea5e9", label: "Transit" },
    delivered: { bg: "#f0fdf4", color: "#4CAF50", label: "Delivered" },
  };
  const s = map[stage] ?? { bg: "#f1f5f9", color: "#475569", label: stage };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#fef3c7", color: "#b45309" },
    approved: { bg: "#d1fae5", color: "#065f46" },
    rejected: { bg: "#fee2e2", color: "#991b1b" },
    hold: { bg: "#ede9fe", color: "#7c3aed" },
    good: { bg: "#d1fae5", color: "#065f46" },
    low: { bg: "#fef3c7", color: "#b45309" },
    critical: { bg: "#fee2e2", color: "#991b1b" },
    success: { bg: "#d1fae5", color: "#065f46" },
    failed: { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] ?? { bg: "#f1f5f9", color: "#475569" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const { data, loading, error, lastUpdated, refresh } = useAdminDashboard(60000, period);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [spinning, setSpinning] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState<number[]>([]);
  const [industryNews, setIndustryNews] = useState<ApiTradeNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsSyncing, setNewsSyncing] = useState(false);
  const [newsSyncMsg, setNewsSyncMsg] = useState("");

  const kpis = data.kpis;
  const finance = data.finance_summary;
  const containerByStatus = data.container_projects_by_status;
  const activity = data.activity_feed;
  const notifications = data.smart_notifications.filter(n => !dismissedNotifs.includes(n.id));
  const pipeline = data.export_pipeline;
  const destinations = data.top_destinations;
  const warehouse = data.warehouse;
  const supplierOffers = data.supplier_offers;
  const invest = data.investment_summary;
  const charts = data.charts;
  const calendarEvents = data.calendar_events;
  const security = data.security;

  const loadIndustryNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const rows = await fetchAdminTradeNews({ per_page: 20 });
      const published = rows.filter(n => n.status === "approved").slice(0, 6);
      setIndustryNews(published.length > 0 ? published : rows.slice(0, 6));
    } catch (e) {
      setIndustryNews([]);
      setNewsError(e instanceof Error ? e.message : "Failed to load industry news");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIndustryNews();
  }, [loadIndustryNews]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = async () => {
    setSpinning(true);
    await refresh();
    setTimeout(() => setSpinning(false), 600);
  };

  const handleNewsSync = async () => {
    setNewsSyncing(true);
    setNewsSyncMsg("");
    try {
      const result = await syncGoogleNews();
      if (result.errors.length && result.imported === 0) {
        setNewsSyncMsg(result.errors[0] || "Sync failed");
      } else {
        setNewsSyncMsg(`Imported ${result.imported} via ${result.provider} (${result.skipped} skipped)`);
      }
      await loadIndustryNews();
    } catch (e) {
      setNewsSyncMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setNewsSyncing(false);
    }
  };

  const formatTime = (d: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = days[d.getDay()];
    const mon = months[d.getMonth()];
    const dt = String(d.getDate()).padStart(2, "0");
    const yr = d.getFullYear();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    const sec = String(d.getSeconds()).padStart(2, "0");
    return `${day}, ${mon} ${dt}, ${yr} — ${String(h).padStart(2, "0")}:${min}:${sec} ${ampm}`;
  };

  const trend = (pct: number) => ({
    up: pct >= 0,
    change: fmtPct(pct),
  });

  const periodRevenueLabel =
    period === "today" ? "Period Revenue" :
    period === "week" ? "Weekly Revenue" :
    period === "quarter" ? "Quarterly Revenue" :
    period === "year" ? "Period Revenue" :
    "Monthly Revenue";

  const operationsBaseItems = [
    { icon: Ship, label: "Shipments Active", value: String(kpis.shipments.in_progress), sub: "In progress", up: true, change: "Live tracking" },
    { icon: Truck, label: "Containers Transit", value: String(kpis.shipments.containers_transit), sub: "At sea", up: true, change: "—" },
    { icon: CheckCircle, label: "Delivered", value: String(kpis.shipments.delivered), sub: kpis.revenue.month_label || "This period", up: true, change: "—" },
    { icon: AlertTriangle, label: "Low Stock Alerts", value: String(kpis.inventory.low_stock_alerts), sub: "Critical items", up: false, change: kpis.inventory.low_stock_alerts ? "Urgent" : "—" },
    { icon: CreditCard, label: "Payments Pending", value: fmtUsd(kpis.payments.pending), sub: "Awaiting", up: false, change: kpis.payments.pending ? "Action needed" : "—" },
    { icon: DollarSign, label: "Outstanding", value: fmtUsd(kpis.payments.outstanding), sub: "Receivables", up: false, change: kpis.payments.outstanding ? "Overdue" : "—" },
  ];

  const cashflowItems = investmentModuleEnabled
    ? [
        {
          icon: ArrowDownCircle,
          label: "Total Deposit",
          value: fmtUsd(finance.total_deposits),
          sub: `${finance.total_deposits_count} deposit${finance.total_deposits_count === 1 ? "" : "s"}`,
          up: true,
          change: "—",
          href: "/admin/finance?tab=investor-deposits",
          accent: "#16a34a",
        },
        {
          icon: Clock,
          label: "Pending Deposit",
          value: fmtUsd(finance.pending_deposits),
          sub: `${finance.pending_deposits_count} pending`,
          up: false,
          change: finance.pending_deposits_count ? "Action needed" : "—",
          href: "/admin/finance?tab=investor-deposits",
          accent: "#f59e0b",
        },
        {
          icon: ArrowUpCircle,
          label: "Total Withdraw",
          value: fmtUsd(finance.total_withdrawals),
          sub: `${finance.total_withdrawals_count} withdrawal${finance.total_withdrawals_count === 1 ? "" : "s"}`,
          up: true,
          change: "—",
          href: "/admin/finance?tab=withdrawals",
          accent: EMERALD,
        },
        {
          icon: AlertTriangle,
          label: "Pending Withdraw",
          value: fmtUsd(finance.pending_withdrawals),
          sub: `${finance.pending_withdrawals_count} pending`,
          up: false,
          change: finance.pending_withdrawals_count ? "Action needed" : "—",
          href: "/admin/finance?tab=withdrawals",
          accent: "#ef4444",
        },
      ]
    : [];

  /** Container investment lifecycle counts from container_projects_by_status. */
  const containerStatusItems = investmentModuleEnabled
    ? CONTAINER_PROJECT_STATUSES.map((status: ContainerProjectStatus) => {
        const style = containerProjectStatusBadgeStyle(status);
        const count = containerByStatus[status] ?? 0;
        return {
          icon: Package,
          label: CONTAINER_PROJECT_STATUS_LABELS[status],
          value: String(count),
          sub: "Container projects",
          up: status !== "cancelled",
          change: "—",
          href: `/admin/active-projects?status=${status}`,
          accent: style.color,
        };
      })
    : [];

  const kpiRows = [
    {
      label: "Revenue", color: GOLD, items: [
        ...cashflowItems,
        { icon: DollarSign, label: "Total Revenue", value: fmtUsd(kpis.revenue.total), sub: "All time", ...trend(kpis.revenue.growth_pct) },
        { icon: DollarSign, label: periodRevenueLabel, value: fmtUsd(kpis.revenue.monthly), sub: kpis.revenue.month_label || "This period", ...trend(kpis.revenue.monthly_growth_pct) },
        { icon: TrendingUp, label: "Annual Revenue", value: fmtUsd(kpis.revenue.annual), sub: kpis.revenue.year_label || "This year", ...trend(kpis.revenue.growth_pct) },
        { icon: BarChart2, label: "Gross Profit", value: kpis.revenue.gross_profit ? fmtUsd(kpis.revenue.gross_profit) : "—", sub: "Not tracked", up: true, change: "—" },
        { icon: Award, label: "Net Profit", value: kpis.revenue.net_profit ? fmtUsd(kpis.revenue.net_profit) : "—", sub: "Not tracked", up: true, change: "—" },
        { icon: ArrowUpRight, label: "YoY Growth", value: fmtPct(kpis.revenue.growth_pct), sub: "vs last year", ...trend(kpis.revenue.growth_pct) },
      ]
    },
    {
      label: "People", color: EMERALD, items: [
        { icon: Users, label: "Total Buyers", value: String(kpis.buyers.total), sub: "Registered", up: true, change: kpis.buyers.new_this_month ? `+${kpis.buyers.new_this_month} this period` : "—" },
        { icon: Activity, label: "Active Buyers", value: String(kpis.buyers.active), sub: "Last 30 days", up: true, change: kpis.buyers.total ? `${Math.round((kpis.buyers.active / Math.max(1, kpis.buyers.total)) * 100)}% active` : "—" },
        { icon: Users, label: "New This Period", value: String(kpis.buyers.new_this_month), sub: kpis.revenue.month_label || "This period", up: true, change: "—" },
        { icon: Target, label: "Buyer Retention", value: kpis.buyers.retention_pct ? `${kpis.buyers.retention_pct}%` : "0%", sub: "Active share", up: true, change: "—" },
        { icon: TrendingUp, label: "Total Investors", value: String(kpis.investors.total), sub: "Registered", up: true, change: "—" },
        { icon: DollarSign, label: "Investment Value", value: fmtUsd(kpis.investors.investment_value), sub: "Eligible total", up: true, change: "—" },
      ]
    },
    {
      label: "Trade", color: "#2563eb", items: [
        { icon: ShoppingCart, label: "Total Orders", value: String(kpis.orders.total), sub: "All time", up: true, change: "—" },
        { icon: Zap, label: "Active Orders", value: String(kpis.orders.active), sub: "In progress", up: true, change: "Live" },
        { icon: CheckCircle, label: "Completed", value: String(kpis.orders.completed), sub: "Delivered", up: true, change: kpis.orders.total ? `${Math.round((kpis.orders.completed / Math.max(1, kpis.orders.total)) * 1000) / 10}% rate` : "—" },
        { icon: Clock, label: "Pending", value: String(kpis.orders.pending), sub: "Awaiting", up: false, change: kpis.orders.pending ? "Action needed" : "—" },
        { icon: FileText, label: "RFQs Today", value: String(kpis.rfqs.today), sub: "New inquiries", up: true, change: "—" },
        { icon: Eye, label: "Quotes Pending", value: String(kpis.rfqs.quotations_pending), sub: "Awaiting approval", up: false, change: kpis.rfqs.quotations_pending ? "Urgent" : "—" },
        { icon: CheckCircle, label: "Quotes Approved", value: String(kpis.rfqs.quotations_approved), sub: "Accepted", up: true, change: "—" },
        { icon: AlertTriangle, label: "Quotes Rejected", value: String(kpis.rfqs.quotations_rejected), sub: "Rejected", up: false, change: "—" },
      ]
    },
    {
      label: "Operations",
      color: "#d97706",
      items: [...operationsBaseItems, ...containerStatusItems],
    },
  ];

  const quickActions = [
    { label: "Create RFQ", icon: FileText, color: EMERALD, href: "/admin/rfqs" },
    { label: "Create Quotation", icon: FileText, color: GOLD, href: "/admin/quotations" },
    { label: "Add Product", icon: Package, color: EMERALD, href: "/admin/products" },
    { label: "Add Import Product", icon: Factory, color: GOLD, href: "/admin/products" },
    { label: "Register Buyer", icon: Users, color: EMERALD, href: "/admin/users?tab=buyers&create=1" },
    ...(investmentModuleEnabled
      ? [{ label: "Register Investor", icon: TrendingUp, color: GOLD, href: "/admin/users?tab=investors&create=1" }]
      : []),
    ...(supplierModuleEnabled
      ? [{ label: "Supplier Offer", icon: Factory, color: EMERALD, href: "/admin/suppliers" }]
      : []),
    { label: "Create Shipment", icon: Ship, color: GOLD, href: "/admin/shipments" },
    { label: "Generate Invoice", icon: CreditCard, color: EMERALD, href: "/admin/finance" },
    { label: "Generate Report", icon: Download, color: GOLD, href: "/admin/reports" },
  ];

  const reports = [
    { title: "Sales Report", icon: BarChart2, desc: "Orders, revenue, conversion rates" },
    { title: "Revenue Report", icon: DollarSign, desc: "P&L, margins, cash flow" },
    { title: "Buyers Report", icon: Users, desc: "Buyer analytics & retention" },
    { title: "Investors Report", icon: TrendingUp, desc: "Portfolio & ROI breakdown" },
    { title: "Products Report", icon: Package, desc: "Product performance & pricing" },
    { title: "Inventory Report", icon: Warehouse, desc: "Stock levels & warehouse status" },
    { title: "Shipments Report", icon: Ship, desc: "Transit, delays, delivery rates" },
    { title: "Quotations Report", icon: FileText, desc: "RFQ pipeline & conversion" },
    { title: "Payments Report", icon: CreditCard, desc: "Receivables & payment status" },
    { title: "Market Intelligence", icon: Globe, desc: "Pricing trends & market data" },
  ];

  const hasChartData = (rows: Array<Record<string, unknown>>, keys: string[]) =>
    rows.some(r => keys.some(k => Number(r[k] || 0) > 0));

  return (
    <AdminLayout title="Command Center" subtitle="OG Exports — Executive Intelligence Platform">
      <div className="p-4 md:p-6 space-y-6">
        {/* ── COMMAND HEADER ── */}
        <div className="luxury-card p-5 rounded-2xl" style={{ background: EMERALD }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">
                OG Exports Command Center
              </h1>
              <p className="text-sm mt-0.5" style={{ color: GOLD_LIGHT }}>Executive Intelligence Platform — Super Admin</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-mono" style={{ color: GOLD_LIGHT }}>SYSTEM TIME</p>
              <p className="font-mono text-sm font-bold text-white mt-0.5">{formatTime(currentTime)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: GOLD_LIGHT }}>
                Last updated: {lastUpdated.toLocaleTimeString()}{loading ? " · Loading…" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["Today", "Week", "Month", "Quarter", "Year"].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p.toLowerCase() as DashboardPeriod)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: period === p.toLowerCase() ? GOLD : "rgba(255,255,255,0.1)",
                    color: period === p.toLowerCase() ? "#1a1a1a" : "white",
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => void handleRefresh()}
                className="p-2 rounded-lg transition-all"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <RefreshCw className={`w-4 h-4 text-white ${spinning ? "animate-spin" : ""}`} />
              </button>
              <div className="relative">
                <button className="p-2 rounded-lg transition-all" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Bell className="w-4 h-4 text-white" />
                </button>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex flex-wrap gap-3" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            {[
              { icon: "🟢", label: "All Systems Operational" },
              { icon: "📦", label: `${kpis.orders.active} Active Orders` },
              { icon: "🚢", label: `${kpis.shipments.in_progress} Shipments` },
              { icon: "⚠️", label: `${kpis.inventory.low_stock_alerts} Low Stock` },
              { icon: "💰", label: `${fmtUsd(kpis.payments.outstanding)} Outstanding` },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.9)" }}>
                <span>{s.icon}</span> {s.label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>Dashboard data failed to load: {error}</span>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── KPI GRID ── */}
        <div className="space-y-4">
          {kpiRows.map(row => (
            <div key={row.label}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {row.items.map(kpi => {
                  const accent = ("accent" in kpi && typeof kpi.accent === "string") ? kpi.accent : row.color;
                  const href = ("href" in kpi && typeof kpi.href === "string") ? kpi.href : undefined;
                  const body = (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent + "15" }}>
                          <kpi.icon className="w-3.5 h-3.5" style={{ color: accent }} />
                        </div>
                        {href ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <span className={`text-[9px] font-bold flex items-center gap-0.5 ${kpi.change === "—" ? "text-muted-foreground" : kpi.up ? "text-green-600" : "text-red-500"}`}>
                            {kpi.change !== "—" && (kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
                            {kpi.change}
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold font-heading leading-none" style={{ color: accent }}>{kpi.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{kpi.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: accent + "99" }}>{kpi.sub}</p>
                    </>
                  );
                  if (href) {
                    return (
                      <button
                        key={kpi.label}
                        type="button"
                        onClick={() => navigate(href)}
                        className="luxury-card p-3 rounded-xl text-left hover:ring-1 transition-all"
                        style={{ ["--tw-ring-color" as string]: accent + "40" }}
                      >
                        {body}
                      </button>
                    );
                  }
                  return (
                    <div key={kpi.label} className="luxury-card p-3 rounded-xl">
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── INDUSTRY NEWS ── */}
        <div className="luxury-card p-5 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-heading font-bold text-base flex items-center gap-2">
                <Newspaper className="w-4 h-4" style={{ color: GOLD }} />
                Industry & Trade News
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pakistan ag exports, commodities, shipping & regulation
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {newsSyncMsg && (
                <span className="text-[10px] text-muted-foreground max-w-[220px] truncate" title={newsSyncMsg}>
                  {newsSyncMsg}
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleNewsSync()}
                disabled={newsSyncing}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
                style={{ background: EMERALD, color: "white" }}
              >
                <RefreshCw className={`w-3 h-3 ${newsSyncing ? "animate-spin" : ""}`} />
                {newsSyncing ? "Syncing…" : "Sync news"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/trade-intelligence")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted"
              >
                Open Intel Center
              </button>
            </div>
          </div>
          {newsError && (
            <p className="text-xs text-red-600 mb-3">{newsError}</p>
          )}
          {newsLoading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Loading industry news…</p>
          ) : industryNews.length === 0 ? (
            <div className="text-center py-8">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-3">No industry articles yet. Sync Google news or approve items in Trade Intelligence.</p>
              <button
                type="button"
                onClick={() => void handleNewsSync()}
                disabled={newsSyncing}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: GOLD, color: "#1a1a1a" }}
              >
                Sync industry news
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {industryNews.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => navigate("/admin/trade-intelligence")}
                  className="text-left p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: GOLD + "20", color: GOLD }}>
                      {n.category}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate">{n.source}</span>
                  </div>
                  <p className="text-xs font-semibold leading-snug line-clamp-2">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{n.summary}</p>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : "—"}
                    {n.status !== "approved" ? ` · ${n.status}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── MAP + ACTIVITY ── */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 luxury-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-heading font-bold text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: EMERALD }} />
                  Global Trade Network
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {destinations.length} {destinations.length === 1 ? "destination" : "destinations"} — Live shipment data
                </p>
              </div>
              <Badge className="text-[10px]" style={{ background: GOLD + "20", color: GOLD, border: `1px solid ${GOLD}44` }}>
                Live
              </Badge>
            </div>
            {destinations.length === 0 ? (
              <EmptyState message="No trade destinations yet" />
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {destinations.map(c => (
                  <div key={c.name} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: EMERALD + "0c" }}>
                    <span className="text-base leading-none w-5 shrink-0">{c.flag || "🌍"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold leading-none truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.orders} orders</p>
                    </div>
                    <p className="text-[10px] font-bold shrink-0" style={{ color: GOLD }}>{fmtUsd(c.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: "Countries", value: String(destinations.length) },
                { label: "Active Buyers", value: String(kpis.buyers.active) },
                { label: "Shipments", value: String(kpis.shipments.in_progress) },
                { label: "Trade Routes", value: String(destinations.length) },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: EMERALD + "0d" }}>
                  <p className="text-lg font-bold font-heading" style={{ color: EMERALD }}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="luxury-card p-5 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h2 className="font-heading font-bold text-sm">Live Activity</h2>
              </div>
              <span className="text-[10px] text-muted-foreground">{formatTime(lastUpdated).split("—")[1]?.trim()}</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-80 space-y-2 pr-1">
              {activity.length === 0 ? (
                <EmptyState message="No recent activity" />
              ) : activity.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <ActivityIcon iconName={item.icon} color={item.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/admin/compliance")}
              className="mt-3 w-full text-center text-xs font-medium py-2 rounded-lg transition-colors"
              style={{ background: EMERALD + "10", color: EMERALD }}
            >
              View All Activity →
            </button>
          </div>
        </div>

        {/* ── TABBED DEEP DIVES ── */}
        <Tabs defaultValue="export-ops" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto mb-4 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="export-ops" className="text-xs">Export Ops</TabsTrigger>
            <TabsTrigger value="import-ops" className="text-xs">Import Ops</TabsTrigger>
            <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
            <TabsTrigger value="buyers" className="text-xs">Buyers</TabsTrigger>
            {investmentModuleEnabled && (
              <TabsTrigger value="investments" className="text-xs">Investments</TabsTrigger>
            )}
            {supplierModuleEnabled && (
              <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>
            )}
            <TabsTrigger value="warehouse" className="text-xs">Warehouse</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
            <TabsTrigger value="ai-insights" className="text-xs">AI Insights</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="export-ops">
            <div className="luxury-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-base">Export Operations Pipeline</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time order tracking — {pipeline.length} active export {pipeline.length === 1 ? "order" : "orders"}
                  </p>
                </div>
                <Badge style={{ background: EMERALD + "15", color: EMERALD, border: `1px solid ${EMERALD}30` }}>
                  {pipeline.filter(o => o.stage !== "delivered").length} In Progress
                </Badge>
              </div>
              <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-2">
                {["Order", "Production", "Loading", "Customs", "Transit", "Delivered"].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: EMERALD, color: "white" }}>{i + 1}</div>
                      <span className="text-[9px] text-muted-foreground mt-1 whitespace-nowrap">{step}</span>
                    </div>
                    {i < arr.length - 1 && <div className="flex-1 h-0.5 min-w-4" style={{ background: EMERALD + "40" }} />}
                  </React.Fragment>
                ))}
              </div>
              {pipeline.length === 0 ? (
                <EmptyState message="No active export orders" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Order ID", "Buyer", "Product", "Qty", "Stage", "ETA", "Value"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pipeline.map(o => (
                        <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3 text-xs font-mono font-bold" style={{ color: EMERALD }}>{o.id}</td>
                          <td className="py-2.5 px-3 text-xs font-medium">{o.buyer}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{o.product}</td>
                          <td className="py-2.5 px-3 text-xs font-bold">{o.qty}</td>
                          <td className="py-2.5 px-3"><StageBadge stage={o.stage} /></td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{o.eta}</td>
                          <td className="py-2.5 px-3 text-xs font-bold" style={{ color: GOLD }}>{fmtUsd(o.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="import-ops">
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    location: "Inventory",
                    name: "Approved Stock",
                    capacity: warehouse.length ? Math.min(100, Math.round((warehouse.filter(w => w.status !== "good").length / Math.max(1, warehouse.length)) * 100)) : 0,
                    items: warehouse.length,
                    value: fmtUsd(warehouse.reduce((s, w) => s + w.value, 0)),
                  },
                  {
                    location: "Low Stock",
                    name: "Attention Needed",
                    capacity: kpis.inventory.low_stock_alerts,
                    items: kpis.inventory.low_stock_alerts,
                    value: fmtUsd(warehouse.filter(w => w.status !== "good").reduce((s, w) => s + w.value, 0)),
                  },
                  {
                    location: "SKUs",
                    name: "Warehouse Items",
                    capacity: kpis.inventory.warehouse_items,
                    items: kpis.inventory.warehouse_items,
                    value: fmtUsd(kpis.inventory.total_value ?? warehouse.reduce((s, w) => s + w.value, 0)),
                  },
                ].map(w => (
                  <div key={w.location} className="luxury-card p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-sm">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground">{w.location} · {w.items} product lines</p>
                      </div>
                      <Warehouse className="w-5 h-5" style={{ color: EMERALD }} />
                    </div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Metric</span>
                      <span className="font-bold">{w.capacity}</span>
                    </div>
                    <p className="text-xs mt-2 font-bold" style={{ color: GOLD }}>Inventory Value: {w.value}</p>
                  </div>
                ))}
              </div>
              {warehouse.length === 0 && <EmptyState message="No warehouse inventory yet" />}
            </div>
          </TabsContent>

          <TabsContent value="finance">
            <div className="space-y-5">
              <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-1">Revenue, Profit & Expenses</h3>
                  <p className="text-xs text-muted-foreground mb-4">12-month trend</p>
                  {!hasChartData(charts.revenue_trend, ["revenue"]) ? (
                    <ChartEmpty />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={charts.revenue_trend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={EMERALD} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={EMERALD} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtUsd(v)} />
                        <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [fmtUsd(v), ""]} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Area type="monotone" dataKey="revenue" stroke={EMERALD} fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Cash Flow", value: fmtUsd(kpis.revenue.monthly), sub: "Monthly revenue", color: "#16a34a", icon: TrendingUp },
                    { label: "Pending Payments", value: fmtUsd(kpis.payments.pending), sub: "Awaiting receipt", color: "#f59e0b", icon: Clock },
                    { label: "Outstanding", value: fmtUsd(kpis.payments.outstanding), sub: "Overdue receivables", color: "#ef4444", icon: AlertTriangle },
                    { label: "Completed Payments", value: fmtUsd(kpis.payments.completed), sub: "Approved deposits", color: EMERALD, icon: BarChart2 },
                  ].map(f => (
                    <div key={f.label} className="luxury-card p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: f.color + "15" }}>
                          <f.icon className="w-4 h-4" style={{ color: f.color }} />
                        </div>
                        <div>
                          <p className="text-lg font-bold font-heading" style={{ color: f.color }}>{f.value}</p>
                          <p className="text-[10px] text-muted-foreground">{f.label}</p>
                          <p className="text-[9px]" style={{ color: f.color + "99" }}>{f.sub}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="luxury-card p-5 rounded-2xl">
                <h3 className="font-heading font-bold text-sm mb-3">Currency Trade Volumes</h3>
                {charts.currency_breakdown.length === 0 ? (
                  <EmptyState message="No currency trade data yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Currency", "Trade Volume", "Orders", "% of Total", "Avg. Order"].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {charts.currency_breakdown.map(c => (
                          <tr key={c.currency} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 text-xs font-bold">{c.currency}</td>
                            <td className="py-2.5 px-3 text-xs font-bold" style={{ color: EMERALD }}>{fmtUsd(c.volume)}</td>
                            <td className="py-2.5 px-3 text-xs">{c.orders}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: EMERALD }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{c.pct}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground">{fmtUsd(c.avg)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="buyers">
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Buyers", value: String(kpis.buyers.total), icon: Users, color: EMERALD },
                  { label: "Active (30d)", value: String(kpis.buyers.active), icon: ShoppingCart, color: GOLD },
                  { label: "New This Month", value: String(kpis.buyers.new_this_month), icon: Users, color: "#16a34a" },
                  { label: "Retention", value: `${kpis.buyers.retention_pct || 0}%`, icon: Award, color: "#8b5cf6" },
                ].map(m => (
                  <div key={m.label} className="luxury-card p-4 rounded-xl text-center">
                    <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center mb-2" style={{ background: m.color + "15" }}>
                      <m.icon className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <p className="text-2xl font-bold font-heading" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid lg:grid-cols-5 gap-5">
                <div className="lg:col-span-3 luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Top Destinations by Revenue</h3>
                  {charts.country_performance.length === 0 ? (
                    <EmptyState message="No buyer destination data yet" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            {["Country", "Orders", "Revenue"].map(h => (
                              <th key={h} className="text-left py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {charts.country_performance.map(c => (
                            <tr key={c.name} className="hover:bg-muted/20">
                              <td className="py-2 px-2 text-xs font-medium">{c.name}</td>
                              <td className="py-2 px-2 text-xs font-bold">{c.orders}</td>
                              <td className="py-2 px-2 text-xs font-bold" style={{ color: GOLD }}>{fmtUsd(c.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-2 luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Buyers by Country</h3>
                  {!hasChartData(charts.country_performance, ["orders"]) ? (
                    <ChartEmpty />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={charts.country_performance} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Bar dataKey="orders" fill={EMERALD} radius={[0, 4, 4, 0]} name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {investmentModuleEnabled && (
            <TabsContent value="investments">
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Total Investment", value: fmtUsd(invest.total_investment), color: GOLD, sub: "Eligible (incl. pending)" },
                    { label: "Active Portfolio", value: fmtUsd(invest.active_portfolio), color: EMERALD, sub: "Active + completed" },
                    { label: "Portfolio Value", value: fmtUsd(invest.portfolio_value), color: "#16a34a", sub: "Raised capital" },
                    { label: "Total Investors", value: String(invest.total_investors), color: "#2563eb", sub: "Distinct investors" },
                    { label: "Active Projects", value: String(invest.active_projects), color: "#8b5cf6", sub: invest.avg_roi_pct ? `Avg ROI ${invest.avg_roi_pct}%` : "Open pipeline" },
                  ].map(k => (
                    <div key={k.label} className="luxury-card p-4 rounded-xl text-center">
                      <p className="text-2xl font-bold font-heading" style={{ color: k.color }}>{k.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{k.label}</p>
                      <p className="text-[9px] text-muted-foreground/80 mt-0.5">{k.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Open Investment Opportunities</h3>
                  {invest.open_projects.length === 0 ? (
                    <EmptyState message="No open investment projects" />
                  ) : (
                    <div className="space-y-3">
                      {invest.open_projects.map(op => (
                        <div key={op.id} className="p-3 rounded-xl border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold">{op.title}</p>
                            <span className="text-[9px] font-mono" style={{ color: EMERALD }}>{op.id}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                            <span>Target: <strong style={{ color: GOLD }}>{fmtUsd(op.target)}</strong></span>
                            <span>ROI: <strong style={{ color: "#16a34a" }}>{op.roi}</strong></span>
                            <span>ETA: {op.eta}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${op.raised_pct}%`, background: EMERALD }} />
                          </div>
                          <p className="text-[9px] text-right mt-0.5 text-muted-foreground">{op.raised_pct}% funded</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {supplierModuleEnabled && (
            <TabsContent value="suppliers">
              <div className="space-y-4">
                <div className="p-3 rounded-xl border-2 flex items-center gap-3" style={{ background: "#fef2f2", borderColor: "#ef4444" }}>
                  <Shield className="w-5 h-5 shrink-0" style={{ color: "#ef4444" }} />
                  <div>
                    <p className="text-sm font-bold text-red-700">CONFIDENTIAL — SUPER ADMIN ONLY</p>
                    <p className="text-xs text-red-600">Supplier pricing data must NEVER be shared with buyers.</p>
                  </div>
                </div>
                <div className="luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Supplier Offer Pipeline — Internal Only</h3>
                  {supplierOffers.length === 0 ? (
                    <EmptyState message="No supplier offers yet" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            {["Supplier", "Product", "Qty", "Price/MT", "Quality", "Delivery", "Status"].map(h => (
                              <th key={h} className="text-left py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {supplierOffers.map(s => (
                            <tr key={s.id} className="hover:bg-muted/20">
                              <td className="py-2.5 px-2 text-xs font-medium">{s.supplier}</td>
                              <td className="py-2.5 px-2 text-xs">{s.product}</td>
                              <td className="py-2.5 px-2 text-xs font-bold">{s.qty}</td>
                              <td className="py-2.5 px-2 text-xs font-bold" style={{ color: EMERALD }}>{s.price}</td>
                              <td className="py-2.5 px-2 text-xs">{s.quality}</td>
                              <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">{s.delivery}</td>
                              <td className="py-2.5 px-2"><StatusBadge status={s.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="warehouse">
            <div className="luxury-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-base">Warehouse Inventory</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time stock levels</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-green-500" /> Good</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-amber-500" /> Low</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
                </div>
              </div>
              {warehouse.length === 0 ? (
                <EmptyState message="No warehouse inventory yet" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Product", "SKU", "Qty", "Unit", "Location", "Value", "Status"].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {warehouse.map(w => (
                        <tr key={w.sku + w.product} className={`hover:bg-muted/20 transition-colors ${w.status === "critical" ? "bg-red-50/50" : w.status === "low" ? "bg-amber-50/50" : ""}`}>
                          <td className="py-2.5 px-3 text-xs font-medium">{w.product}</td>
                          <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground">{w.sku}</td>
                          <td className="py-2.5 px-3 text-xs font-bold">{w.qty}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{w.unit}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{w.location}</td>
                          <td className="py-2.5 px-3 text-xs font-bold" style={{ color: GOLD }}>{fmtUsd(w.value)}</td>
                          <td className="py-2.5 px-3"><StatusBadge status={w.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-5">
              <div className="grid lg:grid-cols-2 gap-5">
                <div className="luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">User Growth Trend</h3>
                  {!hasChartData(charts.buyer_growth, ["buyers", "investors"]) ? (
                    <ChartEmpty />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={charts.buyer_growth} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="buyers" stroke={EMERALD} strokeWidth={2} dot={false} name="Buyers" />
                        <Line type="monotone" dataKey="investors" stroke={GOLD} strokeWidth={2} dot={false} name="Investors" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Monthly Revenue</h3>
                  {!hasChartData(charts.revenue_trend, ["revenue"]) ? (
                    <ChartEmpty />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={charts.revenue_trend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtUsd(v)} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} formatter={(v: number) => [fmtUsd(v), ""]} />
                        <Bar dataKey="revenue" fill={EMERALD} radius={[4, 4, 0, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Product Performance (Revenue)</h3>
                  {charts.product_performance.length === 0 ? (
                    <ChartEmpty />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={charts.product_performance} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtUsd(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} formatter={(v: number) => [fmtUsd(v), ""]} />
                        <Bar dataKey="revenue" fill={EMERALD} radius={[0, 4, 4, 0]} name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="luxury-card p-5 rounded-2xl">
                  <h3 className="font-heading font-bold text-sm mb-3">Country Performance</h3>
                  {charts.country_performance.length === 0 ? (
                    <EmptyState message="No country performance data yet" />
                  ) : (
                    <div className="space-y-2">
                      {charts.country_performance.map(c => {
                        const maxRev = Math.max(...charts.country_performance.map(x => x.revenue), 1);
                        return (
                          <div key={c.name}>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-medium">{c.name}</span>
                              <div className="flex gap-3">
                                <span className="text-muted-foreground">{c.orders} orders</span>
                                <span className="font-bold" style={{ color: GOLD }}>{fmtUsd(c.revenue)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(c.revenue / maxRev) * 100}%`, background: EMERALD }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai-insights">
            <div className="luxury-card p-8 rounded-2xl text-center">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: EMERALD }} />
              <h3 className="font-heading font-bold text-base mb-1">No insights available yet</h3>
              <p className="text-xs text-muted-foreground">
                AI insights will appear here once there is enough operational data.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="luxury-card p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5" style={{ color: EMERALD }} />
                <h3 className="font-heading font-bold text-base">Upcoming Business Events</h3>
              </div>
              {calendarEvents.length === 0 ? (
                <EmptyState message="No upcoming events" />
              ) : (
                <div className="space-y-3">
                  {calendarEvents.map((ev, i) => {
                    const typeMap: Record<string, { bg: string; color: string }> = {
                      meeting: { bg: "#dbeafe", color: "#1d4ed8" },
                      shipment: { bg: "#d1fae5", color: "#065f46" },
                      payment: { bg: "#fef3c7", color: "#b45309" },
                      contract: { bg: "#ede9fe", color: "#7c3aed" },
                      expiry: { bg: "#fee2e2", color: "#991b1b" },
                      followup: { bg: "#f0fdf4", color: "#15803d" },
                    };
                    const t = typeMap[ev.type] ?? { bg: "#f1f5f9", color: "#475569" };
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-border hover:bg-muted/20 transition-colors">
                        <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold" style={{ background: EMERALD + "10", color: EMERALD }}>
                          <span className="text-[10px]">{ev.date.split(" ")[0]}</span>
                          <span className="text-lg font-heading">{ev.date.split(" ")[1]}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{ev.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.time}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0" style={{ background: t.bg, color: t.color }}>
                          {ev.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="luxury-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-base">Executive Report Centre</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Generate and download business intelligence reports</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {reports.map(r => (
                  <div key={r.title} className="luxury-card p-4 rounded-xl flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: EMERALD + "10" }}>
                      <r.icon className="w-5 h-5" style={{ color: EMERALD }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{r.title}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{r.desc}</p>
                    </div>
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white"
                        style={{ background: EMERALD }}
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => navigate("/admin/reports")}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                        style={{ background: GOLD + "20", color: GOLD }}
                      >
                        <Download className="w-3 h-3 inline" /> Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Audit Log Entries", value: String(security.audit_log_count), icon: FileText, color: GOLD },
                  { label: "Failed Attempts Today", value: String(security.failed_attempts_today), icon: AlertTriangle, color: "#ef4444" },
                  { label: "Pending KYC", value: String(data.kyc_pending), icon: Shield, color: "#8b5cf6" },
                  { label: "Open AML", value: String(data.aml_open), icon: Eye, color: EMERALD },
                ].map(s => (
                  <div key={s.label} className="luxury-card p-4 rounded-xl text-center">
                    <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center mb-2" style={{ background: s.color + "15" }}>
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <p className="text-2xl font-bold font-heading" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="luxury-card p-5 rounded-2xl">
                <h3 className="font-heading font-bold text-sm mb-3">Login & Audit Activity</h3>
                {security.logs.length === 0 ? (
                  <EmptyState message="No audit log entries yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["User", "Action", "IP Address", "Time", "Status"].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {security.logs.map((log, i) => (
                          <tr key={i} className={`hover:bg-muted/20 ${log.status === "failed" ? "bg-red-50/40" : ""}`}>
                            <td className="py-2.5 px-3 text-xs font-medium">{log.user}</td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground">{log.action}</td>
                            <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground">{log.ip}</td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">{log.time}</td>
                            <td className="py-2.5 px-3"><StatusBadge status={log.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── QUICK ACTIONS + NOTIFICATIONS ── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="luxury-card p-5 rounded-2xl">
            <h3 className="font-heading font-bold text-base mb-1">Quick Actions</h3>
            <p className="text-xs text-muted-foreground mb-4">One-click access to common tasks</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.href)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:bg-muted/20 transition-all text-center group"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ background: a.color + "12" }}>
                    <a.icon className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ color: a.color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="luxury-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-base">Smart Notifications</h3>
                <p className="text-xs text-muted-foreground">Alerts requiring your attention</p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: notifications.length ? "#ef4444" : "#16a34a" }}
              >
                {notifications.length} Active
              </span>
            </div>
            <div className="space-y-2.5">
              {notifications.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  All clear! No pending notifications.
                </div>
              )}
              {notifications.map(n => {
                const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                  AlertTriangle, Clock, CreditCard, Shield, Truck
                };
                const Icon = IconMap[n.icon] ?? Bell;
                return (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: n.color + "15" }}>
                      <Icon className="w-4 h-4" style={{ color: n.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground leading-tight">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{n.detail}</p>
                      <p className="text-[9px] mt-1" style={{ color: n.color }}>{n.time}</p>
                    </div>
                    <button
                      onClick={() => setDismissedNotifs(prev => [...prev, n.id])}
                      className="text-muted-foreground hover:text-foreground transition-colors text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
