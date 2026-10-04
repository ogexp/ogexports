import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGetInvestorDashboard, useGetInvestorInvestments } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';

export default function Portfolio() {
  const { token } = useAuth();
  const colors = useColors();
  const positionsQuery = useGetInvestorInvestments({ per_page: 50 }, { query: { queryKey: ['investor-positions', 50], enabled: !!token, staleTime: 30_000 } });
  const dashboardQuery = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: !!token, staleTime: 30_000 } });
  const rows = list(positionsQuery.data);
  const dashboard = unwrap(dashboardQuery.data);
  const summary = record(dashboard.summary);
  const wallet = record(dashboard.wallet);
  const currency = first(wallet, ['currency']);
  const totalInvested = amount(summary, ['total_investment']);
  const profit = amount(summary, ['total_profit_earned']);
  const roi = amount(summary, ['lifetime_roi']);
  const series = record(dashboard.portfolio_series);
  const historyPoints = list(series.points);
  const latestValue = historyPoints.length ? amount(historyPoints[historyPoints.length - 1], ['value']) : null;
  const availableBalance = amount(wallet, ['available_balance', 'balance', 'available']);
  const pendingInvestments = rows.filter(item => /pending|processing|review/i.test(first(item, ['status', 'state']))).length;
  return <Screen title="Portfolio" subtitle="Your investment positions in one place">
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>TOTAL INVESTED</Text>
      <Text style={{ color: colors.primaryForeground, fontSize: 29, fontWeight: '700', marginTop: 7 }}>{dashboardQuery.isLoading ? '…' : totalInvested != null && currency ? money(totalInvested, currency) : '—'}</Text>
      <View style={{ height: 1, backgroundColor: colors.primaryForeground, opacity: 0.2, marginVertical: 15 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ minWidth: 120, flex: 1 }}><Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 11 }}>Latest recorded value</Text><Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{latestValue != null && currency ? money(latestValue, currency) : '—'}</Text></View>
        <View style={{ minWidth: 120, flex: 1 }}><Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 11 }}>Available balance</Text><Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{availableBalance != null && currency ? money(availableBalance, currency) : '—'}</Text></View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 13 }}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 11 }}>Profit earned</Text><Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{profit != null && currency ? money(profit, currency) : '—'}</Text></View>
        <View style={{ alignItems: 'flex-end', flex: 1 }}><Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 11 }}>Lifetime ROI</Text><Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{roi == null ? '—' : `${roi.toFixed(2)}%`}</Text></View>
      </View>
    </Card>
    {dashboardQuery.isError ? <ErrorState message="Portfolio summary could not be loaded from the investor server." onRetry={() => void dashboardQuery.refetch()} /> : null}
    <PortfolioHistoryCard points={series.points} currency={currency} loading={dashboardQuery.isLoading} defaultRange="3M" />
    <Pressable onPress={() => router.push('/account/transactions')}><Text style={{ color: colors.primary, fontWeight: '700', paddingVertical: 4 }}>View transaction history →</Text></Pressable>
    {positionsQuery.isError ? <ErrorState message="Portfolio positions could not be loaded." onRetry={() => void positionsQuery.refetch()} /> : null}
    {!positionsQuery.isLoading && !positionsQuery.isError && rows.length === 0 ? <EmptyState title="Your portfolio is waiting" body="When you invest in an opportunity, its progress will appear here." /> : null}
    {rows.map((item, index) => {
      const id = first(item, ['id', 'investment_id'], '');
      return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/position/[id]', params: { id } })}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{first(item, ['project_name', 'title', 'name'], 'Investment')}</Text><Status value={first(item, ['status', 'state'], '—')} /></View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 7 }}>{first(item, ['type', 'category'], 'OG Exports')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Invested</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(amount(item, ['amount', 'investment_amount', 'principal']), first(item, ['currency'], currency))}</Text></View>
        </Card>
      </Pressable>;
    })}
  </Screen>;
}