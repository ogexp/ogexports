import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import {
  getGetInvestorDashboardQueryKey,
  getGetInvestorInvestmentsQueryKey,
  useGetInvestorDashboard,
  useGetInvestorInvestments,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';

type PortfolioTab = 'Active' | 'Pending' | 'Completed';

function categorizeInvestmentStatus(status: string): PortfolioTab | null {
  const normalized = status.trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (/(^| )(complete|completed|closed|settled|fully distributed|fully paid)( |$)/.test(normalized)) return 'Completed';
  if (/(^| )(pending|processing|review|awaiting|submitted)( |$)/.test(normalized)) return 'Pending';
  if (/(^| )(active|funded|invested|in progress|ongoing|confirmed|approved|preparing|stuffing|customs|in transit|shipping|shipped|arrival|delivery|delivered|settlement|disbursed)( |$)/.test(normalized)) return 'Active';
  return null;
}

function supplied(value: string, fallback = 'Not provided by OG Exports') {
  return value || fallback;
}

export default function Portfolio() {
  const { token } = useAuth();
  const colors = useColors();
  const [selectedTab, setSelectedTab] = useState<PortfolioTab>('Active');
  const positionsQuery = useGetInvestorInvestments({ per_page: 50 }, {
    query: {
      queryKey: getGetInvestorInvestmentsQueryKey({ per_page: 50 }),
      enabled: !!token,
      staleTime: 30_000,
    },
  });
  const dashboardQuery = useGetInvestorDashboard({
    query: {
      queryKey: getGetInvestorDashboardQueryKey(),
      enabled: !!token,
      staleTime: 30_000,
    },
  });

  const rows = list(positionsQuery.data);
  const dashboard = unwrap(dashboardQuery.data);
  const summary = record(dashboard.summary);
  const wallet = record(dashboard.wallet);
  const series = record(dashboard.portfolio_series);
  const currency = first(summary, ['display_currency'], first(wallet, ['currency', 'default_currency']));
  const totalValue = amount(summary, ['total_portfolio_value']);
  const invested = amount(summary, ['total_investment', 'total_investment_usd', 'invested_capital']);
  const distributed = amount(summary, ['distributed_returns']);
  const pendingDistribution = amount(summary, ['pending_distribution']);
  const availableBalance = amount(wallet, ['available_balance', 'balance', 'available'])
    ?? amount(summary, ['available_balance']);
  const assignedRows = rows.map((item, index) => {
    const trade = record(item.trade ?? item.project ?? item.trade_details);
    const container = record(item.container ?? item.container_details ?? trade.container ?? trade.container_details);
    const investmentStatus = first(item, ['investment_status', 'status', 'state']);
    return {
      item,
      trade,
      container,
      investmentStatus,
      category: categorizeInvestmentStatus(investmentStatus),
      key: first(item, ['investment_id', 'id'], `investment-${index}`),
    };
  });
  const visibleRows = assignedRows.filter(row => row.category === selectedTab);
  const uncategorizedRows = assignedRows.filter(row => row.category == null);

  const renderInvestment = (entry: typeof assignedRows[number]) => {
    const { item, trade, container } = entry;
    const serverId = first(item, ['investment_id', 'id']);
    const tradeId = first(item, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code']));
    const commodity = first(item, ['commodity_name', 'commodity'], first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(item, ['project_name', 'title'])));
    const origin = first(item, ['origin', 'origin_country', 'from_country'], first(trade, ['origin', 'origin_country', 'from_country', 'country_of_origin']));
    const destination = first(item, ['destination', 'destination_country', 'to_country'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market']));
    const investmentCurrency = first(item, ['currency'], first(trade, ['currency']));
    const investedAmount = amount(item, ['amount', 'investment_amount', 'principal']);
    const tradeStatus = first(item, ['trade_status', 'shipment_status'], first(trade, ['trade_status', 'shipment_status', 'status']));
    const containerStatus = first(item, ['container_status'], first(
      container,
      ['status', 'current_status', 'shipment_status', 'trade_status'],
      first(trade, ['container_status', 'shipment_status'], first(item, ['shipment_status'])),
    ));
    const progress = amount(item, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage'])
      ?? amount(trade, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage']);
    const boundedProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
    const targetAmount = amount(item, [
      'projected_return_amount', 'estimated_return_amount', 'target_return_amount',
      'projected_distribution', 'estimated_distribution',
    ]) ?? amount(trade, [
      'projected_return_amount', 'estimated_return_amount', 'target_return_amount',
      'projected_distribution', 'estimated_distribution',
    ]);
    const targetPercent = amount(item, ['projected_return_percentage', 'estimated_return_percentage', 'target_return_percentage'])
      ?? amount(trade, ['projected_return_percentage', 'estimated_return_percentage', 'target_return_percentage']);
    const route = origin || destination
      ? `${origin || 'Origin not provided'} → ${destination || 'Destination not provided'}`
      : 'Route not provided by OG Exports';
    const amountLabel = investedAmount == null
      ? 'Not provided by OG Exports'
      : investmentCurrency ? money(investedAmount, investmentCurrency) : 'Currency not provided by OG Exports';
    const targetLabel = targetAmount != null
      ? investmentCurrency ? money(targetAmount, investmentCurrency) : 'Currency not provided by OG Exports'
      : targetPercent != null ? `${targetPercent.toFixed(2)}%` : 'Not provided by OG Exports';

    return <Card key={entry.key} style={{ padding: 18, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
            {tradeId ? `Trade #${tradeId.replace(/^Trade\s*#\s*/i, '')}` : 'Trade ID not provided by OG Exports'}
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 18, lineHeight: 23, fontWeight: '700', marginTop: 6 }}>
            {supplied(commodity, 'Commodity not provided by OG Exports')}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{route}</Text>
        </View>
        <Status value={supplied(entry.investmentStatus)} />
      </View>

      <View style={{ marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Investment amount</Text>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginTop: 4 }}>{amountLabel}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Target distribution</Text>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', textAlign: 'right', marginTop: 5 }}>{targetLabel}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 13 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 0.4 }}>TRADE STATUS</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', marginTop: 5 }}>{supplied(tradeStatus)}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 0.4 }}>CONTAINER STATUS</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 5 }}>{supplied(containerStatus)}</Text>
          </View>
        </View>
        {boundedProgress != null ? <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Trade progress, as reported</Text>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{boundedProgress}%</Text>
          </View>
          <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}>
            <View style={{ width: `${boundedProgress}%`, height: 6, borderRadius: 4, backgroundColor: colors.primary }} />
          </View>
        </View> : <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 13 }}>
          Trade progress not provided by OG Exports.
        </Text>}
      </View>
      <Pressable
        testID={`portfolio-view-details-${entry.key}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !serverId }}
        disabled={!serverId}
        onPress={() => router.push({ pathname: '/position/[id]', params: { id: serverId } })}
        style={({ pressed }) => ({
          minHeight: 44, borderRadius: 12, backgroundColor: serverId ? colors.lightGreen : colors.secondary,
          alignItems: 'center', justifyContent: 'center', marginTop: 15, opacity: pressed ? 0.78 : 1,
        })}
      >
        <Text style={{ color: serverId ? colors.primary : colors.mutedForeground, fontSize: 13, fontWeight: '700' }}>
          View Details
        </Text>
      </Pressable>
    </Card>;
  };

  const summaryValue = (value: number | null) => {
    if (dashboardQuery.isLoading) return 'Loading';
    if (value == null) return 'Not provided by OG Exports';
    return currency ? money(value, currency) : 'Currency not provided by OG Exports';
  };

  return <Screen title="My Portfolio" subtitle="Capital placed in real trade and shipment activity">
    <Section title="Summary" />
    <Card style={{ padding: 18, borderRadius: 20 }}>
      <View style={{ paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Total Portfolio Value</Text>
        <Text style={{ color: colors.primary, fontSize: 30, fontWeight: '700', letterSpacing: -0.7, marginTop: 5 }}>
          {summaryValue(totalValue)}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 }}>
        {[
          ['Total Invested', invested],
          ['Distributed Returns', distributed],
          ['Pending Distribution', pendingDistribution],
          ['Available Balance', availableBalance],
        ].map(([label, value], index) => <View key={String(label)} style={{
          width: '50%', paddingTop: 14, paddingRight: index % 2 === 0 ? 10 : 0, paddingLeft: index % 2 === 1 ? 10 : 0,
        }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 4 }}>
            {summaryValue(value as number | null)}
          </Text>
        </View>)}
      </View>
      {!dashboardQuery.isLoading && !currency ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 13 }}>
        Currency not provided by OG Exports. Values are not converted or inferred.
      </Text> : null}
    </Card>
    {dashboardQuery.isError ? <ErrorState message="Portfolio summary could not be loaded from the investor server." onRetry={() => void dashboardQuery.refetch()} /> : null}

    {positionsQuery.isError ? <ErrorState message="Portfolio positions could not be loaded." onRetry={() => void positionsQuery.refetch()} /> : null}
    {positionsQuery.isLoading ? <Card style={{ padding: 20 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading investment records…</Text>
      <View style={{ height: 9, borderRadius: 8, backgroundColor: colors.secondary, marginTop: 14 }} />
      <View style={{ height: 9, width: '68%', borderRadius: 8, backgroundColor: colors.secondary, marginTop: 9 }} />
    </Card> : null}
    {!positionsQuery.isLoading && !positionsQuery.isError ? <>
      <Section title="Investments" />
      <View style={{ flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: 14, padding: 4, marginBottom: 14 }}>
        {(['Active', 'Pending', 'Completed'] as PortfolioTab[]).map(tab => {
          const selected = selectedTab === tab;
          return <Pressable key={tab} testID={`portfolio-tab-${tab.toLowerCase()}`} accessibilityRole="button"
            accessibilityState={{ selected }} onPress={() => setSelectedTab(tab)}
            style={{ flex: 1, minHeight: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.card : 'transparent' }}>
            <Text style={{ color: selected ? colors.primary : colors.mutedForeground, fontSize: 12, fontWeight: selected ? '700' : '600' }}>{tab}</Text>
          </Pressable>;
        })}
      </View>
      {rows.length === 0
        ? <EmptyState title="Your portfolio is waiting" body="When an investment is recorded by OG Exports, its trade, shipment status, and distribution information will appear here." />
        : visibleRows.length
          ? visibleRows.map(renderInvestment)
          : <EmptyState title={`No ${selectedTab.toLowerCase()} investments`} body="No investment records with this reported status are available." />}
      {uncategorizedRows.length ? <>
        <Section title="Other reported statuses" />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 11 }}>
          These server statuses are shown as reported and are not assigned to an investment category.
        </Text>
        {uncategorizedRows.map(renderInvestment)}
      </> : null}
    </> : null}
    <PortfolioHistoryCard points={series.points} currency={currency} loading={dashboardQuery.isLoading} defaultRange="3M" />
    <Pressable accessibilityRole="button" onPress={() => router.push('/account/transactions')}>
      <Text style={{ color: colors.primary, fontWeight: '700', paddingVertical: 4 }}>View transaction history →</Text>
    </Pressable>
  </Screen>;
}