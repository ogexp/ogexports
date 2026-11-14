import { BalanceGlass } from '@/components/BalanceGlass';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetInvestorDashboard, useGetInvestorDeposits, useGetInvestorWallet, useGetInvestorWalletTransactions } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, LoadingCard, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, availableBalanceFromDashboard, first, list, money, record, unwrap, walletCurrencyFromSources, type Json } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MotionReveal } from '@/lib/motion';
import { mergeDepositRequests, resolveActivityTransactionTarget } from '@/lib/deposit-activity';
import { latestRecords } from '@/lib/latest-records';

type WalletCategory = 'All' | 'Deposits' | 'Investments' | 'Withdrawals' | 'Distributions';
const walletCategories: WalletCategory[] = ['All', 'Deposits', 'Investments', 'Withdrawals', 'Distributions'];
const pageSize = 100;
const recentLimit = 5;

function categoryFor(item: Json): Exclude<WalletCategory, 'All'> | null {
  const type = `${first(item, ['type', 'transaction_type', 'category'])} ${first(item, ['description', 'title'])}`.toLowerCase();
  if (/distribution|profit|dividend|bonus/.test(type)) return 'Distributions';
  if (/deposit|top.?up|funding/.test(type)) return 'Deposits';
  if (/invest|purchase|participation/.test(type)) return 'Investments';
  if (/withdraw|payout/.test(type)) return 'Withdrawals';
  return null;
}

