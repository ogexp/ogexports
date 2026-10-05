import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock3,
  Coins,
  MapPin,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardInvestorAnalytics } from "@/types/admin-dashboard";

interface InvestorAnalyticsPanelProps {
  analytics: DashboardInvestorAnalytics;
  formatMoney: (value: number) => string;
}

const COLORS = {
  emerald: "#176246",
  gold: "#c6a969",
  teal: "#4e9b8c",
  amber: "#b77a34",
  red: "#b45c55",
  grid: "hsl(var(--border))",
  muted: "hsl(var(--muted-foreground))",
};

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const moneyNumberFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactNumber = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

function periodLabel(period: string) {
  const labels: Record<string, string> = {
    today: "Today",
    week: "This week",
    month: "This month",
    quarter: "This quarter",
    year: "This year",
  };
  return labels[period] ?? period;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  testId: string;
}) {
  return (
    <article
      className="luxury-card min-w-0 rounded-xl p-4"
      aria-label={`${label}: ${value}`}
      data-testid={testId}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="font-heading text-[1.55rem] font-bold leading-none tracking-tight" data-testid={`${testId}-value`}>
        {value}
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{note}</p>
    </article>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  testId,
  empty,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  testId: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="luxury-card min-w-0 rounded-2xl p-4 md:p-5"
      aria-label={title}
      data-testid={testId}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-heading text-sm font-bold">{title}</h3>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {empty ? (
        <div
          className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center"
          role="status"
          data-testid={`${testId}-empty`}
        >
          <Activity className="mb-2 h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-xs font-semibold text-muted-foreground">No monthly series available</p>
          <p className="mt-1 text-[10px] text-muted-foreground/80">The server has not returned chart data for this view.</p>
        </div>
      ) : (
        <div className="h-[220px] w-full" role="img" aria-label={`${title}. ${description}`} data-testid={`${testId}-plot`}>
          {children}
        </div>
      )}
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  formatMoney,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  formatMoney?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-[10px] font-bold text-foreground">{label}</p>
      {payload.map((entry, index) => {
        const money = entry.dataKey === "amount";
        const shown = entry.value == null
          ? "—"
          : money && formatMoney
            ? formatMoney(entry.value)
            : numberFormat.format(entry.value);
        return (
          <p key={`${entry.dataKey ?? entry.name}-${index}`} className="text-[10px]" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold text-foreground">{shown}</span>
          </p>
        );
      })}
    </div>
  );
}

