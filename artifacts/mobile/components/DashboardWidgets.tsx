import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, EmptyState, ErrorState, LoadingCard, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

export type DashboardMetricItem = {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  detail?: string;
};

export function DashboardMetric({ item }: { item: DashboardMetricItem }) {
  const colors = useColors();
  return <Card style={{ flex: 1, minWidth: 145, minHeight: 105, padding: 13, marginBottom: 0, borderRadius: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 }}>
      <Text numberOfLines={2} style={{ flex: 1, color: colors.mutedForeground, fontSize: 10, lineHeight: 14, fontWeight: '600' }}>{item.label}</Text>
      <View style={{ width: 29, height: 29, borderRadius: 11, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={item.icon} size={14} color={colors.primary} />
      </View>
    </View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 10 }}>{item.value}</Text>
    {item.detail ? <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 3 }}>{item.detail}</Text> : null}
  </Card>;
}

function SectionHeading({ title, route }: { title: string; route: '/wallet/deposit' | '/wallet/withdraw' | '/account/notifications' }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 22, marginBottom: 11 }}>
    <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', letterSpacing: -0.35 }}>{title}</Text>
    <Pressable accessibilityRole="button" onPress={() => router.push(route)} hitSlop={8}>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View all</Text>
    </Pressable>
  </View>;
}

