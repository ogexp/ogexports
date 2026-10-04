import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetInvestorDashboard,
  useGetInvestorInvestments,
  useGetInvestorProjects,
  useGetInvestorWalletTransactions,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';

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
  const investments = useGetInvestorInvestments({ per_page: 50 }, { query: { queryKey: ['investor-positions', 50], enabled: !!token, staleTime: 30_000 } });
  const projects = useGetInvestorProjects({ per_page: 3 }, { query: { queryKey: ['investor-projects', 3], enabled: !!token, staleTime: 60_000 } });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: 4 }, { query: { queryKey: ['investor-wallet-transactions', 1, 4], enabled: !!token, staleTime: 30_000 } });
  const data = unwrap(dashboard.data);
  const summary = record(data.summary);
  const wallet = record(data.wallet);
  const series = record(data.portfolio_series);
  const currency = first(wallet, ['currency', 'default_currency']);
  const liveBalance = amount(wallet, ['available_balance', 'balance', 'available']) ?? amount(summary, ['available_balance']);
  const portfolioTotal = amount(summary, ['total_portfolio_value', 'portfolio_value', 'total_value']);
  const investedCapital = amount(summary, ['total_investment', 'total_investment_usd', 'invested_capital']);
  const netReturns = amount(summary, ['total_profit_earned', 'total_profit_earned_usd', 'total_returns', 'profit']);
  const roi = amount(summary, ['lifetime_roi', 'roi_percentage', 'roi']);
  const availableBalance = liveBalance;
  const name = first(record(user), ['name', 'first_name'], 'Investor');
  const firstName = name.split(/\s+/)[0] || 'Investor';
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'OG';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const opportunities = list(projects.data);
  const recent = list(transactions.data).slice(0, 4);
  const payouts = list(data.upcoming_payouts);
  const activeTrades = list(investments.data).filter(item => {
    const status = first(item, ['trade_status', 'container_status', 'status', 'state']).toLowerCase();
    return !!status && /(active|confirm|funded|prepar|stuff|custom|transit|arriv|deliver|settle|ship|in.?progress)/i.test(status)
      && !/(cancel|reject|fail|complete|closed)/i.test(status);
  }).slice(0, 2);
  const displayMoney = (value: number | null, unit = currency) => balanceHidden ? '••••••' : unit ? money(value, unit) : '—';
  const displayRoi = balanceHidden ? '••••' : roi == null ? '—' : `${roi.toFixed(2)}%`;
  const groupedTransactions = recent.reduce<{ label: string; items: Record<string, unknown>[] }[]>((groups, item) => {
    const label = transactionGroup(first(item, ['created_at', 'date'], ''));
    const existing = groups.find(group => group.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
    return groups;
  }, []);
  const quickActions = [
    { title: 'Invest', shortTitle: 'Invest', icon: 'trending-up' as const, onPress: () => router.push('/(tabs)/opportunities') },
    { title: 'Add Funds', shortTitle: 'Add funds', icon: 'plus' as const, onPress: () => router.push('/wallet/deposit') },
    { title: 'Withdraw', shortTitle: 'Withdraw', icon: 'arrow-up-right' as const, onPress: () => router.push('/wallet/withdraw') },
    { title: 'Transactions', shortTitle: 'Transactions', icon: 'file-text' as const, onPress: () => router.push('/account/transactions') },
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
      style={{ borderRadius: 30, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, overflow: 'hidden', minHeight: 330 }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -68, top: -66, width: 230, height: 230, borderRadius: 120, borderWidth: 1, borderColor: colors.primaryForeground, opacity: 0.12 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: -86, bottom: -155, width: 240, height: 240, borderRadius: 130, borderWidth: 1, borderColor: colors.primaryForeground, opacity: 0.07 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.primaryForeground, fontSize: 15, fontWeight: '700' }}>{greeting}, {firstName}</Text>
          <Text style={{ color: colors.primaryForeground, fontSize: 11, opacity: 0.74, marginTop: 3 }}>Your trade portfolio at a glance</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Pressable testID="home-notifications" accessibilityRole="button" accessibilityLabel="Open notifications" hitSlop={8} onPress={() => router.push('/account/notifications')}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
            <Feather name="bell" size={17} color={colors.primaryForeground} />
          </Pressable>
          <Pressable testID="home-profile" accessibilityRole="button" accessibilityLabel="Open profile menu" hitSlop={8} onPress={() => router.push('/(tabs)/account')}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.52)', backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
            <Text style={{ color: colors.primaryForeground, fontSize: 12, fontWeight: '700' }}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable testID="home-portfolio-selector" accessibilityRole="button" accessibilityLabel="Open portfolio" onPress={() => router.push('/(tabs)/portfolio')}
        style={({ pressed }) => ({ alignSelf: 'center', marginTop: 20, minHeight: 34, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.12)', opacity: pressed ? 0.8 : 1 })}>
        <Feather name="pie-chart" size={14} color={colors.primaryForeground} />
        <Text numberOfLines={1} style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '700' }}>My portfolio</Text>
        <Feather name="chevron-down" size={14} color={colors.primaryForeground} />
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: 17 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 12, opacity: 0.78 }}>Total portfolio value</Text>
          <Pressable testID="home-toggle-sensitive-values" accessibilityRole="button" accessibilityLabel={balanceHidden ? 'Show account balances' : 'Hide account balances'}
            onPress={() => setBalanceHidden(current => !current)} hitSlop={8}>
            <Feather name={balanceHidden ? 'eye-off' : 'eye'} size={15} color={colors.primaryForeground} />
          </Pressable>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.primaryForeground, fontSize: 38, fontWeight: '700', letterSpacing: -1.1, marginTop: 4 }}>
          {dashboard.isLoading ? '…' : displayMoney(portfolioTotal)}
        </Text>
        <Text style={{ color: colors.primaryForeground, fontSize: 11, opacity: 0.72, marginTop: 4 }}>Reported by OG Exports</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
        {[
          { label: 'Total invested', value: displayMoney(investedCapital) },
          { label: 'Net returns', value: displayMoney(netReturns) },
          { label: 'Lifetime ROI', value: displayRoi },
          { label: 'Available balance', value: displayMoney(availableBalance) },
        ].map((item, index) => <View key={item.label} style={{ width: '50%', paddingTop: index > 1 ? 12 : 3, paddingBottom: 2, paddingRight: index % 2 === 0 ? 10 : 0 }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 10, opacity: 0.76 }}>{item.label}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{dashboard.isLoading ? '…' : item.value}</Text>
        </View>)}
      </View>
    </LinearGradient>

    <View style={[{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', borderRadius: 25, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 8, paddingHorizontal: 7, marginHorizontal: 6, marginTop: -27, marginBottom: 13, zIndex: 2 }, dockShadow]}>
      {quickActions.map((action, index) => (
        <Pressable key={action.title} testID={`home-action-${index}`} accessibilityRole="button" accessibilityLabel={action.title} onPress={action.onPress}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 66, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: pressed ? colors.secondary : 'transparent' })}>
          <View style={{ width: 34, height: 34, borderRadius: 18, backgroundColor: index === 0 ? colors.primary : colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={action.icon} size={16} color={index === 0 ? colors.primaryForeground : colors.primary} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: '100%', color: colors.foreground, fontSize: 9, fontWeight: '700' }}>{action.shortTitle}</Text>
        </Pressable>
      ))}
    </View>

    {dashboard.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4, paddingVertical: 5 }}>
      <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>Portfolio data is unavailable.</Text>
      <Pressable accessibilityRole="button" onPress={() => void dashboard.refetch()}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Try again</Text></Pressable>
    </View> : null}

    <Section title="My Active Trades" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Portfolio</Text></Pressable>} />
    {investments.isError ? <ErrorState message="Active trade information could not be loaded." onRetry={() => void investments.refetch()} /> : null}
    {investments.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading active trades…</Text></Card> : null}
    {!investments.isLoading && !investments.isError && activeTrades.length === 0 ? <EmptyState title="No active trades" body="Your active import and export trades will appear here when provided by OG Exports." /> : null}
    {activeTrades.map((position, index) => {
      const trade = record(position.trade ?? position.project ?? position.trade_details);
      const tradeId = first(position, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code'], 'Trade reference not provided'));
      const title = first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(position, ['project_name', 'title', 'name'], 'Trade details not provided'));
      const origin = first(position, ['origin', 'origin_country', 'from_country'], first(trade, ['origin', 'origin_country', 'from_country', 'country_of_origin']));
      const destination = first(position, ['destination', 'destination_country', 'to_country'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market']));
      const route = origin && destination ? `${origin} → ${destination}` : 'Route details not provided';
      const containerStatus = first(position, ['container_status', 'shipment_status', 'trade_status'], first(trade, ['container_status', 'shipment_status', 'trade_status'], 'Status not provided'));
      const eta = first(position, ['estimated_arrival', 'eta'], first(trade, ['estimated_arrival', 'eta'], 'Not provided'));
      const progress = amount(position, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage'])
        ?? amount(trade, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage']);
      const boundedProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
      const investmentAmount = amount(position, ['amount', 'investment_amount', 'principal']);
      const positionId = first(position, ['investment_id', 'id'], '');
      const positionCurrency = first(position, ['currency'], first(trade, ['currency'], currency));
      return <Card key={positionId || `${tradeId}-${index}`}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.55 }}>{tradeId}</Text>
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{title}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 5 }}>{route}</Text>
          </View>
          <Status value={containerStatus} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Investment amount</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{positionCurrency ? displayMoney(investmentAmount, positionCurrency) : '—'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Estimated arrival</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{eta}</Text>
          </View>
        </View>
        {boundedProgress != null ? <View style={{ marginTop: 13 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Trade cycle progress</Text>
            <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '700' }}>{boundedProgress.toFixed(0)}%</Text>
          </View>
          <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}>
            <View style={{ width: `${boundedProgress}%`, height: 6, backgroundColor: colors.primary, borderRadius: 4 }} />
          </View>
        </View> : <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 12 }}>Trade cycle progress has not been provided.</Text>}
        <Pressable testID={`home-track-trade-${index}`} accessibilityRole="button" accessibilityLabel={`Track ${title}`} disabled={!positionId} onPress={() => router.push({ pathname: '/position/[id]', params: { id: positionId } })}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 42, borderRadius: 12, backgroundColor: positionId ? colors.primary : colors.secondary, marginTop: 14, opacity: pressed ? 0.82 : 1 })}>
          <Text style={{ color: positionId ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>Track Trade</Text>
          <Feather name="arrow-up-right" size={14} color={positionId ? colors.primaryForeground : colors.mutedForeground} />
        </Pressable>
      </Card>;
    })}

    <Section title="Featured opportunities" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {projects.isError ? <ErrorState message="Trade opportunities could not be loaded." onRetry={() => void projects.refetch()} /> : null}
    {projects.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading available opportunities…</Text></Card> : null}
    {!projects.isLoading && !projects.isError && opportunities.length === 0 ? <EmptyState title="No available opportunities" body="Trade opportunities will appear here when provided by OG Exports." /> : null}
    {opportunities.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
      {opportunities.map((item, index) => {
        const id = first(item, ['id', 'project_id'], '');
        return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
          <Card style={{ width: 248, minHeight: 112, marginBottom: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}><Feather name="briefcase" size={16} color={colors.accent} /><Status value={first(item, ['status', 'state'], 'Not provided')} /></View>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 11 }}>{first(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade opportunity')}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 5 }}>{first(item, ['destination', 'destination_country', 'type', 'category', 'location'], 'Trade details not provided')}</Text>
          </Card>
        </Pressable>;
      })}
    </ScrollView> : null}

    <Section title="Recent activity" right={<Pressable accessibilityRole="button" onPress={() => router.push('/account/transactions')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
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

  </ScrollView>;
}