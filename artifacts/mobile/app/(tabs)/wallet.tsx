import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetInvestorDashboard, useGetInvestorWallet, useGetInvestorWalletTransactions } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, LoadingCard, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, availableBalanceFromDashboard, first, list, money, record, unwrap, walletCurrencyFromDashboard, type Json } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MotionReveal } from '@/lib/motion';

type WalletCategory = 'All' | 'Deposits' | 'Investments' | 'Withdrawals' | 'Distributions';
const walletCategories: WalletCategory[] = ['All', 'Deposits', 'Investments', 'Withdrawals', 'Distributions'];
const pageSize = 100;

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
  if (error && value == null) return 'Unavailable';
  if (value == null) return money(null, currency || 'USD');
  return money(value, currency || 'USD');
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

  const walletData = record(record(wallet.data).data ?? wallet.data);
  const currency = walletCurrencyFromDashboard(
    dashboard.data,
    first(walletData, ['currency', 'default_currency'], 'USD'),
  );
  const available = availableBalanceFromDashboard(dashboard.data);
  const allocated = amount(walletData, ['allocated_to_trades', 'allocated_balance']);
  const pending = amount(walletData, ['pending_balance']);
  const withdrawable = available;

  const ledger = list(transactions.data);
  const filteredLedger = category === 'All'
    ? ledger
    : ledger.filter(item => categoryFor(item) === category);
  const visibleTransactions = filteredLedger.slice(0, 8);
  const transactionsEnvelope = record(transactions.data);
  const nestedTransactionsEnvelope = record(transactionsEnvelope.data);
  const transactionsMeta = record(transactionsEnvelope.meta ?? nestedTransactionsEnvelope.meta);
  const totalTransactions = amount(transactionsMeta, ['total']) ?? amount(transactionsEnvelope, ['total']);
  const hasMoreTransactions = !transactions.isLoading && !transactions.isError
    && (totalTransactions != null ? totalTransactions > ledger.length : ledger.length >= pageSize);

  const balanceMetrics = [
    { label: 'Available', value: available },
    { label: 'Allocated to Trades', value: allocated },
    { label: 'Pending', value: pending },
    { label: 'Withdrawable Balance', value: withdrawable },
  ];

  return <Screen title="Wallet" subtitle="Your account balance and wallet activity" refreshable>
    <LinearGradient
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
      <Text style={{ color: colors.balanceCardText, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginTop: 13, opacity: 0.88 }}>AVAILABLE BALANCE</Text>
      <MotionReveal key={balanceLabel(available, currency, dashboard.isLoading, dashboard.isError)}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.balanceCardText, fontSize: 33, fontWeight: '700', letterSpacing: -0.45, marginTop: 6 }}>
        {balanceLabel(available, currency, dashboard.isLoading, dashboard.isError)}
      </Text>
      </MotionReveal>
      <Text style={{ color: colors.balanceCardText, fontSize: 11, opacity: 0.82, marginTop: 7 }}>
        {currency || 'USD'} account
      </Text>
    </LinearGradient>

    <Section title="Balance Breakdown" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {balanceMetrics.map(metric => {
        const isDashboardBalance = metric.label === 'Available' || metric.label === 'Withdrawable Balance';
        return <Card key={metric.label} style={{ width: '48%', minHeight: 91, padding: 13, marginBottom: 0 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{metric.label}</Text>
          <Text testID={metric.label === 'Withdrawable Balance' ? 'wallet-withdrawable-balance' : undefined}
            numberOfLines={2} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 8 }}>
            {balanceLabel(
              metric.value,
              currency,
              isDashboardBalance ? dashboard.isLoading : wallet.isLoading,
              isDashboardBalance ? dashboard.isError : wallet.isError,
            )}
          </Text>
        </Card>;
      })}
    </View>
    {dashboard.isError ? <ErrorState message="Account balance could not be loaded from OG Exports." error={dashboard.error} onRetry={() => void dashboard.refetch()} /> : null}
    {wallet.isError ? <ErrorState message="Wallet breakdown could not be loaded from OG Exports." error={wallet.error} onRetry={() => void wallet.refetch()} /> : null}

    <Section title="Quick Actions" />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}><Action title="Add Funds" icon="plus" onPress={() => router.push('/wallet/deposit')} /></View>
      <View style={{ flex: 1 }}><Action title="Withdraw" icon="arrow-up-right" secondary onPress={() => router.push('/wallet/withdraw')} /></View>
    </View>

    <Section title="Transaction History" right={<Pressable
      accessibilityRole="button"
      accessibilityLabel="Refresh transaction history"
      testID="refresh-wallet-history"
      onPress={() => void transactions.refetch()}
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

    {transactions.isLoading ? <LoadingCard label="Loading transactions…" /> : null}
    {transactions.isError ? <ErrorState message="Wallet activity could not be loaded." error={transactions.error} onRetry={() => void transactions.refetch()} /> : null}
    {!transactions.isLoading && !transactions.isError && visibleTransactions.length === 0
      ? <EmptyState
        title={category === 'All' ? 'No transactions yet' : `No ${category.toLowerCase()} yet`}
        body="Transactions returned by OG Exports will appear here."
      />
      : null}
    {visibleTransactions.map((item, index) => {
      const id = first(item, ['transaction_id', 'reference', 'id'], '—');
      const detailId = first(item, ['id', 'transaction_id']);
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
        key={`${id}-${index}`}
        accessibilityRole="button"
        accessibilityLabel={`Open ${humanizeType(rawType)} transaction details`}
        testID={`wallet-transaction-${detailId || index}`}
        disabled={!/^\d+$/.test(detailId)}
        onPress={() => router.push({ pathname: '/account/transaction/[id]', params: { id: detailId, kind: 'wallet' } })}
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
    {hasMoreTransactions ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 2 }}>
      Categories above use the latest {ledger.length}{totalTransactions != null ? ` of ${totalTransactions}` : ''} transactions. Choose View All to browse older records.
    </Text> : null}
    {!transactions.isLoading && !transactions.isError ? <Action title="View All Transactions" icon="list" secondary onPress={() => router.push('/account/transactions')} /> : null}
  </Screen>;
}
