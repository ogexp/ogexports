import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetInvestorDashboard,
  useGetInvestorProjects,
  useGetInvestorWalletTransactions,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';

function DemoTag() {
  const colors = useColors();
  return <View style={{ backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
    <Text style={{ color: colors.accentForeground, fontSize: 8, letterSpacing: 0.55, fontWeight: '800' }}>DEMO</Text>
  </View>;
}

function Metric({ label, value, icon, detail, demo = false }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; detail?: string; demo?: boolean }) {
  const colors = useColors();
  return <View style={{ flex: 1, minWidth: 138, padding: 15, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 1 }}>{label}</Text>
      <Feather name={icon} size={15} color={colors.accent} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 }}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', flexShrink: 1 }}>{value}</Text>
      {demo ? <DemoTag /> : null}
    </View>
    {detail ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{detail}</Text> : null}
  </View>;
}

function transactionGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'RECENT';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const transactionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((today.getTime() - transactionDay.getTime()) / 86_400_000);

  if (daysAgo < 0) return 'THIS WEEK';
  if (daysAgo === 0) return 'TODAY';
  if (daysAgo === 1) return 'YESTERDAY';
  return daysAgo < 7 ? 'THIS WEEK' : 'OLDER';
}

function transactionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Date unavailable';
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date)} · ${time}`;
}

export default function InvestorHome() {
  const { token, user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const dashboard = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: !!token, staleTime: 30_000 } });
  const projects = useGetInvestorProjects({ per_page: 3 }, { query: { queryKey: ['investor-projects', 3], enabled: !!token, staleTime: 60_000 } });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: 4 }, { query: { queryKey: ['investor-wallet-transactions', 1, 4], enabled: !!token, staleTime: 30_000 } });
  const data = unwrap(dashboard.data);
  const summary = record(data.summary);
  const wallet = record(data.wallet);
  const series = record(data.portfolio_series);
  const currency = first(wallet, ['currency', 'default_currency']);
  const liveBalance = amount(wallet, ['available_balance', 'balance', 'available']) ?? amount(summary, ['available_balance']);
  const livePortfolioTotal = amount(summary, ['total_portfolio_value', 'portfolio_value', 'total_value']);
  const liveInvestedCapital = amount(summary, ['total_investment', 'total_investment_usd', 'invested_capital']);
  const liveReturns = amount(summary, ['total_profit_earned', 'total_profit_earned_usd', 'total_returns', 'profit']);
  const liveActiveCount = amount(summary, ['active_investments_count', 'active_investment_count', 'investments_count']);
  const demoFallbacksAvailable = !!token && dashboard.isFetched && !dashboard.isLoading;
  const demoBalance = demoFallbacksAvailable && liveBalance == null;
  const demoPortfolioTotal = demoFallbacksAvailable && livePortfolioTotal == null;
  const demoInvestedCapital = demoFallbacksAvailable && liveInvestedCapital == null;
  const demoReturns = demoFallbacksAvailable && liveReturns == null;
  const demoActiveCount = demoFallbacksAvailable && liveActiveCount == null;
  const balance = liveBalance ?? (demoBalance ? 2_000 : null);
  const portfolioTotal = livePortfolioTotal ?? (demoPortfolioTotal ? 10_500 : null);
  const investedCapital = liveInvestedCapital ?? (demoInvestedCapital ? 10_000 : null);
  const returns = liveReturns ?? (demoReturns ? 500 : null);
  const activeCount = liveActiveCount ?? (demoActiveCount ? 2 : null);
  const hasDemoValues = demoBalance || demoPortfolioTotal || demoInvestedCapital || demoReturns || demoActiveCount;
  const name = first(record(user), ['name', 'first_name'], 'Investor');
  const firstName = name.split(/\s+/)[0] || 'Investor';
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'OG';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const opportunities = list(projects.data);
  const recent = list(transactions.data).slice(0, 4);
  const payouts = list(data.upcoming_payouts);
  const displayMoney = (value: number | null, unit = currency) => balanceHidden ? '••••••' : unit ? money(value, unit) : '—';
  const groupedTransactions = recent.reduce<{ label: string; items: Record<string, unknown>[] }[]>((groups, item) => {
    const label = transactionGroup(first(item, ['created_at', 'date'], ''));
    const existing = groups.find(group => group.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
    return groups;
  }, []);
  const quickActions = [
    { title: 'Deposit Funds', shortTitle: 'Add money', icon: 'plus' as const, onPress: () => router.push('/wallet/deposit') },
    { title: 'Invest Now', shortTitle: 'Invest', icon: 'trending-up' as const, onPress: () => router.push('/(tabs)/opportunities') },
    { title: 'Withdraw Funds', shortTitle: 'Withdraw', icon: 'arrow-up-right' as const, onPress: () => router.push('/wallet/withdraw') },
    { title: 'View Portfolio', shortTitle: 'Portfolio', icon: 'pie-chart' as const, onPress: () => router.push('/(tabs)/portfolio') },
  ];
  const activityIcon = (item: Record<string, unknown>) => {
    const kind = `${first(item, ['type', 'transaction_type'])} ${first(item, ['description', 'title'])}`.toLowerCase();
    return /withdraw|payout/.test(kind) ? 'arrow-up-right' : /invest|purchase/.test(kind) ? 'trending-up' : 'arrow-down-left';
  };
  const dockShadow = Platform.OS === 'web'
    ? { boxShadow: `0 10px 24px ${colors.shadow}` }
    : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 };

  return <ScrollView
    style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 112,
      paddingHorizontal: 20,
    }}
    showsVerticalScrollIndicator={false}
  >
    <LinearGradient colors={[colors.walletStart, colors.walletEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ borderRadius: 30, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 44, overflow: 'hidden', minHeight: 276 }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -68, top: -66, width: 230, height: 230, borderRadius: 120, borderWidth: 1, borderColor: colors.primaryForeground, opacity: 0.12 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: -86, bottom: -155, width: 240, height: 240, borderRadius: 130, borderWidth: 1, borderColor: colors.primaryForeground, opacity: 0.07 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/account')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.82 : 1 })}>
          <View style={{ width: 42, height: 42, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>{initials}</Text>
          </View>
          <View>
            <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '700' }}>Hi, {firstName}</Text>
            <Text style={{ color: colors.primaryForeground, fontSize: 11, opacity: 0.74, marginTop: 2 }}>{greeting}</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" hitSlop={8} onPress={() => router.push('/account/notifications')}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
            <Feather name="bell" size={17} color={colors.primaryForeground} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8} onPress={() => router.push('/account/settings')}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
            <Feather name="settings" size={17} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Open investor wallet" onPress={() => router.push('/(tabs)/wallet')}
        style={({ pressed }) => ({ alignSelf: 'center', marginTop: 20, minHeight: 34, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.12)', opacity: pressed ? 0.8 : 1 })}>
        <Feather name="credit-card" size={14} color={colors.primaryForeground} />
        <Text numberOfLines={1} style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '700' }}>{demoBalance ? 'DEMO · USD' : currency ? `${currency} Account` : 'Investor Wallet'}</Text>
        <Feather name="chevron-down" size={14} color={colors.primaryForeground} />
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 12, opacity: 0.78 }}>Available balance</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={balanceHidden ? 'Show account balances' : 'Hide account balances'}
            onPress={() => setBalanceHidden(current => !current)} hitSlop={8}>
            <Feather name={balanceHidden ? 'eye-off' : 'eye'} size={15} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 4 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.primaryForeground, fontSize: 38, fontWeight: '700', letterSpacing: -1.1, flexShrink: 1 }}>
            {dashboard.isLoading ? '…' : displayMoney(balance, demoBalance ? 'USD' : currency)}
          </Text>
          {demoBalance ? <DemoTag /> : null}
        </View>
        <Text style={{ color: colors.primaryForeground, fontSize: 11, opacity: 0.72, marginTop: 4 }}>
          {demoBalance ? 'Illustrative example only' : currency ? `${currency} wallet` : 'Investor account'}
        </Text>
      </View>
    </LinearGradient>

    <View style={[{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', borderRadius: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 8, paddingHorizontal: 7, marginHorizontal: 6, marginTop: -27, marginBottom: 13, zIndex: 2 }, dockShadow]}>
      {quickActions.map((action, index) => (
        <Pressable key={action.title} accessibilityRole="button" accessibilityLabel={action.title} onPress={action.onPress}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 66, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: pressed ? colors.secondary : 'transparent' })}>
          <View style={{ width: 34, height: 34, borderRadius: 18, backgroundColor: index === 0 ? colors.primary : colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={action.icon} size={16} color={index === 0 ? colors.primaryForeground : colors.primary} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: '100%', color: colors.foreground, fontSize: 9, fontWeight: '700' }}>{action.shortTitle}</Text>
        </Pressable>
      ))}
    </View>

    {hasDemoValues ? <View accessibilityRole="summary" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, marginBottom: 12, borderRadius: 14, backgroundColor: colors.statusPendingBackground, borderWidth: 1, borderColor: colors.border }}>
      <Feather name="info" size={16} color={colors.statusPending} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: colors.statusPending, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>DEMO figures are illustrative examples only — they are not real account data.</Text>
    </View> : null}

    {dashboard.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4, paddingVertical: 5 }}>
      <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>Live wallet details are unavailable.</Text>
      <Pressable accessibilityRole="button" onPress={() => void dashboard.refetch()}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Try again</Text></Pressable>
    </View> : null}

    <Section title="Recent transactions" right={<Pressable accessibilityRole="button" onPress={() => router.push('/account/transactions')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {transactions.isError ? <ErrorState message="Recent wallet activity could not be loaded." onRetry={() => void transactions.refetch()} /> : null}
    {transactions.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading recent activity…</Text></Card> : null}
    {!transactions.isLoading && !transactions.isError && recent.length === 0 ? <EmptyState title="No transactions yet" body="Your wallet activity will appear here when returned by OG Exports." /> : null}
    {groupedTransactions.map(group => <View key={group.label}>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 8, marginBottom: 2 }}>{group.label}</Text>
      {group.items.map((item, index) => {
        const rowCurrency = first(item, ['currency'], currency);
        const kind = first(item, ['description', 'title', 'type', 'transaction_type'], 'Wallet activity');
        const date = first(item, ['created_at', 'date'], 'Date unavailable');
        const rowAmount = amount(item, ['amount', 'total']);
        return <Pressable key={first(item, ['id', 'reference'], `${group.label}-${index}`)} accessibilityRole="button" accessibilityLabel={`View ${kind}`} onPress={() => router.push('/account/transactions')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, opacity: pressed ? 0.78 : 1 })}>
          <View style={{ width: 40, height: 40, borderRadius: 22, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={activityIcon(item)} size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{kind}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{transactionDate(date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{rowCurrency ? displayMoney(rowAmount, rowCurrency) : '—'}</Text>
            <Status value={first(item, ['status'], '—')} />
          </View>
        </Pressable>;
      })}
    </View>)}

    <Section title="Portfolio performance" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Portfolio</Text></Pressable>} />
    <PortfolioHistoryCard points={series.points} currency={currency} loading={dashboard.isLoading} compact />

    <Section title="Investment opportunities" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {projects.isError ? <ErrorState message="Investment opportunities could not be loaded." onRetry={() => void projects.refetch()} /> : null}
    {projects.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading available opportunities…</Text></Card> : null}
    {!projects.isLoading && !projects.isError && opportunities.length === 0 ? <EmptyState title="No available opportunities" body="Investment opportunities will appear here when provided by OG Exports." /> : null}
    {opportunities.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
      {opportunities.map((item, index) => {
        const id = first(item, ['id', 'project_id'], '');
        return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
          <Card style={{ width: 248, minHeight: 112, marginBottom: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}><Feather name="briefcase" size={16} color={colors.accent} /><Status value={first(item, ['status', 'state'], 'Not provided')} /></View>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 11 }}>{first(item, ['title', 'name', 'project_name'], 'Investment opportunity')}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 5 }}>{first(item, ['type', 'category', 'location'], 'OG Exports')}</Text>
          </Card>
        </Pressable>;
      })}
    </ScrollView> : null}

    <Section title="Upcoming payouts" />
    {payouts.length ? payouts.map((item, index) => {
      const payoutCurrency = first(item, ['currency'], currency);
      return <Card key={first(item, ['id', 'reference'], String(index))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.statusPendingBackground, alignItems: 'center', justifyContent: 'center' }}><Feather name="calendar" size={16} color={colors.statusPending} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{first(item, ['project_name', 'title', 'description'], 'Investment payout')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(item, ['payout_date', 'date', 'due_date'], 'Date not provided')}</Text></View>
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{payoutCurrency ? displayMoney(amount(item, ['amount', 'payout_amount']), payoutCurrency) : '—'}</Text>
      </Card>;
    }) : <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderStyle: 'dashed' }}>
      <Feather name="calendar" size={18} color={colors.accent} />
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Payout schedule</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Upcoming payout details are not available from the server.</Text></View>
    </Card>}

    <Section title="Portfolio overview" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View all</Text></Pressable>} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 3 }}>
      <Metric label="Total Portfolio" value={dashboard.isLoading ? 'Loading…' : displayMoney(portfolioTotal, demoPortfolioTotal ? 'USD' : currency)} icon="pie-chart" detail={demoPortfolioTotal ? 'Illustrative example only' : 'Reported by OG Exports'} demo={demoPortfolioTotal} />
      <Metric label="Invested Capital" value={dashboard.isLoading ? 'Loading…' : displayMoney(investedCapital, demoInvestedCapital ? 'USD' : currency)} icon="briefcase" detail={demoInvestedCapital ? 'Illustrative example only' : 'Current investments'} demo={demoInvestedCapital} />
      <Metric label="Total Returns" value={dashboard.isLoading ? 'Loading…' : displayMoney(returns, demoReturns ? 'USD' : currency)} icon="bar-chart-2" detail={demoReturns ? 'Illustrative example only' : 'Reported by OG Exports'} demo={demoReturns} />
      <Metric label="Active Investments" value={dashboard.isLoading ? 'Loading…' : activeCount == null ? '—' : String(activeCount)} icon="activity" detail={demoActiveCount ? 'Illustrative example only' : 'Current positions'} demo={demoActiveCount} />
    </View>
  </ScrollView>;
}