export function FinancialHistoryPreview({
  title,
  route,
  icon,
  records,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyBody,
  currency,
  hideValues,
}: {
  title: string;
  route: '/wallet/deposit' | '/wallet/withdraw';
  icon: keyof typeof Feather.glyphMap;
  records: unknown[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyBody: string;
  currency: string;
  hideValues: boolean;
}) {
  const colors = useColors();
  return <>
    <SectionHeading title={title} route={route} />
    {loading ? <LoadingCard label={`Loading ${title.toLowerCase()}…`} /> : null}
    {error ? <ErrorState message={`${title} could not be loaded.`} onRetry={onRetry} /> : null}
    {!loading && !error && records.length === 0 ? <EmptyState title={emptyTitle} body={emptyBody} icon={icon} /> : null}
    {records.length > 0 ? <Card style={{ paddingHorizontal: 13, paddingVertical: 3 }}>
      {records.map((raw, index) => {
        const item = record(raw);
        const reference = first(item, ['reference', 'reference_number', 'reference_no', 'transaction_id', 'id'], title === 'Recent Deposits' ? 'Deposit record' : 'Withdrawal request');
        const date = first(item, ['date_label', 'created_at', 'date', 'submitted_at']);
        const rowAmount = amount(item, ['amount', 'requested_amount', 'paid_amount', 'original_amount']);
        const rowCurrency = first(item, ['currency', 'wallet_currency', 'original_currency', 'amount_currency'], currency);
        const itemKey = first(item, ['id', 'reference', 'reference_number', 'reference_no', 'transaction_id'], `${title}-${index}`);
        const dateLabel = date ? transactionDate(date) : 'Date not provided';
        const amountLabel = hideValues
          ? '••••••'
          : rowAmount == null
            ? 'Not reported'
            : rowCurrency
              ? money(rowAmount, rowCurrency)
              : 'Currency not provided';
        return <View key={itemKey} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: index === records.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
          <View style={{ width: 37, height: 37, borderRadius: 14, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={icon} size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{reference}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{dateLabel}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5, maxWidth: 132 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>{amountLabel}</Text>
            <Status value={first(item, ['status', 'state'], 'Status not provided')} />
          </View>
        </View>;
      })}
    </Card> : null}
  </>;
}

export function RecentAlertsPreview({ records, loading, error, onRetry }: {
  records: unknown[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  return <>
    <SectionHeading title="Recent Alerts" route="/account/notifications" />
    {loading ? <LoadingCard label="Loading alerts…" /> : null}
    {error ? <ErrorState message="Recent alerts could not be loaded." onRetry={onRetry} /> : null}
    {!loading && !error && records.length === 0 ? <EmptyState title="No recent alerts" body="Investor notifications from OG Exports will appear here." icon="bell" /> : null}
    {records.length > 0 ? <Card style={{ paddingHorizontal: 14, paddingVertical: 3 }}>
      {records.map((raw, index) => {
        const item = record(raw);
        const title = first(item, ['title', 'subject', 'heading', 'event_title'], 'Investor update');
        const body = first(item, ['message', 'body', 'description', 'content'], 'Open to review this update.');
        const date = first(item, ['created_at', 'createdAt', 'date', 'published_at']);
        const isRead = item.is_read === true || item.read === true || !!item.read_at;
        const isUnread = item.is_read === false || item.read === false;
        const status = isRead ? 'Read' : isUnread ? 'Unread' : '';
        const itemKey = first(item, ['id', 'notification_id'], `${title}-${index}`);
        return <Pressable key={itemKey} accessibilityRole="button" accessibilityLabel={`Open alert: ${title}`} onPress={() => router.push('/account/notifications')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 13, borderBottomWidth: index === records.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border, opacity: pressed ? 0.78 : 1 })}>
          <View style={{ width: 36, height: 36, borderRadius: 13, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="bell" size={15} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{title}</Text>
            <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 4 }}>{body}</Text>
            {date ? <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 5 }}>{transactionDate(date)}</Text> : null}
          </View>
          {status ? <Status value={status} /> : null}
        </Pressable>;
      })}
    </Card> : null}
  </>;
}

export function PortfolioBenchmarkCard({ points, available, loading, hideValues }: {
  points: unknown;
  available: boolean;
  loading: boolean;
  hideValues: boolean;
}) {
  const colors = useColors();
  const chartPoints = list(points).flatMap(point => {
    const item = record(point);
    const portfolio = amount(item, ['portfolio_roi']);
    const market = amount(item, ['market_roi']);
    return portfolio == null || market == null ? [] : [{
      portfolio,
      market,
      label: first(item, ['month', 'month_key', 'date_label'], 'Date not provided'),
    }];
  });

  const values = chartPoints.flatMap(point => [point.portfolio, point.market]);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const spread = Math.max(maximum - minimum, 1);
  const chartWidth = 320;
  const chartHeight = 124;
  const xFor = (index: number) => chartPoints.length < 2
    ? chartWidth / 2
    : 10 + index / (chartPoints.length - 1) * (chartWidth - 20);
  const yFor = (value: number) => 105 - (value - minimum) / spread * 88;
  const makePath = (key: 'portfolio' | 'market') => chartPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yFor(point[key]).toFixed(2)}`
  ).join(' ');
  const zeroY = yFor(0);
  const lastPoint = chartPoints[chartPoints.length - 1];

  return <Card style={{ marginTop: 8 }}>
    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Portfolio vs Market Benchmark</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>12-month ROI comparison reported by OG Exports</Text>
    <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>My Portfolio</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: colors.accent }} />
        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Market Avg</Text>
      </View>
    </View>
    {loading ? <Text style={{ color: colors.mutedForeground, paddingVertical: 24 }}>Loading benchmark data…</Text>
      : !available || chartPoints.length === 0 ? <Text style={{ color: colors.mutedForeground, lineHeight: 20, paddingVertical: 20 }}>A verified benchmark comparison has not been provided by OG Exports.</Text>
        : <>
          <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} accessibilityLabel="Portfolio and market benchmark return comparison">
            <Path d={`M 8 ${zeroY.toFixed(2)} L ${chartWidth - 8} ${zeroY.toFixed(2)}`} stroke={colors.border} strokeWidth={1} strokeDasharray="4 5" />
            <Path d={makePath('portfolio')} fill="none" stroke={colors.primary} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
            <Path d={makePath('market')} fill="none" stroke={colors.accent} strokeWidth={2.2} strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
            {lastPoint ? <>
              <Circle cx={xFor(chartPoints.length - 1)} cy={yFor(lastPoint.portfolio)} r={4} fill={colors.primary} stroke={colors.card} strokeWidth={2} />
              <Circle cx={xFor(chartPoints.length - 1)} cy={yFor(lastPoint.market)} r={4} fill={colors.accent} stroke={colors.card} strokeWidth={2} />
            </> : null}
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{chartPoints[0]?.label}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{lastPoint?.label}</Text>
          </View>
          {lastPoint ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Portfolio {hideValues ? '••••' : `${lastPoint.portfolio.toFixed(2)}%`}</Text>
            <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>Market {hideValues ? '••••' : `${lastPoint.market.toFixed(2)}%`}</Text>
          </View> : null}
        </>}
  </Card>;
}

export function ProfitAnalyticsCard({ points, currency, loading, hideValues }: {
  points: unknown;
  currency: string;
  loading: boolean;
  hideValues: boolean;
}) {
  const colors = useColors();
  const rows = list(points).flatMap(point => {
    const item = record(point);
    const value = amount(item, ['monthly', 'amount', 'profit']);
    return value == null ? [] : [{
      month: first(item, ['month', 'month_label', 'date_label', 'month_key'], 'Month not provided'),
      value,
    }];
  }).slice(-6);
  const maximum = Math.max(1, ...rows.map(item => Math.abs(item.value)));

  return <Card>
    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Profit Analytics</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>Monthly earnings reported by OG Exports</Text>
    {loading ? <Text style={{ color: colors.mutedForeground, paddingVertical: 20 }}>Loading profit history…</Text>
      : rows.length === 0 ? <Text style={{ color: colors.mutedForeground, lineHeight: 20, paddingVertical: 20 }}>Monthly profit history has not been provided by OG Exports.</Text>
        : <View style={{ gap: 13, marginTop: 16 }}>
          {rows.map((item, index) => <View key={`${item.month}-${index}`} style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontSize: 10 }}>{item.month}</Text>
              <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '700' }}>
                {hideValues ? '••••••' : currency ? money(item.value, currency) : 'Currency not provided'}
              </Text>
            </View>
            <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}>
              <View style={{
                width: `${Math.max(2, Math.abs(item.value) / maximum * 100)}%`,
                height: '100%',
                borderRadius: 4,
                backgroundColor: item.value < 0 ? colors.destructive : colors.primary,
              }} />
            </View>
          </View>)}
        </View>}
  </Card>;
}

function transactionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Date unavailable';
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date)} · ${time}`;
}