function humanizeType(value: string) {
  if (!value) return '—';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function displayDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function balanceLabel(value: number | null, currency: string, loading: boolean, error: boolean) {
  if (loading) return 'Loading…';
  if (currency !== 'USD') return 'Unavailable';
  if (error && value == null) return 'Unavailable';
  if (value == null) return money(null, 'USD');
  return money(value, 'USD');
}

export default function Wallet() {
  const { token } = useAuth();
  const colors = useColors();
  const [category, setCategory] = useState<WalletCategory>('All');
  const wallet = useGetInvestorWallet({
    query: { queryKey: ['investor-wallet'], enabled: Boolean(token), staleTime: 30_000 },
  });
  const dashboard = useGetInvestorDashboard({
    query: { queryKey: ['investor-dashboard'], enabled: Boolean(token), staleTime: 30_000 },
  });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: pageSize }, {
    query: { queryKey: ['investor-wallet-transactions', 1, pageSize], enabled: Boolean(token), staleTime: 30_000 },
  });
  const deposits = useGetInvestorDeposits({ page: 1, per_page: pageSize }, {
    query: { queryKey: ['investor-deposits', 1, pageSize], enabled: Boolean(token), staleTime: 30_000 },
  });
  const refreshWallet = React.useCallback(async () => {
    if (!token) return;
    await Promise.all([
      wallet.refetch({ cancelRefetch: false }),
      dashboard.refetch({ cancelRefetch: false }),
      transactions.refetch({ cancelRefetch: false }),
      deposits.refetch({ cancelRefetch: false }),
    ]);
  }, [token, wallet.refetch, dashboard.refetch, transactions.refetch, deposits.refetch]);
  useFocusEffect(React.useCallback(() => {
    void refreshWallet();
  }, [refreshWallet]));

  const walletData = record(record(wallet.data).data ?? wallet.data);
  const currency = walletCurrencyFromSources(walletData, dashboard.data);
  const walletCurrencyLoading = (wallet.isLoading || wallet.isFetching)
    && !first(walletData, ['currency', 'default_currency']);
  const usdWalletReady = currency === 'USD' && !walletCurrencyLoading;
  const available = availableBalanceFromDashboard(dashboard.data);
  const allocated = amount(walletData, ['allocated_to_trades', 'allocated_balance']);
  const pendingDeposits = amount(record(unwrap(dashboard.data).summary), ['pending_deposits_amount', 'pending_deposits']);
  const withdrawable = available;

  const ledger = mergeDepositRequests(list(transactions.data), list(deposits.data));
  const filteredLedger = category === 'All'
    ? ledger
    : ledger.filter(item => categoryFor(item) === category);
  const visibleTransactions = latestRecords(filteredLedger, ['created_at', 'date', 'submitted_at'], recentLimit);
  const activityLoading = transactions.isLoading || deposits.isLoading;
  const activityError = transactions.isError || deposits.isError;
  const activityFetching = transactions.isFetching || deposits.isFetching;

  const balanceMetrics = [
    { label: 'Available', value: available },
    { label: 'Allocated to Trades', value: allocated },
    { label: 'Pending Deposits', value: pendingDeposits },
    { label: 'Withdrawable Balance', value: withdrawable },
  ];

  return <Screen title="Wallet" subtitle="Your account balance and wallet activity" refreshable>
    <LinearGradient
      testID="wallet-balance-card"
      colors={[colors.balanceCardStart, colors.balanceCardEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 22,
        padding: 21,
        marginBottom: 12,
        overflow: 'hidden',
        minHeight: 168,
        justifyContent: 'space-between',
      }}
    >
      <BalanceGlass radius={22} />
      <View
        accessible={false}
        style={{
          position: 'absolute',
          width: 156,
          height: 156,
          borderRadius: 78,
          borderWidth: 1,
          borderColor: colors.balanceCardText,
          opacity: 0.09,
          top: -67,
          right: -24,
        }}
      />
      <View
        accessible={false}
        style={{
          position: 'absolute',
          width: 112,
          height: 112,
          borderRadius: 56,
          borderWidth: 1,
          borderColor: colors.balanceCardText,
          opacity: 0.07,
          top: -46,
          right: -2,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.balanceCardText, fontSize: 11, fontWeight: '700', letterSpacing: 1.15 }}>OG EXPORTS WALLET</Text>
        <Feather name="credit-card" size={20} color={colors.accent} />
      </View>
      <View style={{ height: 1, width: 34, backgroundColor: colors.accent, opacity: 0.8, marginTop: 25 }} />
      {usdWalletReady || dashboard.isLoading || dashboard.isError || walletCurrencyLoading ? <>
        <Text style={{ color: colors.balanceCardText, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginTop: 13, opacity: 0.9 }}>AVAILABLE BALANCE</Text>
        <MotionReveal key={balanceLabel(available, currency, dashboard.isLoading, dashboard.isError)}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.balanceCardText, fontSize: 33, fontWeight: '700', letterSpacing: -0.45, marginTop: 6 }}>
            {balanceLabel(available, currency, dashboard.isLoading || walletCurrencyLoading, dashboard.isError)}
          </Text>
        </MotionReveal>
        <Text style={{ color: colors.balanceCardText, fontSize: 11, opacity: 0.9, marginTop: 7 }}>
          {usdWalletReady ? 'USD account' : dashboard.isLoading || walletCurrencyLoading ? 'Checking wallet status' : 'Wallet status unavailable'}
        </Text>
      </> : <View style={{ marginTop: 15 }}>
        <Text style={{ color: colors.balanceCardText, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, opacity: 0.9 }}>WALLET STATUS</Text>
        <Text style={{ color: colors.balanceCardText, fontSize: 22, fontWeight: '700', marginTop: 7 }}>USD wallet setup required</Text>
        <Text style={{ color: colors.balanceCardText, fontSize: 11, opacity: 0.9, marginTop: 6 }}>Balance protected until conversion is confirmed</Text>
      </View>}
    </LinearGradient>

    {usdWalletReady ? <>
    <Section title="Quick Actions" />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}><Action title="Add Funds" icon="plus" disabled={!usdWalletReady} onPress={() => router.push('/wallet/deposit')} /></View>
      <View style={{ flex: 1 }}><Action title="Withdraw" icon="arrow-up-right" secondary disabled={!usdWalletReady} onPress={() => router.push('/wallet/withdraw')} /></View>
    </View>
    </> : null}

    {!dashboard.isLoading && !dashboard.isError && !walletCurrencyLoading && !usdWalletReady ? <Card testID="wallet-usd-conversion-pending">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="shield" size={17} color={colors.primary} />
        </View>
        <Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>Wallet conversion required</Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>
        Your existing wallet is not yet confirmed in USD. Your balance stays protected and hidden until OG Exports completes and records the conversion.
      </Text>
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 12 }}>
        <View style={{ flex: 1 }}><Action title="Refresh status" icon="refresh-cw" loading={dashboard.isFetching} onPress={() => void dashboard.refetch()} /></View>
        <View style={{ flex: 1 }}><Action title="Contact Support" icon="message-circle" secondary onPress={() => router.push('/account/messages' as never)} /></View>
      </View>
    </Card> : null}

    {usdWalletReady ? <>
    <Section title="Balance Breakdown" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {balanceMetrics.map(metric => {
        const isPendingDeposit = metric.label === 'Pending Deposits';
        const isDashboardBalance = isPendingDeposit || metric.label === 'Available' || metric.label === 'Withdrawable Balance';
        const content = <Card style={{ minHeight: 91, padding: 13, marginBottom: 0 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{metric.label}</Text>
          <Text testID={isPendingDeposit ? 'wallet-pending-deposits-amount' : metric.label === 'Withdrawable Balance' ? 'wallet-withdrawable-balance' : undefined}
            numberOfLines={2} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 8 }}>
            {balanceLabel(
              metric.value,
              currency,
              isDashboardBalance ? dashboard.isLoading : wallet.isLoading,
              isDashboardBalance ? dashboard.isError : wallet.isError,
            )}
          </Text>
        </Card>;
        return <View key={metric.label} style={{ width: '48%' }}>
          {isPendingDeposit ? <Pressable testID="wallet-open-pending-deposits" accessibilityRole="button" accessibilityLabel="View pending deposits"
            accessibilityHint="Awaiting review. Not included in your available balance."
            accessibilityValue={{ text: balanceLabel(pendingDeposits, currency, dashboard.isLoading, dashboard.isError) }}
            onPress={() => router.push({ pathname: '/account/transactions', params: { tab: 'Deposits', status: 'pending' } })}>
            {content}
          </Pressable> : content}
        </View>;
      })}
    </View>
    </> : null}
    {dashboard.isError ? <ErrorState message="Account balance could not be loaded from OG Exports." error={dashboard.error} onRetry={() => void dashboard.refetch()} /> : null}
    {wallet.isError ? <ErrorState message="Wallet breakdown could not be loaded from OG Exports." error={wallet.error} onRetry={() => void wallet.refetch()} /> : null}

    <Section title="Recent Transactions" right={<Pressable
      accessibilityRole="button"
      accessibilityLabel="Refresh wallet activity"
      accessibilityState={{ busy: activityFetching }}
      disabled={activityFetching}
      testID="refresh-wallet-history"
      onPress={() => void refreshWallet()}
      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
    ><Feather name="refresh-cw" size={15} color={colors.primary} /></Pressable>} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
      {walletCategories.map(item => {
        const selected = category === item;
        return <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          testID={`wallet-category-${item.toLowerCase()}`}
          onPress={() => setCategory(item)}
          style={{ borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: selected ? colors.primary : colors.secondary, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}
        >
          <Text style={{ color: selected ? colors.primaryForeground : colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>{item}</Text>
        </Pressable>;
      })}
    </ScrollView>

    {activityLoading ? <LoadingCard label="Loading transactions…" /> : null}
    {transactions.isError ? <ErrorState message="Wallet activity could not be loaded." error={transactions.error} onRetry={() => void transactions.refetch()} /> : null}
    {deposits.isError ? <ErrorState message="Deposit requests could not be loaded. Recent activity may be incomplete." error={deposits.error} onRetry={() => void deposits.refetch()} /> : null}
    {!activityLoading && !activityError && visibleTransactions.length === 0
      ? <EmptyState
        title={category === 'All' ? 'No transactions yet' : `No ${category.toLowerCase()} yet`}
        body="Transactions returned by OG Exports will appear here."
      />
      : null}
    {visibleTransactions.map((item, index) => {
      const id = first(item, ['id', 'transaction_id'], '—');
      const target = resolveActivityTransactionTarget(item);
      const rawType = first(item, ['type', 'transaction_type', 'category']);
      const date = displayDate(first(item, ['created_at', 'date']));
      const status = first(item, ['status', 'state'], '—');
      const value = amount(item, ['amount']);
      const itemCurrency = first(item, ['currency'], currency).toUpperCase();
      const itemCategory = categoryFor(item);
      const icon = itemCategory === 'Withdrawals' ? 'arrow-up-right'
        : itemCategory === 'Investments' ? 'briefcase'
          : itemCategory === 'Distributions' ? 'trending-up' : 'arrow-down-left';
      return <Pressable
        key={`${target?.kind || 'unknown'}-${id}-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`Open ${humanizeType(rawType)} transaction details`}
        testID={`wallet-transaction-${target?.kind || 'unknown'}-${target?.id || index}`}
        disabled={!target}
        onPress={() => {
          if (target) router.push({ pathname: '/account/transaction/[id]', params: target });
        }}
      >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{humanizeType(rawType)}</Text>
          <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>Transaction ID · {id}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>{date}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontWeight: '700', fontSize: 12 }}>
            {money(value, itemCurrency || 'USD')}
          </Text>
          <Status value={status} />
        </View>
      </Card>
      </Pressable>;
    })}
    <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 2, marginBottom: 10 }}>
      Showing up to 5 recent transactions. View all for complete history.
    </Text>
    <Action title="View All Transactions" icon="list" secondary onPress={() => router.push('/account/transactions')} />
  </Screen>;
}
