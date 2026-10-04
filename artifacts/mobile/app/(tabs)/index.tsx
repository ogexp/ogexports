import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useGetInvestorDashboard,
  useGetInvestorProjects,
  useGetInvestorWalletTransactions,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';

function Metric({ label, value, icon, detail }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; detail?: string }) {
  const colors = useColors();
  return <View style={{ flex: 1, minWidth: 138, padding: 15, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 1 }}>{label}</Text>
      <Feather name={icon} size={15} color={colors.accent} />
    </View>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', marginTop: 9 }}>{value}</Text>
    {detail ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{detail}</Text> : null}
  </View>;
}

export default function InvestorHome() {
  const { token, user } = useAuth();
  const colors = useColors();
  const dashboard = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: !!token, staleTime: 30_000 } });
  const projects = useGetInvestorProjects({ per_page: 3 }, { query: { queryKey: ['investor-projects', 3], enabled: !!token, staleTime: 60_000 } });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: 4 }, { query: { queryKey: ['investor-wallet-transactions', 1, 4], enabled: !!token, staleTime: 30_000 } });
  const data = unwrap(dashboard.data);
  const summary = record(data.summary);
  const wallet = record(data.wallet);
  const series = record(data.portfolio_series);
  const currency = first(wallet, ['currency', 'default_currency']);
  const balance = amount(wallet, ['available_balance', 'balance', 'available']) ?? amount(summary, ['available_balance']);
  const portfolioTotal = amount(summary, ['total_portfolio_value', 'portfolio_value', 'total_value']);
  const investedCapital = amount(summary, ['total_investment', 'total_investment_usd', 'invested_capital']);
  const returns = amount(summary, ['total_profit_earned', 'total_profit_earned_usd', 'total_returns', 'profit']);
  const activeCount = amount(summary, ['active_investments_count', 'active_investment_count', 'investments_count']);
  const name = first(record(user), ['name', 'first_name'], 'Investor');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const opportunities = list(projects.data);
  const recent = list(transactions.data);
  const payouts = list(data.upcoming_payouts);
  const quickActions = [
    { title: 'Invest Now', icon: 'trending-up' as const, onPress: () => router.push('/(tabs)/opportunities') },
    { title: 'Deposit Funds', icon: 'plus' as const, onPress: () => router.push('/wallet/deposit') },
    { title: 'Withdraw Funds', icon: 'arrow-up-right' as const, onPress: () => router.push('/wallet/withdraw') },
    { title: 'View Portfolio', icon: 'pie-chart' as const, onPress: () => router.push('/(tabs)/portfolio') },
  ];
  const activityIcon = (item: Record<string, unknown>) => {
    const kind = `${first(item, ['type', 'transaction_type'])} ${first(item, ['description', 'title'])}`.toLowerCase();
    return /withdraw|payout/.test(kind) ? 'arrow-up-right' : /invest|purchase/.test(kind) ? 'trending-up' : 'arrow-down-left';
  };

  return <Screen title={`${greeting}, ${name.split(' ')[0]}`} subtitle="Your investment overview" action={
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', paddingTop: 4 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" hitSlop={10} onPress={() => router.push('/account/notifications')}><Feather name="bell" size={19} color={colors.primary} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" hitSlop={10} onPress={() => router.push('/(tabs)/account')}><Feather name="user" size={19} color={colors.primary} /></Pressable>
    </View>
  }>
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, padding: 20, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -34, top: -55, width: 170, height: 170, borderRadius: 100, borderWidth: 1, borderColor: colors.primaryForeground, opacity: 0.12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: colors.accent }} />
        <Text style={{ color: colors.primaryForeground, opacity: 0.82, fontSize: 11, letterSpacing: 1.1, fontWeight: '700' }}>OG EXPORTS · INVESTOR WALLET</Text>
      </View>
      <Text style={{ color: colors.primaryForeground, opacity: 0.75, fontSize: 12, marginTop: 20 }}>Total Portfolio</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.primaryForeground, fontSize: 34, fontWeight: '700', letterSpacing: -0.7, marginTop: 3 }}>
        {dashboard.isLoading ? 'Loading…' : money(portfolioTotal, currency)}
      </Text>
      <View style={{ height: 1, backgroundColor: colors.primaryForeground, opacity: 0.2, marginVertical: 17 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primaryForeground, opacity: 0.72, fontSize: 11 }}>Available Balance</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{dashboard.isLoading ? 'Loading…' : money(balance, currency)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.primaryForeground, opacity: 0.2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primaryForeground, opacity: 0.72, fontSize: 11 }}>Invested Capital</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{dashboard.isLoading ? 'Loading…' : money(investedCapital, currency)}</Text>
        </View>
      </View>
    </Card>
    {dashboard.isError ? <ErrorState message="Your live investor summary could not be loaded." onRetry={() => void dashboard.refetch()} /> : null}

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 3 }}>
      <Metric label="Total Returns" value={dashboard.isLoading ? 'Loading…' : money(returns, currency)} icon="bar-chart-2" detail="Reported by OG Exports" />
      <Metric label="Active Investments" value={dashboard.isLoading ? 'Loading…' : activeCount == null ? '—' : String(activeCount)} icon="briefcase" detail="Current positions" />
    </View>

    <Section title="Quick Actions" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {quickActions.map(action => <Pressable key={action.title} accessibilityRole="button" onPress={action.onPress}
        style={({ pressed }) => ({ flexGrow: 1, flexBasis: '46%', minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.lightGreen : colors.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 })}>
        <Feather name={action.icon} size={17} color={colors.primary} />
        <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', flexShrink: 1 }}>{action.title}</Text>
        <Feather name="arrow-up-right" size={13} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
      </Pressable>)}
    </View>

    <Section title="Portfolio Performance" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Portfolio</Text></Pressable>} />
    <PortfolioHistoryCard points={series.points} currency={currency} loading={dashboard.isLoading} compact />

    <Section title="Investment Opportunities" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
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

    <Section title="Recent Transactions" right={<Pressable accessibilityRole="button" onPress={() => router.push('/account/transactions')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {transactions.isError ? <ErrorState message="Recent wallet activity could not be loaded." onRetry={() => void transactions.refetch()} /> : null}
    {transactions.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading recent activity…</Text></Card> : null}
    {!transactions.isLoading && !transactions.isError && recent.length === 0 ? <EmptyState title="No transactions yet" body="Your activity will appear here when returned by the investor service." /> : null}
    {recent.map((item, index) => {
      const rowCurrency = first(item, ['currency'], currency);
      const kind = first(item, ['description', 'title', 'type', 'transaction_type'], 'Wallet activity');
      const date = first(item, ['created_at', 'date'], 'Date unavailable');
      return <Pressable key={first(item, ['id', 'reference'], String(index))} accessibilityRole="button" onPress={() => router.push('/account/transactions')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 }}>
          <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}><Feather name={activityIcon(item)} size={17} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{kind}</Text><Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{date}</Text></View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{rowCurrency ? money(amount(item, ['amount', 'total']), rowCurrency) : '—'}</Text><Status value={first(item, ['status'], '—')} /></View>
        </Card>
      </Pressable>;
    })}

    <Section title="Upcoming Payouts" />
    {payouts.length ? payouts.map((item, index) => {
      const payoutCurrency = first(item, ['currency'], currency);
      return <Card key={first(item, ['id', 'reference'], String(index))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.statusPendingBackground, alignItems: 'center', justifyContent: 'center' }}><Feather name="calendar" size={16} color={colors.statusPending} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{first(item, ['project_name', 'title', 'description'], 'Investment payout')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(item, ['payout_date', 'date', 'due_date'], 'Date not provided')}</Text></View>
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{payoutCurrency ? money(amount(item, ['amount', 'payout_amount']), payoutCurrency) : '—'}</Text>
      </Card>;
    }) : <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderStyle: 'dashed' }}>
      <Feather name="calendar" size={18} color={colors.accent} />
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Payout schedule</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Upcoming payout details are not available from the server.</Text></View>
    </Card>}
  </Screen>;
}