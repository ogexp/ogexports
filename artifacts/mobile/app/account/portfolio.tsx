import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import {
  getGetInvestorInvestmentsQueryKey,
  useGetInvestorDashboard,
  useGetInvestorInvestments,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingCard, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, availableBalanceFromDashboard, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, MotionProgress, MotionReveal } from '@/lib/motion';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';

type PortfolioTab = 'Active' | 'Pending' | 'Completed';

function categorizeInvestmentStatus(status: string): PortfolioTab | null {
  const normalized = status.trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (/(^| )(complete|completed|closed|settled|fully distributed|fully paid)( |$)/.test(normalized)) return 'Completed';
  if (/(^| )(pending|processing|review|awaiting|submitted)( |$)/.test(normalized)) return 'Pending';
  if (/(^| )(active|funded|invested|in progress|ongoing|confirmed|approved|preparing|stuffing|customs|in transit|shipping|shipped|arrival|delivery|delivered|settlement|disbursed)( |$)/.test(normalized)) return 'Active';
  return null;
}

function supplied(value: string, fallback = '—') {
  return value || fallback;
}

function reportedDate(value: string) {
  if (!value || value === '—') return 'Not reported';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function InvestmentMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={{ width: '50%', paddingTop: 13, paddingRight: 10 }}>
    <Text style={{ color, fontSize: 10, lineHeight: 15 }}>{label}</Text>
    <Text style={{ color, fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 3 }}>{value}</Text>
  </View>;
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
      queryKey: ['investor-dashboard'],
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
  const availableBalance = availableBalanceFromDashboard(dashboardQuery.data);
  const dashboardInvestments = list(dashboard.my_investments);
  const assignedRows = rows.map((item, index) => {
    const trade = record(item.trade ?? item.project ?? item.trade_details);
    const container = record(item.container ?? item.container_details ?? trade.container ?? trade.container_details);
    const investmentStatus = first(item, ['investment_status', 'status', 'state']);
    const dashboardInvestment = record(dashboardInvestments.find(
      investment => first(investment, ['id']) === first(item, ['investment_id', 'id']),
    ));
    return {
      item,
      trade,
      container,
      dashboardInvestment,
      investmentStatus,
      category: categorizeInvestmentStatus(investmentStatus),
      key: first(item, ['investment_id', 'id'], `investment-${index}`),
    };
  });
  const visibleRows = assignedRows.filter(row => row.category === selectedTab);
  const uncategorizedRows = assignedRows.filter(row => row.category == null);

  const renderInvestment = (entry: typeof assignedRows[number], index = 0) => {
    const { item, trade, container, dashboardInvestment } = entry;
    const serverId = first(item, ['investment_id', 'id']);
    const tradeId = first(item, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code']));
    const commodity = first(item, ['commodity_name', 'commodity'], first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(item, ['project_name', 'title'])));
    const origin = first(item, ['origin', 'origin_country', 'from_country'], first(trade, ['origin', 'origin_country', 'from_country', 'country_of_origin']));
    const destination = first(item, ['destination', 'destination_country', 'to_country'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market']));
    const investmentCurrency = first(trade, ['currency'], first(item, ['amount_currency', 'currency']));
    const investedAmount = amount(item, ['amount', 'investment_amount', 'principal']);
    const investedPkr = amount(item, ['amount_pkr']);
    const meta = record(trade.meta ?? item.meta);
    const containerNumber = first(container, ['container_number'], first(item, ['container_number', 'container_no'], first(trade, ['container_number', 'container_no'], first(meta, ['container_number', 'container_no', 'containerNumber']))));
    const containerType = first(trade, ['container_type', 'container_size'], first(item, ['container_type', 'container_size']));
    const vessel = first(container, ['vessel_name', 'vessel'], first(trade, ['vessel_name', 'vessel'], first(item, ['vessel_name', 'vessel'])));
    const voyage = first(container, ['voyage_number', 'voyage'], first(trade, ['voyage_number', 'voyage'], first(item, ['voyage_number', 'voyage'], first(meta, ['voyage_number', 'voyage']))));
    const vesselAndVoyage = vessel !== '—' && voyage !== '—' ? `${vessel} · ${voyage}` : vessel !== '—' ? vessel : voyage;
    const loadingPort = first(container, ['port_of_loading'], first(trade, ['port_of_loading'], first(item, ['port_of_loading'])));
    const dischargePort = first(container, ['destination_port', 'port_of_discharge'], first(trade, ['port_of_discharge', 'destination_port'], first(item, ['destination_port', 'port_of_discharge'])));
    const route = loadingPort !== '—' || dischargePort !== '—'
      ? `${loadingPort} → ${dischargePort}`
      : origin || destination ? `${origin || '—'} → ${destination || '—'}` : 'Not reported';
    const tradeStatus = first(item, ['trade_status', 'shipment_status'], first(trade, ['trade_status', 'shipment_status', 'status']));
    const containerStatus = first(item, ['container_status'], first(
      container,
      ['status', 'current_status', 'shipment_status', 'trade_status'],
      first(trade, ['container_status', 'shipment_status'], first(item, ['shipment_status'])),
    ));
    const periodProgress = record(item.investment_period_progress);
    const daysElapsed = amount(periodProgress, ['days_elapsed']) ?? amount(dashboardInvestment, ['days_elapsed']);
    const totalDays = amount(periodProgress, ['total_days']) ?? amount(dashboardInvestment, ['total_days']);
    const daysRemaining = amount(periodProgress, ['days_remaining'])
      ?? amount(dashboardInvestment, ['days_remaining'])
      ?? (daysElapsed != null && totalDays != null ? Math.max(0, totalDays - daysElapsed) : null);
    const progress = amount(periodProgress, ['progress_percent'])
      ?? amount(item, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage'])
      ?? amount(trade, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage']);
    const boundedProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
    const amountLabel = [
      investedAmount != null ? money(investedAmount, investmentCurrency || 'USD') : null,
      investedPkr != null ? money(investedPkr, 'PKR') : null,
    ].filter(Boolean).join(' · ') || money(null, investmentCurrency || 'USD');
    const expectedProfit = amount(item, ['expected_profit']) ?? amount(dashboardInvestment, ['expected_profit']);
    const roi = amount(dashboardInvestment, ['roi'])
      ?? amount(item, ['roi', 'expected_return_pct'])
      ?? amount(trade, ['expected_return_pct']);
    const roiLabel = first(trade, ['roi_label'], first(item, ['roi_label']));
    const roiText = roi != null ? `${roi.toFixed(2)}%` : supplied(roiLabel, 'Not reported');
    const payoutDate = first(item, ['next_payout_date', 'payout_date', 'next_distribution_date'], first(trade, ['next_payout_date', 'payout_date', 'next_distribution_date']));
    const distribution = record(item.profit_distribution ?? item.distribution);
    const totalReturn = amount(item, ['total_return', 'total_return_amount'])
      ?? amount(distribution, ['total_return']);
    const payoutCurrency = first(trade, ['currency'], investmentCurrency || 'USD');
    const investmentDate = first(item, ['invested_at', 'invest_date', 'investment_date', 'created_at'], first(dashboardInvestment, ['invest_date']));
    const etd = first(container, ['etd'], first(trade, ['etd', 'departure_date'], first(item, ['etd', 'departure_date'])));
    const eta = first(container, ['eta'], first(trade, ['eta', 'arrival_date'], first(item, ['eta', 'arrival_date'])));
    const currentStage = first(item, ['current_stage'], first(trade, ['current_project_stage']));
    const progressLabel = periodProgress.total_days != null
      ? `Investment period${daysElapsed != null && totalDays != null ? ` · ${daysElapsed} of ${totalDays} days` : ''}`
      : 'Trade progress, as reported';

    return <MotionReveal key={entry.key} delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}>
    <Card style={{ padding: 0, borderRadius: 20, overflow: 'hidden', borderColor: colors.border }}>
      <View style={{ paddingHorizontal: 17, paddingTop: 16, paddingBottom: 15, backgroundColor: colors.lightGreen }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
            <Feather name="package" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.9 }}>CONTAINER INVESTMENT</Text>
          </View>
          <Status value={supplied(entry.investmentStatus)} />
        </View>
        <Text style={{ color: colors.foreground, fontSize: 19, lineHeight: 24, fontWeight: '700', marginTop: 11 }}>
          {supplied(commodity, 'Investment position')}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
          {tradeId !== '—' ? `Trade ${tradeId.replace(/^Trade\s*#\s*/i, '')}` : 'Trade reference not reported'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 17, paddingTop: 14, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0, padding: 11, borderRadius: 12, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Container ID · size</Text>
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4 }}>
              {containerNumber !== '—' && containerType !== '—' ? `${containerNumber} · ${containerType}` : containerNumber !== '—' ? containerNumber : containerType !== '—' ? containerType : 'Not reported'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, padding: 11, borderRadius: 12, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Vessel · voyage</Text>
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4 }}>
              {supplied(vesselAndVoyage, 'Not reported')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 }}>
          <Feather name="map-pin" size={14} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Shipment route</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 3 }}>{route}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Invested</Text>
            <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{reportedDate(investmentDate)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>ETD</Text>
            <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{reportedDate(etd)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>ETA</Text>
            <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{reportedDate(eta)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, flex: 1 }}>{progressLabel}</Text>
            {boundedProgress != null ? <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{boundedProgress.toFixed(1)}%</Text> : null}
          </View>
          {boundedProgress != null
            ? <MotionProgress value={boundedProgress} height={6} color={colors.primary} trackColor={colors.secondary} accessibilityLabel="Reported investment progress" />
            : <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Progress has not been reported.</Text>}
          {currentStage !== '—' ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 7 }}>Current milestone: {currentStage}</Text> : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, paddingTop: 2, borderTopWidth: 1, borderTopColor: colors.border }}>
          <InvestmentMetric label="Amount invested" value={amountLabel} color={colors.foreground} />
          <InvestmentMetric label="Expected profit" value={money(expectedProfit, 'USD')} color={colors.primary} />
          <InvestmentMetric label="ROI" value={roiText} color={colors.foreground} />
          <InvestmentMetric label="Days remaining" value={daysRemaining != null ? `${daysRemaining} days` : 'Not reported'} color={colors.foreground} />
          <InvestmentMetric label="Next payout date" value={reportedDate(payoutDate)} color={colors.foreground} />
          <InvestmentMetric label="Total return recorded" value={money(totalReturn, payoutCurrency)} color={colors.foreground} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 0.35 }}>TRADE STATUS</Text>
            <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', marginTop: 4 }}>{supplied(tradeStatus, 'Not reported')}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 0.35 }}>CONTAINER STATUS</Text>
            <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 4 }}>{supplied(containerStatus, 'Not reported')}</Text>
          </View>
        </View>
      </View>

      <Pressable
        testID={`portfolio-view-details-${entry.key}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !serverId }}
        disabled={!serverId}
        onPress={() => router.push({ pathname: '/position/[id]', params: { id: serverId } })}
        style={({ pressed }) => ({
          minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
          flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.78 : 1,
        })}
      >
        <Text style={{ color: serverId ? colors.primary : colors.mutedForeground, fontSize: 13, fontWeight: '700' }}>View shipment & investment details</Text>
        <Feather name="arrow-right" size={15} color={serverId ? colors.primary : colors.mutedForeground} />
      </Pressable>
    </Card>
    </MotionReveal>;
  };

  const summaryValue = (value: number | null) => {
    if (dashboardQuery.isLoading) return 'Loading';
    if (dashboardQuery.isError) return 'Unavailable';
    return money(value, currency || 'USD');
  };

  return <Screen title="My Portfolio" subtitle="Capital placed in real trade and shipment activity" refreshable>
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
    </Card>
    {dashboardQuery.isError ? <ErrorState message="Portfolio summary could not be loaded from the investor server." error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}

    {positionsQuery.isError ? <ErrorState message="Portfolio positions could not be loaded." error={positionsQuery.error} onRetry={() => void positionsQuery.refetch()} /> : null}
    {positionsQuery.isLoading ? <LoadingCard label="Loading investment records…" /> : null}
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
