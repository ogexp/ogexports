import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useFocusEffect } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetInvestorDashboard,
  useGetInvestorDeposits,
  useGetInvestorInvestments,
  useGetInvestorNotifications,
  useGetInvestorProjects,
  useGetInvestorWalletTransactions,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, LoadingCard, Status } from '@/components/InvestorUI';
import { AllocationDonut, type AllocationSlice } from '@/components/AllocationDonut';
import { amount, availableBalanceFromDashboard, first, list, money, record, unwrap } from '@/lib/data';
import { mergeDepositRequests, resolveActivityTransactionTarget } from '@/lib/deposit-activity';
import { latestRecords } from '@/lib/latest-records';
import { isInvestorNotificationUnread } from '@/lib/notification-utils';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { PortfolioHistoryCard } from '@/components/PortfolioHistoryCard';
import {
  DashboardMetric,
  PortfolioBenchmarkCard,
  ProfitAnalyticsCard,
  RecentAlertsPreview,
  type DashboardMetricItem,
} from '@/components/DashboardWidgets';
import { MOTION, MotionProgress, MotionReveal, motionHaptic } from '@/lib/motion';
import { dashboardHistoryParams, type DashboardHistoryScope } from '@/lib/dashboard-history';

const accountMenuSections = [
  {
    title: 'OVERVIEW',
    items: [
      { key: 'home', label: 'Home', icon: 'home', href: '/(tabs)' },
      { key: 'explore', label: 'Explore opportunities', icon: 'compass', href: '/(tabs)/opportunities' },
      { key: 'portfolio', label: 'Portfolio', icon: 'pie-chart', href: '/(tabs)/portfolio' },
      { key: 'wallet', label: 'Wallet', icon: 'briefcase', href: '/(tabs)/wallet' },
    ],
  },
  {
    title: 'INVESTMENTS & ACTIVITY',
    items: [
      { key: 'search', label: 'Search', icon: 'search', href: '/search' },
      { key: 'transactions', label: 'Transactions', icon: 'file-text', href: '/account/transactions' },
      { key: 'analytics', label: 'Trade analytics', icon: 'bar-chart-2', href: '/account/analytics' },
      { key: 'reports', label: 'Reports', icon: 'clipboard', href: '/account/reports' },
      { key: 'notifications', label: 'Notifications', icon: 'bell', href: '/account/notifications' },
    ],
  },
  {
    title: 'WALLET & FUNDING',
    items: [
      { key: 'add-funds', label: 'Add funds', icon: 'plus-circle', href: '/wallet/deposit' },
      { key: 'withdraw', label: 'Withdraw', icon: 'arrow-up-right', href: '/wallet/withdraw' },
      { key: 'bank-accounts', label: 'Bank accounts', icon: 'credit-card', href: '/account/bank-accounts' },
    ],
  },
  {
    title: 'ACCOUNT & SUPPORT',
    items: [
      { key: 'profile', label: 'Profile', icon: 'user', href: '/account/profile' },
      { key: 'verification', label: 'Identity verification', icon: 'check-circle', href: '/account/kyc' },
      { key: 'security', label: 'Security & devices', icon: 'shield', href: '/account/security' },
      { key: 'data-preferences', label: 'Data preferences', icon: 'lock', href: '/account/data-preferences' },
      { key: 'settings', label: 'Settings', icon: 'settings', href: '/account/settings' },
      { key: 'support', label: 'Support', icon: 'message-circle', href: '/account/messages' },
    ],
  },
  {
    title: 'DOCUMENTS & POLICIES',
    items: [
      { key: 'terms', label: 'Terms of service', icon: 'file-text', href: '/account/legal/terms' },
      { key: 'investment-terms', label: 'Investment terms', icon: 'file-text', href: '/account/legal/investment-terms' },
      { key: 'user-agreement', label: 'User agreement', icon: 'file-text', href: '/account/legal/user-agreement' },
      { key: 'privacy', label: 'Privacy policy', icon: 'file-text', href: '/account/legal/privacy' },
      { key: 'risk', label: 'Risk disclosure', icon: 'alert-circle', href: '/account/legal/risk' },
    ],
  },
] as const;

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