function RankingList({
  title,
  description,
  icon: Icon,
  rows,
  emptyMessage,
  testId,
  formatMoney,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  rows: Array<{ name: string; investment_count: number; investment_amount: number }>;
  emptyMessage: string;
  testId: string;
  formatMoney: (value: number) => string;
}) {
  const maxAmount = Math.max(0, ...rows.map((row) => row.investment_amount));
  return (
    <section className="luxury-card min-w-0 rounded-2xl p-4 md:p-5" aria-label={title} data-testid={testId}>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-heading text-sm font-bold">{title}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="flex min-h-[154px] flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 text-center" role="status" data-testid={`${testId}-empty`}>
          <Package className="mb-2 h-5 w-5 text-muted-foreground/60" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ol className="space-y-3" data-testid={`${testId}-list`}>
          {rows.map((row, index) => {
            const width = maxAmount > 0 ? Math.max(5, (row.investment_amount / maxAmount) * 100) : 5;
            return (
              <li key={`${row.name}-${index}`} className="rounded-lg px-2 py-1" data-testid={`${testId}-row-${index}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <span className="truncate text-xs font-semibold" title={row.name}>{row.name}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {row.investment_count} {row.investment_count === 1 ? "investment" : "investments"}
                  </span>
                </div>
                <div className="ml-7 flex items-center gap-3">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                  <span className="w-[92px] shrink-0 text-right font-mono text-[10px] font-semibold" data-testid={`${testId}-amount-${index}`}>
                    {formatMoney(row.investment_amount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function InvestorAnalyticsPanel({ analytics, formatMoney }: InvestorAnalyticsPanelProps) {
  const selectedPeriod = periodLabel(analytics.period);
  const moneyOrUnavailable = (value: number | null) => value == null ? "Unavailable" : formatMoney(value);
  const percentOrUnavailable = (value: number | null) => value == null ? "Unavailable" : `${numberFormat.format(value)}%`;
  const daysOrUnavailable = analytics.average_funding_days == null
    ? "Unavailable"
    : `${numberFormat.format(analytics.average_funding_days)} days`;

  return (
    <section className="space-y-5" aria-label="Investor capital analytics" data-testid="investor-analytics-panel">
      <header className="luxury-card overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-l-[3px] border-accent p-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                Laravel source of record
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Selected period · {selectedPeriod}
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold tracking-tight md:text-xl">Investor &amp; capital activity</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Period metrics and investment rankings use {selectedPeriod.toLowerCase()} data. The four charts show the server-returned 12-month series; this panel does not imply live tracking.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-[10px] text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Server-reported analytics</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Investor analytics summary">
        <MetricCard
          icon={Users}
          label="Active investors"
          value={numberFormat.format(analytics.active_investors_30d)}
          note="Distinct investors with an eligible investment in the last 30 days."
          testId="metric-active-investors"
        />
        <MetricCard
          icon={TrendingUp}
          label="New investors"
          value={numberFormat.format(analytics.new_investors)}
          note={`New investor accounts in ${selectedPeriod.toLowerCase()}.`}
          testId="metric-new-investors"
        />
        <MetricCard
          icon={Coins}
          label="Investment volume"
          value={formatMoney(analytics.invested_amount)}
          note={`${numberFormat.format(analytics.investment_count)} eligible investments in ${selectedPeriod.toLowerCase()}.`}
          testId="metric-investment-volume"
        />
        <MetricCard
          icon={Wallet}
          label="Average investment"
          value={moneyOrUnavailable(analytics.average_investment)}
          note="Mean investment amount for the selected period."
          testId="metric-average-investment"
        />
        <MetricCard
          icon={TrendingUp}
          label="Funding conversion"
          value={percentOrUnavailable(analytics.funding_conversion_pct)}
          note="Raised / target for projects created in the selected period."
          testId="metric-funding-conversion"
        />
        <MetricCard
          icon={Clock3}
          label="Average funding speed"
          value={daysOrUnavailable}
          note={`Days from project creation to first explicitly recorded funded event · ${analytics.funding_speed_samples} samples.`}
          testId="metric-funding-speed"
        />
        <MetricCard
          icon={Coins}
          label="Realized trade profit"
          value={moneyOrUnavailable(analytics.realized_profit)}
          note={`Completed investments with stored profit values only · ${analytics.realized_investments_count} qualifying investments.`}
          testId="metric-realized-profit"
        />
        <MetricCard
          icon={TrendingUp}
          label="Realized return"
          value={percentOrUnavailable(analytics.realized_return_pct)}
          note="Realized performance only; projected ROI is not actual performance."
          testId="metric-realized-return"
        />
      </div>

      <section className="luxury-card rounded-2xl p-4 md:p-5" aria-label="Funding progress for selected period" data-testid="funding-period-summary">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <Coins className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-heading text-sm font-bold">Project funding · {selectedPeriod}</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Projects created in the selected period; conversion is the server-reported raised-to-target ratio.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:min-w-[420px]">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
              <p className="mt-1 font-mono text-sm font-bold" data-testid="text-funding-project-count">{numberFormat.format(analytics.funding_projects_count)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Target</p>
              <p className="mt-1 font-mono text-sm font-bold" data-testid="text-funding-target">{formatMoney(analytics.funding_target)}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Raised</p>
              <p className="mt-1 font-mono text-sm font-bold text-primary" data-testid="text-funded-amount">{formatMoney(analytics.funded_amount)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Investor growth"
          description="New investors by month · 12-month server series"
          icon={Users}
          testId="chart-investor-growth"
          empty={!analytics.investor_growth.some((row) => row.new_investors > 0)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.investor_growth} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line name="New investors" dataKey="new_investors" type="monotone" stroke={COLORS.emerald} strokeWidth={2.5} dot={{ r: 2.5, fill: COLORS.emerald }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Investment activity"
          description="Investment amounts and counts by month · 12-month server series"
          icon={Coins}
          testId="chart-investment-activity"
          empty={!analytics.investment_activity.some((row) => row.investments > 0 || row.amount > 0)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.investment_activity} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis yAxisId="amount" tickFormatter={(value: number) => compactNumber.format(value)} tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip formatMoney={formatMoney} />} />
              <Bar yAxisId="amount" name="Investment amount" dataKey="amount" fill={COLORS.gold} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Line yAxisId="count" name="Investment count" dataKey="investments" type="monotone" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Wallet transaction counts"
          description="Recorded credits and debits by month · 12-month server series"
          icon={Wallet}
          testId="chart-wallet-activity"
          empty={!analytics.wallet_activity.some((row) => row.credits > 0 || row.debits > 0)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.wallet_activity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar name="Credits" dataKey="credits" fill={COLORS.teal} radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar name="Debits" dataKey="debits" fill={COLORS.amber} radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Withdrawal requests"
          description="Requests and approvals by month · 12-month server series"
          icon={ArrowUpFromLine}
          testId="chart-withdrawal-activity"
          empty={!analytics.withdrawal_activity.some((row) => row.requests > 0 || row.approved > 0)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.withdrawal_activity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={4}>
              <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: COLORS.muted, fontSize: 9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar name="Requests" dataKey="requests" fill={COLORS.gold} radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar name="Approved" dataKey="approved" fill={COLORS.emerald} radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="grid gap-4 xl:grid-cols-3" aria-label="Wallet and withdrawal operations" data-testid="investor-operations-summary">
        <article className="luxury-card rounded-2xl p-4 md:p-5" aria-label="Wallet activity summary" data-testid="wallet-period-summary">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-heading text-sm font-bold">Wallet ledger</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Recorded transaction count and completed posted amounts by currency.</p>
            </div>
          </div>
          <div className="mb-3 flex items-end justify-between border-b border-border/70 pb-3">
            <span className="text-xs text-muted-foreground">Transactions · {selectedPeriod}</span>
            <span className="font-mono text-sm font-bold" data-testid="text-wallet-transaction-count">{numberFormat.format(analytics.wallet_transaction_count)}</span>
          </div>
          {analytics.wallet_completed_amounts_by_currency.length === 0 ? (
            <p className="py-5 text-center text-xs text-muted-foreground" role="status" data-testid="wallet-currency-empty">No completed wallet amounts by currency are available.</p>
          ) : (
            <ul className="space-y-2.5" data-testid="wallet-currency-list">
              {analytics.wallet_completed_amounts_by_currency.map((entry, index) => (
                <li key={`${entry.currency}-${index}`} className="rounded-lg bg-muted/45 p-3" data-testid={`wallet-currency-row-${entry.currency}-${index}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tracking-wide">{entry.currency}</span>
                    <span className="text-[9px] text-muted-foreground">Posted amounts · {entry.currency}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground">Credits</p>
                        <p className="truncate font-mono text-xs font-semibold" data-testid={`wallet-credit-${entry.currency}-${index}`}>
                          {entry.currency} {moneyNumberFormat.format(entry.credits)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground">Debits</p>
                        <p className="truncate font-mono text-xs font-semibold" data-testid={`wallet-debit-${entry.currency}-${index}`}>
                          {entry.currency} {moneyNumberFormat.format(entry.debits)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="luxury-card rounded-2xl p-4 md:p-5" aria-label="Withdrawal request and approval totals" data-testid="withdrawal-period-summary">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
              <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-heading text-sm font-bold">Withdrawal queue</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Request and approval counts for {selectedPeriod.toLowerCase()}.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Requests</p>
              <p className="mt-2 font-heading text-2xl font-bold" data-testid="text-withdrawal-request-count">{numberFormat.format(analytics.withdrawal_request_count)}</p>
            </div>
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Approved</p>
              <p className="mt-2 font-heading text-2xl font-bold text-primary" data-testid="text-withdrawal-approved-count">{numberFormat.format(analytics.approved_withdrawal_count)}</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Counts are server totals for the selected period; amounts are not inferred from request counts.
          </p>
        </article>

        <article className="luxury-card rounded-2xl p-4 md:p-5" aria-label="Investment activity context" data-testid="investment-period-context">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-heading text-sm font-bold">Period context</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Selected-period investment totals.</p>
            </div>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
              <dt className="text-xs text-muted-foreground">Investments</dt>
              <dd className="font-mono text-xs font-bold" data-testid="text-period-investment-count">{numberFormat.format(analytics.investment_count)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
              <dt className="text-xs text-muted-foreground">Invested amount</dt>
              <dd className="font-mono text-xs font-bold" data-testid="text-period-invested-amount">{formatMoney(analytics.invested_amount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs text-muted-foreground">Eligible realized investments</dt>
              <dd className="font-mono text-xs font-bold" data-testid="text-realized-investments-count">{numberFormat.format(analytics.realized_investments_count)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Profit is limited to completed investments with a stored profit value. Forecasts and projected ROI are excluded.
          </p>
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-2" aria-label="Investment rankings for selected period">
        <RankingList
          title="Top commodities"
          description={`Ranked by investment activity · ${selectedPeriod}`}
          icon={Package}
          rows={analytics.top_commodities}
          emptyMessage="No commodity investment data is available for this period."
          testId="ranking-top-commodities"
          formatMoney={formatMoney}
        />
        <RankingList
          title="Top destinations"
          description={`Ranked by investment activity · ${selectedPeriod}`}
          icon={MapPin}
          rows={analytics.top_destinations}
          emptyMessage="No destination investment data is available for this period."
          testId="ranking-top-destinations"
          formatMoney={formatMoney}
        />
      </div>
    </section>
  );
}
