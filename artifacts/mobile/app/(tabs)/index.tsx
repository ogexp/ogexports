import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  useGetInvestorDeposits,
  useGetInvestorDashboard,
  useGetInvestorInvestments,
  useGetInvestorNotifications,
  useGetInvestorProjects,
  useGetInvestorWithdrawals,
  useGetInvestorWalletTransactions,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingCard, Status } from '@/components/InvestorUI';
import { AllocationDonut, type AllocationSlice } from '@/components/AllocationDonut';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';
import {
  DashboardMetric,
  FinancialHistoryPreview,
  PortfolioBenchmarkCard,
  ProfitAnalyticsCard,
  RecentAlertsPreview,
  type DashboardMetricItem,
} from '@/components/DashboardWidgets';

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

function activityLabel(item: Record<string, unknown>) {
  const descriptor = `${first(item, ['type', 'transaction_type', 'category'])} ${first(item, ['description', 'title'])}`.toLowerCase();
  if (/distribution|profit share|profit earned|dividend/.test(descriptor)) return 'Distribution';
  if (/withdraw|cash.?out|payout/.test(descriptor)) return 'Withdrawal';
  if (/deposit|top.?up|funding/.test(descriptor)) return 'Deposit';
  if (/invest|purchase/.test(descriptor)) return 'Investment';
  if (/status update|shipment|container|in transit|shipped|arriv|deliver/.test(descriptor)) return 'Trade status update';
  return first(item, ['description', 'title', 'type', 'transaction_type'], 'Account activity');
}

function HomeSection({ title, right }: { title: string; right?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 22, marginBottom: 11 }}>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 }}>{title}</Text>
      {right}
    </View>
  );
}