const investmentDateFields = ['invested_at', 'invest_date', 'investment_date', 'created_at', 'createdAt', 'date'];
const activityDateFields = ['created_at', 'createdAt', 'occurred_at', 'transacted_at', 'transaction_date', 'date', 'timestamp'];

function activityDate(item: Record<string, unknown>) {
  return first(item, activityDateFields);
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
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: 3 }, { query: { queryKey: ['investor-wallet-transactions', 1, 3], enabled: !!token, staleTime: 30_000 } });
  const deposits = useGetInvestorDeposits({ page: 1, per_page: 5 }, { query: { queryKey: ['investor-deposits', 1, 5], enabled: !!token, staleTime: 30_000 } });
  const notificationsQuery = useGetInvestorNotifications({ query: { queryKey: ['investor-notifications'], enabled: !!token, staleTime: 20_000 } });
  useFocusEffect(React.useCallback(() => {
    if (token) {
      void dashboard.refetch();
      void deposits.refetch();
      void notificationsQuery.refetch();
    }
  }, [token, dashboard.refetch, deposits.refetch, notificationsQuery.refetch]));
  const data = unwrap(dashboard.data);
  const summary = record(data.summary);
  const wallet = record(data.wallet);
  const series = record(data.portfolio_series);
  const currency = first(wallet, ['currency', 'default_currency'], first(summary, ['display_currency'], 'USD'));
  const liveBalance = availableBalanceFromDashboard(dashboard.data);
  const investedCapitalLocal = amount(summary, ['total_investment']);
  const investedCapitalUsd = amount(summary, ['total_investment_usd']);
  const investedCapital = investedCapitalLocal ?? investedCapitalUsd ?? amount(summary, ['invested_capital']);
  const investedCapitalCurrency = investedCapitalLocal != null ? currency : investedCapitalUsd != null ? 'USD' : currency;
  const netReturnsLocal = amount(summary, ['total_profit_earned', 'distributed_returns', 'total_returns', 'profit']);
  const netReturnsUsd = amount(summary, ['total_profit_earned_usd']);
  const netReturns = netReturnsLocal ?? netReturnsUsd;
  const netReturnsCurrency = netReturnsLocal != null ? currency : netReturnsUsd != null ? 'USD' : currency;
  const monthlyProfitLocal = amount(summary, ['monthly_profit']);
  const monthlyProfitUsd = amount(summary, ['monthly_profit_usd']);
  const monthlyProfit = monthlyProfitLocal ?? monthlyProfitUsd;
  const monthlyProfitCurrency = monthlyProfitLocal != null ? currency : monthlyProfitUsd != null ? 'USD' : currency;
  const activeInvestmentLocal = amount(summary, ['active_investment']);
  const activeInvestmentUsd = amount(summary, ['active_investment_usd']);
  const activeInvestment = activeInvestmentLocal ?? activeInvestmentUsd;
  const activeInvestmentCurrency = activeInvestmentLocal != null ? currency : activeInvestmentUsd != null ? 'USD' : currency;
  const pendingDistribution = amount(summary, ['pending_distribution', 'pending_distribution_usd']);
  const roi = amount(summary, ['lifetime_roi', 'roi_percentage', 'roi']);
  const availableBalance = liveBalance;
  const name = first(record(user), ['name', 'first_name'], 'Investor');
  const firstName = name.split(/\s+/)[0] || 'Investor';
  const greeting = 'Hi';
  const opportunities = list(projects.data);
  const featuredOpportunities = opportunities.slice(0, 3);
  const dashboardActivity = list(data.recent_activity ?? data.recent_transactions ?? data.activity);
  const activitySource = dashboardActivity.length ? dashboardActivity : list(transactions.data);
  const recent = latestRecords(mergeDepositRequests(activitySource, list(deposits.data)), activityDateFields, 3);
  const activityLoading = recent.length === 0 && (dashboard.isLoading || transactions.isLoading || deposits.isLoading);
  const activityError = recent.length === 0 && !activityLoading && (dashboard.isError || transactions.isError || deposits.isError);
  const activityErrorDetail = deposits.isError ? deposits.error : transactions.isError ? transactions.error : dashboard.error;
  const payouts = list(data.upcoming_payouts);
  const investmentItems = latestRecords(list(investments.data), investmentDateFields, 1);
  const dashboardAlerts = list(data.notifications);
  const notificationFeed = list(notificationsQuery.data);
  const notificationSource = notificationFeed.length ? notificationFeed : dashboardAlerts;
  const unreadNotificationCount = notificationSource.filter(isInvestorNotificationUnread).length;
  const recentAlerts = (dashboardAlerts.length ? dashboardAlerts : notificationFeed).slice(0, 3);
  const monthlyProfitHistory = list(data.profit_monthly);
  const allocation: AllocationSlice[] = list(data.allocation).flatMap(item => {
    const value = amount(item, ['value', 'percentage', 'share']);
    return [{ name: first(item, ['name', 'label', 'category'], '—'), value: value ?? 0 }];
  });
  const benchmarkSeries = record(data.benchmark_series);
  const benchmarkAvailable = data.benchmark_available === true;
  const displayMoney = (value: number | null, unit = currency) =>
    balanceHidden ? '••••••' : dashboard.isError ? 'Unavailable' : money(value, unit || 'USD');
  const displayRoi = balanceHidden ? '••••' : dashboard.isError ? 'Unavailable' : roi == null ? '—' : `${roi.toFixed(2)}%`;
  const metricMoney = (value: number | null, unit = currency) =>
    dashboard.isLoading ? '…' : dashboard.isError ? 'Unavailable' : displayMoney(value, unit);
  const metricMoneyFromSummary = (sourceKey: string, usdKey?: string) => {
    if (dashboard.isLoading) return '…';
    if (dashboard.isError) return 'Unavailable';
    const localValue = amount(summary, [sourceKey]);
    if (localValue != null) return displayMoney(localValue, currency || 'USD');
    return displayMoney(usdKey ? amount(summary, [usdKey]) : null, 'USD');
  };
  const metricCount = (value: number | null) => dashboard.isLoading ? '…' : dashboard.isError ? 'Unavailable' : value == null ? '—' : String(value);
  const openDashboardHistory = (scope: DashboardHistoryScope) => {
    router.push({
      pathname: '/account/transactions',
      params: dashboardHistoryParams(scope),
    });
  };
  const alertsLoading = notificationsQuery.isLoading && dashboardAlerts.length === 0;
  const alertsError = notificationsQuery.isError && dashboardAlerts.length === 0;
  const metricItems: DashboardMetricItem[] = [
    { label: 'Total Deposits', value: metricMoneyFromSummary('total_deposits', 'total_deposits_usd'), icon: 'arrow-down-left', detail: metricCount(amount(summary, ['total_deposits_count'])), onPress: () => openDashboardHistory('total-deposits') },
    { label: 'Pending Deposits', value: metricMoney(amount(summary, ['pending_deposits_amount', 'pending_deposits'])), icon: 'clock', detail: metricCount(amount(summary, ['pending_deposits_count'])), onPress: () => openDashboardHistory('pending-deposits') },
    { label: 'Total Withdrawals', value: metricMoneyFromSummary('total_withdrawals', 'total_withdrawals_usd'), icon: 'arrow-up-right', detail: metricCount(amount(summary, ['total_withdrawals_count'])), onPress: () => openDashboardHistory('total-withdrawals') },
    { label: 'Pending Withdrawals', value: metricMoneyFromSummary('pending_withdrawals_amount', 'pending_withdrawals_amount_usd'), icon: 'clock', detail: metricCount(amount(summary, ['pending_withdrawals_count'])), onPress: () => openDashboardHistory('pending-withdrawals') },
    { label: 'Total Investments', value: metricMoney(investedCapital, investedCapitalCurrency), icon: 'briefcase', detail: metricCount(amount(summary, ['investments_count'])), onPress: () => openDashboardHistory('total-investments') },
    { label: 'Active Investments', value: metricMoney(activeInvestment, activeInvestmentCurrency), icon: 'activity', detail: metricCount(amount(summary, ['active_investments_count'])), onPress: () => openDashboardHistory('active-investments') },
    { label: 'Total Profit Earned', value: metricMoney(netReturns, netReturnsCurrency), icon: 'trending-up', onPress: () => openDashboardHistory('total-profit-earned') },
    { label: 'Monthly Profit', value: metricMoney(monthlyProfit, monthlyProfitCurrency), icon: 'bar-chart-2', onPress: () => openDashboardHistory('monthly-profit') },
    { label: 'Lifetime ROI', value: dashboard.isLoading ? '…' : balanceHidden ? '••••' : dashboard.isError ? 'Unavailable' : roi == null ? '—' : `${roi.toFixed(2)}%`, icon: 'activity', onPress: () => openDashboardHistory('lifetime-roi') },
    { label: 'Completed Transactions', value: metricCount(amount(summary, ['completed_transactions'])), icon: 'check-circle', onPress: () => openDashboardHistory('completed-transactions') },
    { label: 'Available Balance', value: metricMoney(availableBalance, currency || 'USD'), icon: 'credit-card', onPress: () => openDashboardHistory('available-balance') },
    { label: 'Pending Distributions', value: metricMoney(pendingDistribution), icon: 'calendar', onPress: () => openDashboardHistory('pending-distributions') },
  ];
  const verificationItems = [
    { label: 'KYC', value: first(data, ['kyc_status'], '—') },
    { label: 'AML', value: first(data, ['aml_status'], '—') },
    { label: 'Tax Documents', value: first(data, ['tax_document_status', 'tax_documents_status'], '—') },
  ];
  const groupedTransactions = recent.reduce<{ label: string; items: Record<string, unknown>[] }[]>((groups, item) => {
    const label = transactionGroup(activityDate(item));
    const existing = groups.find(group => group.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
    return groups;
  }, []);
  const quickActions = [
    { title: 'Deposit Funds', shortTitle: 'Deposit Funds', icon: 'plus' as const, onPress: () => router.push('/wallet/deposit') },
    { title: 'Invest Now', shortTitle: 'Invest Now', icon: 'trending-up' as const, onPress: () => router.push('/(tabs)/opportunities') },
    { title: 'Withdraw Funds', shortTitle: 'Withdraw Funds', icon: 'arrow-up-right' as const, onPress: () => router.push('/wallet/withdraw') },
    { title: 'View Portfolio', shortTitle: 'View Portfolio', icon: 'pie-chart' as const, onPress: () => router.push('/(tabs)/portfolio') },
  ];
  const refreshDashboard = async () => {
    if (refreshing) return;
    setRefreshing(true);
    motionHaptic('micro');
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
    ? { boxShadow: `0 8px 20px ${colors.shadow}` }
    : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 7 };

  return <View style={{ flex:  1, backgroundColor: colors.background }}>
  <ScrollView
    contentInsetAdjustmentBehavior="never"
    refreshControl={<RefreshControl
      testID="home-pull-to-refresh"
      refreshing={refreshing}
      onRefresh={() => void refreshDashboard()}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
    />}
    style={{ flex: 1, backgroundColor: 'transparent' }}
    contentContainerStyle={{
      paddingTop: 0,
      paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 112,
      paddingHorizontal: 18,
    }}
    showsVerticalScrollIndicator={false}
  >
    <MotionReveal>
    <LinearGradient
       colors={[colors.balanceCardEnd, colors.balanceCardStart]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
       style={{
         overflow: 'hidden',
         marginHorizontal: -18,
         paddingHorizontal: 21,
          paddingTop: Platform.OS === 'web'
            ? 79
            : insets.top + (Platform.OS === 'ios' ? 10 : 16),
         paddingBottom: 45,
         borderBottomLeftRadius: 30,
         borderBottomRightRadius: 30,
       }}
    >
       <View pointerEvents="none" style={{ position: 'absolute', top: 88, right: -126, width: 250, height: 250, borderRadius: 125, borderWidth: 1, borderColor: 'rgba(248, 251, 248, 0.075)' }} />
       <View pointerEvents="none" style={{ position: 'absolute', top: 66, right: -148, width: 294, height: 294, borderRadius: 147, borderWidth: 1, borderColor: 'rgba(248, 251, 248, 0.018)' }} />
       <View style={{ position: 'relative', zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
         <Pressable testID="home-account-menu" accessibilityRole="button" accessibilityLabel="Open account menu" hitSlop={8} onPress={() => setAccountMenuOpen(true)}
           style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(248, 251, 248, 0.4)', backgroundColor: 'rgba(248, 251, 248, 0.11)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
           <MaterialCommunityIcons name="bank-outline" size={19} color={colors.accent} />
         </Pressable>
         <View style={{ flex: 1, minWidth: 0 }}>
           <Text numberOfLines={1} style={{ color: colors.balanceCardText, fontSize: 14, fontWeight: '700' }}>{greeting}, {firstName}</Text>
           <Text style={{ color: colors.balanceCardText, opacity: 0.76, fontSize: 10, marginTop: 2 }}>Good morning</Text>
         </View>
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable testID="home-notifications" accessibilityRole="button"
              accessibilityLabel={unreadNotificationCount > 0 ? `Open notifications, ${unreadNotificationCount} unread` : 'Open notifications'}
              accessibilityHint="View account and investment updates"
              hitSlop={8} onPress={() => router.push('/account/notifications')}
             style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(248, 251, 248, 0.16)', backgroundColor: 'rgba(248, 251, 248, 0.12)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
              <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="bell" size={17} color={colors.balanceCardText} />
                {unreadNotificationCount > 0 ? <View
                  testID="home-notification-count"
                  style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, borderWidth: 1, borderColor: colors.balanceCardStart, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text numberOfLines={1} style={{ color: colors.accentForeground, fontSize: 8, lineHeight: 11, fontWeight: '700' }}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View> : null}
              </View>
           </Pressable>
           <Pressable testID="home-settings" accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={8} onPress={() => router.push('/account/settings')}
             style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(248, 251, 248, 0.16)', backgroundColor: 'rgba(248, 251, 248, 0.12)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.76 : 1 })}>
             <Feather name="settings" size={17} color={colors.balanceCardText} />
           </Pressable>
         </View>
       </View>

       <Pressable testID="home-account-selector" accessibilityRole="button" accessibilityLabel="Open investor account menu" onPress={() => setAccountMenuOpen(true)}
         style={({ pressed }) => ({ position: 'relative', zIndex: 1, alignSelf: 'center', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 19, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(248, 251, 248, 0.2)', borderRadius: 999, backgroundColor: 'rgba(248, 251, 248, 0.11)', opacity: pressed ? 0.82 : 1 })}>
         <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
         <Text style={{ color: colors.balanceCardText, fontSize: 11, fontWeight: '700' }}>Investor account</Text>
         <Feather name="chevron-down" size={14} color={colors.balanceCardText} />
       </Pressable>

       <View style={{ position: 'relative', zIndex: 1, alignItems: 'center', marginTop: 20 }}>
         <View style={{ minHeight: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
           <Text style={{ color: colors.balanceCardText, opacity: 0.78, fontSize: 12 }}>Available balance</Text>
           <Feather name="help-circle" size={13} color={colors.balanceCardText} />
         </View>
         <Pressable testID="home-toggle-sensitive-values" accessibilityRole="button" accessibilityLabel={balanceHidden ? 'Show account balances' : 'Hide account balances'}
           onPress={() => setBalanceHidden(current => !current)} hitSlop={8}
           style={({ pressed }) => ({ position: 'absolute', top: -2, right: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248, 251, 248, 0.12)', opacity: pressed ? 0.72 : 1 })}>
           <Feather name={balanceHidden ? 'eye-off' : 'eye'} size={15} color={colors.balanceCardText} />
         </Pressable>
         <Text testID="home-available-balance" numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.balanceCardText, fontSize: 40, fontWeight: '700', letterSpacing: -0.9, lineHeight: 45, marginTop: 5, textAlign: 'center' }}>
            {dashboard.isLoading ? '…' : displayMoney(availableBalance, 'USD')}
         </Text>
         {dashboard.isError ? <Text style={{ color: colors.balanceCardText, opacity: 0.7, fontSize: 10, marginTop: 4 }}>
           Balance details unavailable right now
         </Text> : null}
       </View>
    </LinearGradient>
    </MotionReveal>

    <View style={{ marginHorizontal: -18, paddingHorizontal: 20, paddingTop: 1, backgroundColor: colors.background }}>
    <MotionReveal delay={MOTION.revealStagger}>
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 9, paddingHorizontal: 8, marginTop: -31, marginBottom: 20, zIndex: 2 }, dockShadow]}>
      {quickActions.map((action, index) => {
        const isPrimary = action.title === 'Deposit Funds';
        return (
        <Pressable key={action.title} testID={`home-action-${index}`} accessibilityRole="button" accessibilityLabel={action.title} onPress={action.onPress}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 67,
            borderRadius: 15,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingHorizontal: 1,
            opacity: pressed ? 0.8 : 1,
          })}>
          <View style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isPrimary ? colors.primary : colors.lightGreen,
          }}>
            <Feather name={action.icon} size={17} color={isPrimary ? colors.primaryForeground : colors.primary} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{
            color: colors.mutedForeground,
            fontSize: 9,
            lineHeight: 11,
            fontWeight: '700',
            textAlign: 'center',
          }}>{action.shortTitle}</Text>
        </Pressable>
        );
      })}
    </View>
    </MotionReveal>

    {dashboard.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4, paddingVertical: 5 }}>
      <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>Portfolio data is unavailable.</Text>
      <Pressable accessibilityRole="button" onPress={() => void dashboard.refetch()}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Try again</Text></Pressable>
    </View> : null}

    <HomeSection title="Account Overview" />
    <MotionReveal delay={MOTION.revealStagger * 2}>
    <View style={{ gap: 9 }}>
      {Array.from({ length: Math.ceil(metricItems.length / 2) }, (_, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap: 9 }}>
          {metricItems.slice(rowIndex * 2, rowIndex * 2 + 2).map(item => <DashboardMetric key={item.label} item={item} />)}
        </View>
      ))}
    </View>
    </MotionReveal>

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
      const tradeId = first(position, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code'], '—'));
      const tradeLabel = tradeId === '—' || /^trade\s*#/i.test(tradeId) ? tradeId : `Trade #${tradeId}`;
      const title = first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(position, ['project_name', 'title', 'name'], '—'));
      const origin = first(position, ['origin', 'origin_country', 'from_country'], first(trade, ['origin', 'origin_country', 'from_country', 'country_of_origin']));
      const destination = first(position, ['destination', 'destination_country', 'to_country'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market']));
      const route = origin && destination ? `${origin} → ${destination}` : '—';
      const containerStatus = first(position, ['container_status', 'shipment_status', 'trade_status'], first(trade, ['container_status', 'shipment_status', 'trade_status'], '—'));
      const eta = first(position, ['estimated_arrival', 'eta'], first(trade, ['estimated_arrival', 'eta'], '—'));
      const progress = amount(position, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage'])
        ?? amount(trade, ['trade_progress_percent', 'trade_progress_pct', 'progress_percentage']);
      const boundedProgress = progress == null ? null : Math.max(0, Math.min(100, progress));
      const investmentAmount = amount(position, ['amount', 'investment_amount', 'principal']);
      const positionId = first(position, ['investment_id', 'id'], '');
      const positionCurrency = first(position, ['currency'], first(trade, ['currency'], currency));
      return <MotionReveal key={positionId || `${tradeId}-${index}`} delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}>
      <Card style={{ borderRadius: 22, padding: 18 }}>
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
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 5 }}>{displayMoney(investmentAmount, positionCurrency || 'USD')}</Text>
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
          <MotionProgress value={boundedProgress} height={6} color={colors.primary} trackColor={colors.secondary} accessibilityLabel="Trade cycle progress" />
        </View> : <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 12 }}>Trade cycle progress has not been provided.</Text>}
        <Pressable testID={`home-track-trade-${index}`} accessibilityRole="button" accessibilityLabel={`Track ${title}`} disabled={!positionId} onPress={() => router.push({ pathname: '/position/[id]', params: { id: positionId } })}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 42, borderRadius: 12, backgroundColor: positionId ? colors.primary : colors.secondary, marginTop: 14, opacity: pressed ? 0.82 : 1 })}>
          <Text style={{ color: positionId ? colors.primaryForeground : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>Track Trade</Text>
          <Feather name="arrow-up-right" size={14} color={positionId ? colors.primaryForeground : colors.mutedForeground} />
        </Pressable>
      </Card>
      </MotionReveal>;
    })}

    <HomeSection title="Portfolio Performance" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Portfolio</Text></Pressable>} />
    <MotionReveal delay={MOTION.revealStagger * 3}><PortfolioHistoryCard points={series.points} currency={currency} loading={dashboard.isLoading} compact hideValues={balanceHidden} /></MotionReveal>

    <HomeSection title="Recent Transactions" right={<Pressable accessibilityRole="button" onPress={() => router.push('/account/transactions')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {activityError ? <ErrorState message="Recent activity could not be loaded." error={activityErrorDetail} onRetry={() => {
      void dashboard.refetch();
      void transactions.refetch();
      void deposits.refetch();
    }} /> : null}
    {activityLoading ? <LoadingCard label="Loading recent activity…" /> : null}
    {!activityLoading && !activityError && recent.length === 0 ? <EmptyState title="No recent activity" body="Investments, deposits, withdrawals, distributions and trade status updates will appear here when returned by OG Exports." /> : null}
    {groupedTransactions.map(group => <View key={group.label}>
      <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 1, fontWeight: '700', marginTop: 8, marginBottom: 2 }}>{group.label}</Text>
      {group.items.map((item, index) => {
        const rowCurrency = first(item, ['currency'], currency);
        const kind = activityLabel(item);
         const date = activityDate(item) || 'Date unavailable';
        const rowAmount = amount(item, ['amount', 'total']);
        const transactionId = first(item, ['id', 'transaction_id', 'reference']);
         const isDepositRequest = item.activity_source === 'deposit_request';
         const depositId = first(item, ['id', 'deposit_id', 'depositId', 'reference', 'deposit_reference']);
        const investmentId = first(item, ['investment_id', 'investmentId']);
        const detailTarget = resolveActivityTransactionTarget(item);
         const searchValue = isDepositRequest
           ? first(item, ['reference', 'deposit_reference', 'bank_reference', 'transfer_reference', 'id'], kind)
           : transactionId || kind;
        return <MotionReveal key={transactionId || `${group.label}-${index}`} delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${kind} details`} onPress={() => {
          if (detailTarget && detailTarget.kind !== 'wallet') {
            router.push({ pathname: '/account/transaction/[id]', params: { id: detailTarget.id, kind: detailTarget.kind } });
            return;
          }
          if (kind.toLowerCase().includes('investment') && investmentId) {
            router.push({ pathname: '/position/[id]', params: { id: investmentId } });
            return;
          }
          if (detailTarget) {
            router.push({ pathname: '/account/transaction/[id]', params: { id: detailTarget.id, kind: 'wallet' } });
            return;
          }
          router.push({
            pathname: '/account/transactions',
            params: { tab: isDepositRequest ? 'Deposits' : 'Wallet', search: searchValue, selected: isDepositRequest && depositId ? `deposit:${depositId}` : transactionId },
          });
        }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, opacity: pressed ? 0.78 : 1 })}>
          <View style={{ width: 40, height: 40, borderRadius: 22, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={activityIcon(item)} size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{kind}</Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{transactionDate(date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{displayMoney(rowAmount, rowCurrency || 'USD')}</Text>
            <Status value={first(item, ['status'], '—')} />
          </View>
        </Pressable></MotionReveal>;
      })}
    </View>)}

    <HomeSection title="Featured opportunities" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>See all</Text></Pressable>} />
    {projects.isError ? <ErrorState message="Trade opportunities could not be loaded." error={projects.error} onRetry={() => void projects.refetch()} /> : null}
    {projects.isLoading ? <LoadingCard label="Loading available opportunities…" /> : null}
    {!projects.isLoading && !projects.isError && opportunities.length === 0 ? <EmptyState title="No available opportunities" body="Trade opportunities will appear here when provided by OG Exports." /> : null}
    {featuredOpportunities.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
      {featuredOpportunities.map((item, index) => {
        const id = first(item, ['id', 'project_id'], '');
        return <MotionReveal key={id || index} delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}><Pressable disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
          <Card style={{ width: 250, minHeight: 132, marginBottom: 5, borderRadius: 20, padding: 17 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}><Feather name="briefcase" size={16} color={colors.primary} /></View>
              <Status value={first(item, ['status', 'state'], '—')} />
            </View>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 13 }}>{first(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade opportunity')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontSize: 11 }}>{first(item, ['destination', 'destination_country', 'type', 'category', 'location'], '—')}</Text>
              <Feather name="arrow-up-right" size={14} color={colors.primary} />
            </View>
          </Card>
        </Pressable></MotionReveal>;
      })}
    </ScrollView> : null}

    <RecentAlertsPreview
      records={recentAlerts}
      loading={alertsLoading}
      error={alertsError}
      onRetry={() => void notificationsQuery.refetch()}
    />

    <HomeSection title="Portfolio insights" right={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/portfolio')}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Portfolio</Text></Pressable>} />
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
        <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{first(item, ['project_name', 'title', 'description'], 'Investment payout')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(item, ['payout_date', 'date', 'due_date'], '—')}</Text></View>
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{displayMoney(amount(item, ['amount', 'payout_amount']), payoutCurrency || 'USD')}</Text>
      </Card>;
    }) : <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderStyle: 'dashed' }}>
      <Feather name="calendar" size={18} color={colors.accent} />
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Payout schedule</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 4 }}>Upcoming payout details have not been reported.</Text></View>
    </Card>}
    </View>
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
        width: '84%',
        maxWidth: 340,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRightWidth: 1,
        borderTopRightRadius: 26,
        borderBottomRightRadius: 26,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 17,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={require('../../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 38, height: 38 }} />
            <View>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }}>OG Exports</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginTop: 2 }}>INVESTOR PORTAL</Text>
            </View>
          </View>
          <Pressable testID="home-menu-close" accessibilityRole="button" accessibilityLabel="Close navigation menu" hitSlop={8} onPress={() => setAccountMenuOpen(false)}
            style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
            <Feather name="x" size={19} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <ScrollView
          testID="home-navigation-menu"
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {accountMenuSections.map((section) => (
            <View key={section.title} style={{ marginTop: 14 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6, paddingHorizontal: 8 }}>
                {section.title}
              </Text>
              {section.items.map((item) => (
                <Pressable
                  key={item.key}
                  testID={`home-menu-${item.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.label}`}
                  onPress={() => {
                    setAccountMenuOpen(false);
                    router.push(item.href as never);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 43,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    backgroundColor: pressed ? colors.secondary : 'transparent',
                    opacity: pressed ? 0.82 : 1,
                  })}
                >
                  <Feather name={item.icon} size={17} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '500' }}>{item.label}</Text>
                  <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Close navigation menu" onPress={() => setAccountMenuOpen(false)} style={{ flex: 1 }} />
    </View>
  </Modal>
  </View>;
}
