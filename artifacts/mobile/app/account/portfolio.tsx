import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useGetInvestorDashboard, useGetInvestorInvestments } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type Range = '1M' | '3M' | '1Y' | 'All';
const ranges: Range[] = ['1M', '3M', '1Y', 'All'];
const chartWidth = 320;
const chartHeight = 170;
const chartLeft = 12;
const chartRight = chartWidth - 12;
const chartTop = 10;
const chartBottom = chartHeight - 12;

export default function Portfolio() {
  const { token } = useAuth();
  const colors = useColors();
  const [range, setRange] = useState<Range>('3M');
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
  const chartPoints = useMemo(() => {
    const all = list(series.points).flatMap(point => {
      const date = first(point, ['date']);
      const value = amount(point, ['value']);
      return date && value != null ? [{ point, date, value }] : [];
    });
    if (range === 'All' || all.length < 2) return all;
    const months = range === '1M' ? 1 : range === '3M' ? 3 : 12;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const firstInRange = all.findIndex(item => new Date(item.date).getTime() >= cutoff.getTime());
    return all.slice(Math.max(0, firstInRange - 1));
  }, [dashboard.data, range]);
  const maximum = chartPoints.reduce((max, item) => Math.max(max, item.value), 0);
  const coordinates = chartPoints.map((item, index) => ({
    x: chartPoints.length < 2
      ? (chartLeft + chartRight) / 2
      : chartLeft + index / (chartPoints.length - 1) * (chartRight - chartLeft),
    y: chartBottom - item.value / (maximum || 1) * (chartBottom - chartTop),
  }));
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${chartBottom} L ${coordinates[0].x.toFixed(2)} ${chartBottom} Z`
    : '';
  const startLabel = chartPoints.length ? first(chartPoints[0].point, ['date_label'], chartPoints[0].date) : '';
  const endLabel = chartPoints.length ? first(chartPoints[chartPoints.length - 1].point, ['date_label'], chartPoints[chartPoints.length - 1].date) : '';
  return <Screen title="Portfolio" subtitle="Your investment positions in one place">
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>TOTAL INVESTED</Text>
      <Text style={{ color: colors.primaryForeground, fontSize: 29, fontWeight: '700', marginTop: 7 }}>{dashboardQuery.isLoading ? '…' : totalInvested != null && currency ? money(totalInvested, currency) : '—'}</Text>
      <View style={{ height: 1, backgroundColor: colors.primaryForeground, opacity: 0.2, marginVertical: 15 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 11 }}>Profit earned</Text><Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{profit != null && currency ? money(profit, currency) : '—'}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 11 }}>Lifetime ROI</Text><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{roi == null ? '—' : `${roi.toFixed(2)}%`}</Text></View>
      </View>
    </Card>
    {dashboardQuery.isError ? <ErrorState message="Portfolio summary could not be loaded from the investor server." onRetry={() => void dashboardQuery.refetch()} /> : null}
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Portfolio value</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>OG Exports history</Text></View>
        {chartPoints.length ? <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{currency ? money(chartPoints[chartPoints.length - 1].value, currency) : '—'}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 15, marginBottom: 7 }}>
        {ranges.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: range === item }} onPress={() => setRange(item)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: range === item ? colors.primary : colors.secondary }}>
          <Text style={{ color: range === item ? colors.primaryForeground : colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>{item}</Text>
        </Pressable>)}
      </View>
      {dashboardQuery.isLoading ? <Text style={{ color: colors.mutedForeground, paddingVertical: 22 }}>Loading portfolio history…</Text> : chartPoints.length ? <>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} accessibilityLabel={`Portfolio value history for ${range}`}>
          <Path d={areaPath} fill={colors.primary} fillOpacity={0.12} />
          <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {coordinates.length ? <Circle cx={coordinates[coordinates.length - 1].x} cy={coordinates[coordinates.length - 1].y} r={4} fill={colors.accent} stroke={colors.card} strokeWidth={2} /> : null}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{startLabel}</Text><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{endLabel}</Text></View>
      </> : <Text style={{ color: colors.mutedForeground, lineHeight: 20, paddingVertical: 18 }}>Historical portfolio values are not available from OG Exports for this period.</Text>}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>History uses investment and profit-distribution records returned by OG Exports. It is not a forecast.</Text>
    </Card>
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