export default function InvestorHome() {
  const { token, user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dashboard = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: !!token, staleTime: 30_000 } });
  const investments = useGetInvestorInvestments({ per_page: 50 }, { query: { queryKey: ['investor-positions', 50], enabled: !!token, staleTime: 30_000 } });
  const projects = useGetInvestorProjects({ per_page: 3 }, { query: { queryKey: ['investor-projects', 3], enabled: !!token, staleTime: 60_000 } });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: 6 }, { query: { queryKey: ['investor-wallet-transactions', 1, 6], enabled: !!token, staleTime: 30_000 } });
  const depositsQuery = useGetInvestorDeposits({ per_page: 5 }, { query: { queryKey: ['investor-deposits'], enabled: !!token, staleTime: 30_000 } });
  const withdrawalsQuery = useGetInvestorWithdrawals({}, { query: { queryKey: ['investor-withdrawals'], enabled: !!token, staleTime: 30_000 } });
  const notificationsQuery = useGetInvestorNotifications({ query: { queryKey: ['investor-notifications'], enabled: !!token, staleTime: 20_000 } });
  const data = unwrap(dashboard.data);
  const summary = record(data.summary);
  const wallet = record(data.wallet);
  const series = record(data.portfolio_series);
  const currency = first(wallet, ['currency', 'default_currency'], first(summary, ['display_currency']));
  const liveBalance = amount(wallet, ['available_balance', 'balance', 'available']) ?? amount(summary, ['available_balance']);
  const portfolioTotal = amount(summary, ['total_portfolio_value', 'portfolio_value', 'total_value']);
  const investedCapital = amount(summary, ['total_investment', 'total_investment_usd', 'invested_capital']);
  const netReturns = amount(summary, ['total_profit_earned', 'total_profit_earned_usd', 'distributed_returns', 'total_returns', 'profit']);
  const monthlyProfit = amount(summary, ['monthly_profit', 'monthly_profit_usd']);
  const activeInvestment = amount(summary, ['active_investment', 'active_investment_usd']);
  const pendingDistribution = amount(summary, ['pending_distribution', 'pending_distribution_usd']);
  const roi = amount(summary, ['lifetime_roi', 'roi_percentage', 'roi']);
  const availableBalance = liveBalance;
  const name = first(record(user), ['name', 'first_name'], 'Investor');
  const firstName = name.split(/\s+/)[0] || 'Investor';
  const greeting = 'Welcome back';
  const opportunities = list(projects.data);
  const featuredOpportunities = opportunities.slice(0, 3);
  const dashboardActivity = list(data.recent_activity ?? data.recent_transactions ?? data.activity);
  const recent = (dashboardActivity.length ? dashboardActivity : list(transactions.data)).slice(0, 6);
  const activityLoading = transactions.isLoading && dashboardActivity.length === 0;
  const activityError = transactions.isError && dashboardActivity.length === 0;
  const payouts = list(data.upcoming_payouts);
  const investmentItems = list(investments.data).slice(0, 3);
  const dashboardDeposits = list(data.recent_deposits);
  const recentDeposits = (dashboardDeposits.length ? dashboardDeposits : list(depositsQuery.data)).slice(0, 3);
  const dashboardWithdrawals = list(data.withdrawals);
  const recentWithdrawals = (dashboardWithdrawals.length ? dashboardWithdrawals : list(withdrawalsQuery.data)).slice(0, 3);
  const dashboardAlerts = list(data.notifications);
  const recentAlerts = (dashboardAlerts.length ? dashboardAlerts : list(notificationsQuery.data)).slice(0, 3);
  const monthlyProfitHistory = list(data.profit_monthly);
  const allocation: AllocationSlice[] = list(data.allocation).flatMap(item => {
    const value = amount(item, ['value', 'percentage', 'share']);
    return value == null ? [] : [{ name: first(item, ['name', 'label', 'category'], 'Allocation details not provided'), value }];
  });
  const benchmarkSeries = record(data.benchmark_series);
  const benchmarkAvailable = data.benchmark_available === true;
  const displayMoney = (value: number | null, unit = currency) =>
    balanceHidden ? '••••••' : value == null ? 'Not reported' : unit ? money(value, unit) : 'Currency not provided';
  const displayRoi = balanceHidden ? '••••' : roi == null ? '—' : `${roi.toFixed(2)}%`;
  const metricMoney = (value: number | null) => dashboard.isLoading ? '…' : displayMoney(value);
  const metricCount = (value: number | null) => dashboard.isLoading ? '…' : value == null ? 'Not reported' : String(value);
  const depositLoading = depositsQuery.isLoading && dashboardDeposits.length === 0;
  const depositError = depositsQuery.isError && dashboardDeposits.length === 0;
  const withdrawalLoading = withdrawalsQuery.isLoading && dashboardWithdrawals.length === 0;
  const withdrawalError = withdrawalsQuery.isError && dashboardWithdrawals.length === 0;
  const alertsLoading = notificationsQuery.isLoading && dashboardAlerts.length === 0;
  const alertsError = notificationsQuery.isError && dashboardAlerts.length === 0;
  const metricItems: DashboardMetricItem[] = [
    { label: 'Total Deposits', value: metricMoney(amount(summary, ['total_deposits', 'total_deposits_usd'])), icon: 'arrow-down-left', detail: metricCount(amount(summary, ['total_deposits_count'])) },
    { label: 'Pending Deposits', value: metricMoney(amount(summary, ['pending_deposits_amount', 'pending_deposits'])), icon: 'clock', detail: metricCount(amount(summary, ['pending_deposits_count'])) },
    { label: 'Total Withdrawals', value: metricMoney(amount(summary, ['total_withdrawals', 'total_withdrawals_usd'])), icon: 'arrow-up-right', detail: metricCount(amount(summary, ['total_withdrawals_count'])) },
    { label: 'Pending Withdrawals', value: metricMoney(amount(summary, ['pending_withdrawals_amount', 'pending_withdrawals_amount_usd'])), icon: 'clock', detail: metricCount(amount(summary, ['pending_withdrawals_count'])) },
    { label: 'Total Investment', value: metricMoney(investedCapital), icon: 'briefcase', detail: metricCount(amount(summary, ['investments_count'])) },
    { label: 'Active Investment', value: metricMoney(activeInvestment), icon: 'activity', detail: metricCount(amount(summary, ['active_investments_count'])) },
    { label: 'Total Profit Earned', value: metricMoney(netReturns), icon: 'trending-up' },
    { label: 'Monthly Profit', value: metricMoney(monthlyProfit), icon: 'bar-chart-2' },
    { label: 'Lifetime ROI', value: dashboard.isLoading ? '…' : balanceHidden ? '••••' : roi == null ? 'Not reported' : `${roi.toFixed(2)}%`, icon: 'activity' },
    { label: 'Completed Transactions', value: metricCount(amount(summary, ['completed_transactions'])), icon: 'check-circle' },
    { label: 'Available Balance', value: metricMoney(availableBalance), icon: 'credit-card' },
    { label: 'Pending Distribution', value: metricMoney(pendingDistribution), icon: 'calendar' },
  ];
  const verificationItems = [
    { label: 'KYC', value: first(data, ['kyc_status'], 'Not provided') },
    { label: 'AML', value: first(data, ['aml_status'], 'Not provided') },
    { label: 'Tax Documents', value: first(data, ['tax_document_status', 'tax_documents_status'], 'Not provided') },
  ];
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
  const refreshDashboard = async () => {
    if (refreshing) return;
    setRefreshing(true);
    if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };
  const activityIcon = (item: Record<string, unknown>) => {
    const kind = activityLabel(item).toLowerCase();
    if (/withdraw/.test(kind)) return 'arrow-up-right';
    if (/invest/.test(kind)) return 'trending-up';
    if (/status/.test(kind)) return 'truck';
    return 'arrow-down-left';
  };
  const dockShadow = Platform.OS === 'web'
    ? { boxShadow: `0 3px 12px ${colors.shadow}` }
    : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 };

  return <>
  <ScrollView
    refreshControl={<RefreshControl
      testID="home-pull-to-refresh"
      refreshing={refreshing}
      onRefresh={() => void refreshDashboard()}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
    />}
    style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 12,
      paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 112,
      paddingHorizontal: 18,
    }}
    showsVerticalScrollIndicator={false}
  >
    <View style={{ height: 46, justifyContent: 'center', alignItems: 'center', marginBottom: 13 }}>
      <Pressable testID="home-account-menu" accessibilityRole="button" accessibilityLabel="Open account menu" hitSlop={8} onPress={() => setAccountMenuOpen(true)}
        style={({ pressed }) => ({ position: 'absolute', left: 0, width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
        <Feather name="menu" size={20} color={colors.primary} />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '70%' }}>
        <Image source={require('../../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 34, height: 32 }} />
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, color: colors.primary, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>OG Exports</Text>
      </View>
      <Pressable testID="home-notifications" accessibilityRole="button" accessibilityLabel="Open notifications" hitSlop={8} onPress={() => router.push('/account/notifications')}
        style={({ pressed }) => ({ position: 'absolute', right: 0, width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
        <Feather name="bell" size={18} color={colors.primary} />
      </Pressable>
    </View>
    <View style={{ marginBottom: 16 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 20, fontWeight: '600', letterSpacing: -0.4 }}>{greeting}, {firstName}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>Your trade portfolio at a glance</Text>
    </View>

    <Card style={{ padding: 20, paddingBottom: 19, borderRadius: 20, marginBottom: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ color: colors.primary, opacity: 0.88, fontSize: 10, fontWeight: '600', letterSpacing: 0.9 }}>PORTFOLIO OVERVIEW</Text>
        <Pressable testID="home-portfolio-selector" accessibilityRole="button" accessibilityLabel="Open portfolio" onPress={() => router.push('/(tabs)/portfolio')}
          style={({ pressed }) => ({ minHeight: 32, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 })}>
          <Feather name="pie-chart" size={13} color={colors.primary} />
          <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>My portfolio</Text>
          <Feather name="arrow-up-right" size={12} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ marginTop: 17 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Total portfolio value</Text>
          <Pressable testID="home-toggle-sensitive-values" accessibilityRole="button" accessibilityLabel={balanceHidden ? 'Show account balances' : 'Hide account balances'}
            onPress={() => setBalanceHidden(current => !current)} hitSlop={8}>
            <Feather name={balanceHidden ? 'eye-off' : 'eye'} size={16} color={colors.primary} />
          </Pressable>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 34, fontWeight: '600', letterSpacing: -0.8, marginTop: 5 }}>
          {dashboard.isLoading ? '…' : displayMoney(portfolioTotal)}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>Reported by OG Exports</Text>
      </View>

    </Card>

    <View style={[{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 6, paddingHorizontal: 6, marginHorizontal: 0, marginTop: 12, marginBottom: 15, zIndex: 2 }, dockShadow]}>
      {quickActions.map((action, index) => (
        <Pressable key={action.title} testID={`home-action-${index}`} accessibilityRole="button" accessibilityLabel={action.title} onPress={action.onPress}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: pressed ? colors.secondary : 'transparent' })}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={action.icon} size={16} color={colors.primary} />
          </View>
          <Text numberOfLines={2} adjustsFontSizeToFit style={{ maxWidth: '100%', color: colors.foreground, fontSize: 10, lineHeight: 12, textAlign: 'center', fontWeight: '600' }}>{action.shortTitle}</Text>
        </Pressable>
      ))}
    </View>

    <Pressable testID="home-open-search" accessibilityRole="button" accessibilityLabel="Search trades, investments and transactions" onPress={() => router.push('/search')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 54, paddingHorizontal: 16, marginBottom: 6, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.78 : 1 })}>
      <Feather name="search" size={17} color={colors.primary} />
      <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 13 }}>Search trades, investments or transactions</Text>
      <Feather name="arrow-right" size={15} color={colors.mutedForeground} />
    </Pressable>

    {dashboard.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4, paddingVertical: 5 }}>
      <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>Portfolio data is unavailable.</Text>
      <Pressable accessibilityRole="button" onPress={() => void dashboard.refetch()}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Try again</Text></Pressable>
    </View> : null}

    <HomeSection title="Account Overview" />
    <View style={{ gap: 9 }}>
      {Array.from({ length: Math.ceil(metricItems.length / 2) }, (_, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap: 9 }}>
          {metricItems.slice(rowIndex * 2, rowIndex * 2 + 2).map(item => <DashboardMetric key={item.label} item={item} />)}
        </View>
      ))}
    </View>

    <HomeSection title="Verification Status" right={<Pressable accessibilityRole="button" onPress={() => router.push('/account/kyc')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View details</Text></Pressable>} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {verificationItems.map(item => <Card key={item.label} style={{ flex: 1, minWidth: 0, padding: 10, marginBottom: 0, borderRadius: 16 }}>
        <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, fontWeight: '600', marginBottom: 7 }}>{item.label}</Text>
        <Status value={item.value} />
      </Card>)}
    </View>

    <HomeSection title="My Investments" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View all</Text></Pressable>} />
    {investments.isError ? <ErrorState message="Investment information could not be loaded." error={investments.error} onRetry={() => void investments.refetch()} /> : null}
    {investments.isLoading ? <LoadingCard label="Loading investments…" /> : null}
    {!investments.isLoading && !investments.isError && investmentItems.length === 0 ? <EmptyState title="No investment records" body="Investment details will appear here when supplied by OG Exports." /> : null}
    {investmentItems.map((position, index) => {
      const trade = record(position.trade ?? position.project ?? position.trade_details);
      const tradeId = first(position, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code'], 'Trade reference not provided'));
      const tradeLabel = tradeId === 'Trade reference not provided' || /^trade\s*#/i.test(tradeId) ? tradeId : `Trade #${tradeId}`;
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
      return <Card key={positionId || `${tradeId}-${index}`} style={{ borderRadius: 22, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{tradeLabel}</Text>
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 16, lineHeight: 21, fontWeight: '700', marginTop: 6 }}>{title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>{route}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 }}>CONTAINER STATUS</Text>
            <Status value={containerStatus} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          <View style={{ flex: 1, minWidth: 120, padding: 10, borderRadius: 14, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Investment amount</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 5 }}>{positionCurrency ? displayMoney(investmentAmount, positionCurrency) : '—'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 120, padding: 10, borderRadius: 14, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Estimated arrival</Text>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 5 }}>{eta}</Text>
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

    <HomeSection title="Featured opportunities" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {projects.isError ? <ErrorState message="Trade opportunities could not be loaded." error={projects.error} onRetry={() => void projects.refetch()} /> : null}
    {projects.isLoading ? <LoadingCard label="Loading available opportunities…" /> : null}
    {!projects.isLoading && !projects.isError && opportunities.length === 0 ? <EmptyState title="No available opportunities" body="Trade opportunities will appear here when provided by OG Exports." /> : null}
    {featuredOpportunities.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
      {featuredOpportunities.map((item, index) => {
        const id = first(item, ['id', 'project_id'], '');
        return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
          <Card style={{ width: 250, minHeight: 132, marginBottom: 5, borderRadius: 20, padding: 17 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}><Feather name="briefcase" size={16} color={colors.primary} /></View>
              <Status value={first(item, ['status', 'state'], 'Not provided')} />
            </View>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 13 }}>{first(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade opportunity')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>{first(item, ['destination', 'destination_country', 'type', 'category', 'location'], 'Trade details not provided')}</Text>
              <Feather name="arrow-up-right" size={14} color={colors.primary} />
            </View>
          </Card>
        </Pressable>;
      })}
    </ScrollView> : null}

    <FinancialHistoryPreview
      title="Recent Deposits"
      route="/wallet/deposit"
      icon="arrow-down-left"
      records={recentDeposits}
      loading={depositLoading}
      error={depositError}
      onRetry={() => void depositsQuery.refetch()}
      emptyTitle="No recent deposits"
      emptyBody="Deposit records will appear here when returned by OG Exports."
      currency={currency}
      hideValues={balanceHidden}
    />
    <FinancialHistoryPreview
      title="Withdrawal History"
      route="/wallet/withdraw"
      icon="arrow-up-right"
      records={recentWithdrawals}
      loading={withdrawalLoading}
      error={withdrawalError}
      onRetry={() => void withdrawalsQuery.refetch()}
      emptyTitle="No recent withdrawals"
      emptyBody="Withdrawal requests will appear here when returned by OG Exports."
      currency={currency}
      hideValues={balanceHidden}
    />

    <HomeSection title="Recent activity" right={<Pressable accessibilityRole="button" onPress={() => router.push('/account/transactions')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {activityError ? <ErrorState message="Recent activity could not be loaded." error={transactions.error} onRetry={() => void transactions.refetch()} /> : null}
    {activityLoading ? <LoadingCard label="Loading recent activity…" /> : null}
    {!activityLoading && !activityError && recent.length === 0 ? <EmptyState title="No recent activity" body="Investments, deposits, withdrawals, distributions and trade status updates will appear here when returned by OG Exports." /> : null}
    {groupedTransactions.map(group => <View key={group.label}>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 8, marginBottom: 2 }}>{group.label}</Text>
      {group.items.map((item, index) => {
        const rowCurrency = first(item, ['currency'], currency);
        const kind = activityLabel(item);
        const date = first(item, ['created_at', 'date'], 'Date unavailable');
        const rowAmount = amount(item, ['amount', 'total']);
        const transactionId = first(item, ['id', 'transaction_id', 'reference']);
        return <Pressable key={transactionId || `${group.label}-${index}`} accessibilityRole="button" accessibilityLabel={`View ${kind}`} onPress={() => router.push({
          pathname: '/account/transactions',
          params: { tab: 'Wallet', search: transactionId || kind, selected: transactionId },
        })}
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

    <RecentAlertsPreview
      records={recentAlerts}
      loading={alertsLoading}
      error={alertsError}
      onRetry={() => void notificationsQuery.refetch()}
    />

    <HomeSection title="Portfolio performance" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Portfolio</Text></Pressable>} />
    <PortfolioHistoryCard points={series.points} currency={currency} loading={dashboard.isLoading} compact hideValues={balanceHidden} />
    <PortfolioBenchmarkCard
      points={benchmarkSeries.points}
      available={benchmarkAvailable}
      loading={dashboard.isLoading}
      hideValues={balanceHidden}
    />
    <ProfitAnalyticsCard points={monthlyProfitHistory} currency={currency} loading={dashboard.isLoading} hideValues={balanceHidden} />
    <AllocationDonut
      title="Allocation"
      subtitle="Portfolio distribution"
      data={allocation}
      currency={currency}
      valueMode="percentage"
    />

    <HomeSection title="Upcoming payouts" />
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

  </ScrollView>
  <Modal
    visible={accountMenuOpen}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={() => setAccountMenuOpen(false)}
  >
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(10, 22, 16, 0.36)' }}>
      <View accessibilityViewIsModal style={{
        width: '82%',
        maxWidth: 320,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRightWidth: 1,
        borderTopRightRadius: 26,
        borderBottomRightRadius: 26,
        paddingTop: insets.top + 16,
        paddingBottom: Math.max(insets.bottom, 16) + 14,
        paddingHorizontal: 20,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>Account</Text>
          <Pressable testID="home-menu-close" accessibilityRole="button" accessibilityLabel="Close account menu" hitSlop={8} onPress={() => setAccountMenuOpen(false)}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
            <Feather name="x" size={19} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginBottom: 16 }} />
        <Pressable testID="home-profile" accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => {
          setAccountMenuOpen(false);
          router.push('/account/profile');
        }}
          style={({ pressed }) => ({ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.78 : 1 })}>
          <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="user" size={17} color={colors.primary} />
          </View>
          <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: '600' }}>Profile</Text>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close account menu" onPress={() => setAccountMenuOpen(false)} style={{ flex: 1 }} />
    </View>
  </Modal>
  </>;
}
