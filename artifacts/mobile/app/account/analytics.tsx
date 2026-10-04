import React from 'react';
import { Text, View } from 'react-native';
import {
  getGetInvestorDashboardQueryKey,
  getGetInvestorInvestmentsQueryKey,
  useGetInvestorDashboard,
  useGetInvestorInvestments,
} from '@workspace/api-client-react';
import { AllocationDonut, type AllocationSlice } from '@/components/AllocationDonut';
import { Card, ErrorState, Screen, Section } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap, type Json } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const pageSize = 100;
const notProvided = 'Not provided by OG Exports';
const completedStatuses = new Set(['complete', 'completed', 'settled']);
const activeProjectStatuses = new Set(['shipping', 'in transit', 'custom clearance']);

type TradeAggregate = {
  key: string;
  commodity: string;
  destination: string;
  investmentStatuses: Set<string>;
  projectStatuses: Set<string>;
  capital: number;
  hasCapital: boolean;
  cycleDays: number | null;
};

function normalizeStatus(value: string) {
  return value.toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function capitalInCurrency(position: Json, currency: string): number | null {
  if (currency === 'USD') return amount(position, ['amount']);
  if (currency === 'PKR') return amount(position, ['amount_pkr']);
  const positionCurrency = first(position, ['amount_currency']).toUpperCase();
  return currency && positionCurrency === currency ? amount(position, ['amount']) : null;
}

function classifyTrade(trade: TradeAggregate): 'active' | 'completed' | null {
  const investmentStatuses = [...trade.investmentStatuses];
  const projectStatuses = [...trade.projectStatuses];
  if (investmentStatuses.length && investmentStatuses.every(status => status === 'cancelled' || status === 'canceled')) return null;
  if (investmentStatuses.some(status => completedStatuses.has(status)) || projectStatuses.some(status => completedStatuses.has(status))) return 'completed';
  if (projectStatuses.some(status => activeProjectStatuses.has(status))) return 'active';
  if (investmentStatuses.includes('pending')) return null;
  if (investmentStatuses.includes('active')) return 'active';
  return null;
}

function createAllocation(trades: TradeAggregate[], field: 'commodity' | 'destination'): AllocationSlice[] {
  const totals = new Map<string, number>();
  for (const trade of trades) {
    if (!trade.hasCapital || trade.capital <= 0) continue;
    const name = trade[field] || notProvided;
    totals.set(name, (totals.get(name) ?? 0) + trade.capital);
  }
  const sorted = [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= 5) return sorted;

  const leading = sorted.filter(item => item.name.toLowerCase() !== 'other').slice(0, 4);
  const leadingNames = new Set(leading.map(item => item.name));
  const otherValue = sorted
    .filter(item => !leadingNames.has(item.name))
    .reduce((sum, item) => sum + item.value, 0);
  return otherValue > 0 ? [...leading, { name: 'Other', value: otherValue }] : leading;
}

function moneyLabel(value: number | null, currency: string, loading: boolean, error: boolean) {
  if (loading) return 'Loading…';
  if (error) return 'Unavailable';
  if (value == null) return notProvided;
  return currency ? money(value, currency) : 'Currency not provided by OG Exports';
}

export default function TradeAnalytics() {
  const { token } = useAuth();
  const colors = useColors();
  const dashboardQuery = useGetInvestorDashboard({
    query: {
      queryKey: getGetInvestorDashboardQueryKey(),
      enabled: Boolean(token),
      staleTime: 30_000,
    },
  });
  const positionsQuery = useGetInvestorInvestments({ per_page: pageSize }, {
    query: {
      queryKey: getGetInvestorInvestmentsQueryKey({ per_page: pageSize }),
      enabled: Boolean(token),
      staleTime: 30_000,
    },
  });

  const dashboard = unwrap(dashboardQuery.data);
  const summary = record(dashboard.summary);
  const wallet = record(dashboard.wallet);
  const currency = first(wallet, ['currency', 'default_currency']).toUpperCase();
  const positions = list(positionsQuery.data);
  const positionsEnvelope = record(positionsQuery.data);
  const nestedPositionsEnvelope = record(positionsEnvelope.data);
  const pagination = record(positionsEnvelope.meta ?? nestedPositionsEnvelope.meta);
  const totalPositionCount = amount(pagination, ['total']) ?? amount(summary, ['investments_count']);
  const partialPositionList = !positionsQuery.isLoading && !positionsQuery.isError
    && (totalPositionCount != null ? positions.length < totalPositionCount : positions.length >= pageSize);

  const tradesByKey = new Map<string, TradeAggregate>();
  let missingCapitalCount = 0;
  positions.forEach((position, index) => {
    const project = record(position.project ?? position.trade ?? position.trade_details);
    const key = first(position, ['project_id', 'trade_id', 'trade_code'], first(project, ['id', 'project_id', 'reference', 'trade_id'], first(position, ['id'], `position-${index}`)));
    const commodity = first(project, ['commodity', 'variety'], first(position, ['commodity', 'commodity_name'], notProvided));
    const destination = first(project, ['destination', 'destination_country', 'to_country', 'destination_market'], first(position, ['destination', 'destination_country', 'to_country'], notProvided));
    let trade = tradesByKey.get(key);
    if (!trade) {
      trade = {
        key,
        commodity,
        destination,
        investmentStatuses: new Set<string>(),
        projectStatuses: new Set<string>(),
        capital: 0,
        hasCapital: false,
        cycleDays: null,
      };
      tradesByKey.set(key, trade);
    } else {
      if (trade.commodity === notProvided && commodity !== notProvided) trade.commodity = commodity;
      if (trade.destination === notProvided && destination !== notProvided) trade.destination = destination;
    }

    const investmentStatus = normalizeStatus(first(position, ['investment_status', 'status', 'state']));
    const projectStatus = normalizeStatus(first(project, ['status', 'trade_status', 'shipment_status'], first(position, ['project_status', 'trade_status', 'shipment_status'])));
    if (investmentStatus) trade.investmentStatuses.add(investmentStatus);
    if (projectStatus) trade.projectStatuses.add(projectStatus);

    const reportedCycle = amount(project, ['investment_period_days']) ?? amount(position, ['investment_period_days', 'trade_cycle_days']);
    if (trade.cycleDays == null && reportedCycle != null && reportedCycle > 0) trade.cycleDays = reportedCycle;

    const capital = capitalInCurrency(position, currency);
    if (capital == null) {
      missingCapitalCount += 1;
    } else {
      trade.capital += capital;
      trade.hasCapital = true;
    }
  });

  const trades = [...tradesByKey.values()];
  const activeTrades = trades.filter(trade => classifyTrade(trade) === 'active').length;
  const completedTrades = trades.filter(trade => classifyTrade(trade) === 'completed').length;
  const reportedCycles = trades.flatMap(trade => trade.cycleDays == null ? [] : [trade.cycleDays]);
  const averageCycle = reportedCycles.length
    ? reportedCycles.reduce((sum, days) => sum + days, 0) / reportedCycles.length
    : null;
  const formattedAverageCycle = averageCycle == null
    ? notProvided
    : `${Number.isInteger(averageCycle) ? averageCycle : averageCycle.toFixed(1)} days`;
  const commodityAllocation = createAllocation(trades, 'commodity');
  const destinationAllocation = createAllocation(trades, 'destination');

  const capitalDeployed = amount(summary, ['total_investment', 'invested_capital']);
  const explicitDistributions = amount(summary, ['distributed_returns', 'total_distributed_returns', 'total_distributions'])
    ?? amount(dashboard, ['distributed_returns', 'total_distributed_returns', 'total_distributions']);
  const reportedProfitTotal = amount(summary, ['total_profit_earned']) ?? amount(dashboard, ['total_profit_earned']);
  const distributions = explicitDistributions ?? reportedProfitTotal;

  const positionStatus = positionsQuery.isLoading ? 'Loading…' : positionsQuery.isError ? 'Unavailable' : null;
  const averageStatus = positionsQuery.isLoading ? 'Loading…' : positionsQuery.isError ? 'Unavailable' : formattedAverageCycle;
  const capitalStatus = moneyLabel(capitalDeployed, currency, dashboardQuery.isLoading, dashboardQuery.isError);
  const distributionsStatus = moneyLabel(distributions, currency, dashboardQuery.isLoading, dashboardQuery.isError);

  const metrics = [
    { label: 'Total Trades', value: positionStatus ?? String(trades.length) },
    { label: 'Active Trades', value: positionStatus ?? String(activeTrades) },
    { label: 'Completed Trades', value: positionStatus ?? String(completedTrades) },
    { label: 'Average Trade Cycle', value: averageStatus, note: reportedCycles.length ? `From ${reportedCycles.length} reported investment periods; elapsed cycle time is not supplied.` : undefined },
    { label: 'Total Capital Deployed', value: capitalStatus, highlight: true },
    {
      label: 'Total Distributions',
      value: distributionsStatus,
      note: explicitDistributions != null ? 'Reported by OG Exports' : reportedProfitTotal != null ? 'OG Exports-reported profit total; a dedicated distribution total was not provided.' : undefined,
    },
  ];

  const coverageNote = partialPositionList
    ? `Showing ${positions.length} of ${totalPositionCount ?? '100+'} investment records. Trade counts, cycle averages and allocations reflect the loaded records only.`
    : undefined;
  const allocationNote = [
    partialPositionList ? 'Allocation reflects the loaded records only.' : '',
    'Smaller categories are grouped into Other when needed.',
  ].filter(Boolean).join(' ');

  return <Screen title="Trade Analytics" subtitle="Trade activity and capital allocation reported by OG Exports">
    <Section title="Portfolio Statistics" />
    <View style={{ gap: 10 }}>
      {Array.from({ length: Math.ceil(metrics.length / 2) }, (_, rowIndex) => {
        const row = metrics.slice(rowIndex * 2, rowIndex * 2 + 2);
        return <View key={rowIndex} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map(metric => <Card key={metric.label} style={{ flex: 1, minHeight: 104, marginBottom: 0, padding: 14, backgroundColor: metric.highlight ? colors.secondary : colors.card }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>{metric.label}</Text>
            <Text style={{ color: metric.highlight ? colors.primary : colors.foreground, fontSize: metric.highlight ? 16 : 18, fontWeight: '700', lineHeight: 23, marginTop: 8 }}>
              {metric.value}
            </Text>
            {metric.note ? <Text style={{ color: colors.mutedForeground, fontSize: 9, lineHeight: 13, marginTop: 4 }}>{metric.note}</Text> : null}
          </Card>)}
        </View>;
      })}
    </View>

    {positionsQuery.isError ? <ErrorState message="Trade records could not be loaded from OG Exports." onRetry={() => void positionsQuery.refetch()} /> : null}
    {dashboardQuery.isError ? <ErrorState message="Portfolio totals could not be loaded from OG Exports." onRetry={() => void dashboardQuery.refetch()} /> : null}
    {coverageNote ? <Card style={{ marginTop: 12, marginBottom: 0 }}>
      <Text style={{ color: colors.statusPending, fontSize: 11, lineHeight: 17 }}>{coverageNote}</Text>
    </Card> : null}

    <Section title="Commodity Allocation" />
    <AllocationDonut
      title="Capital by commodity"
      subtitle={currency ? `Share of comparable ${currency} capital` : 'Account currency not provided by OG Exports'}
      data={commodityAllocation}
      currency={currency}
      missingAmounts={missingCapitalCount}
      note={allocationNote}
    />

    <Section title="Destination Allocation" />
    <AllocationDonut
      title="Capital by destination"
      subtitle={currency ? `Share of comparable ${currency} capital` : 'Account currency not provided by OG Exports'}
      data={destinationAllocation}
      currency={currency}
      missingAmounts={missingCapitalCount}
      note={allocationNote}
    />
  </Screen>;
}