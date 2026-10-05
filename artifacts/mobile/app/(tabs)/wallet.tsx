import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetInvestorWallet, useGetInvestorWalletTransactions } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, LoadingCard, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, type Json } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

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
  if (!value) return 'Type not provided';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function displayDate(value: string) {
  if (!value) return 'Date not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function balanceLabel(value: number | null, currency: string, loading: boolean, error: boolean) {
  if (loading) return 'Loading…';
  if (error) return 'Unavailable';
  if (value == null) return 'Unavailable';
  return currency ? money(value, currency) : 'Currency unavailable';
}

export default function Wallet() {
  const { token } = useAuth();
  const colors = useColors();
  const [category, setCategory] = useState<WalletCategory>('All');
  const wallet = useGetInvestorWallet({
    query: { queryKey: ['investor-wallet'], enabled: Boolean(token), staleTime: 30_000 },
  });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: pageSize }, {
    query: { queryKey: ['investor-wallet-transactions', 1, pageSize], enabled: Boolean(token), staleTime: 30_000 },
  });

  const walletData = record(record(wallet.data).data ?? wallet.data);
  const currency = first(walletData, ['currency', 'default_currency']).toUpperCase();
  const available = amount(walletData, ['available_balance']);
  const allocated = amount(walletData, ['allocated_to_trades', 'allocated_balance']);
  const pending = amount(walletData, ['pending_balance']);
  const withdrawable = amount(walletData, ['withdrawable_balance', 'withdrawable_amount']);

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
    { label: 'Withdrawable', value: withdrawable },
  ];

  return <Screen title="Wallet" subtitle="Your account balance and wallet activity" refreshable>
    <LinearGradient
      colors={[colors.primary, colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22, padding: 21, marginBottom: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.9 }}>OG EXPORTS WALLET</Text>
        <Feather name="credit-card" size={21} color={colors.primaryForeground} />
      </View>
      <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginTop: 26 }}>AVAILABLE BALANCE</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.primaryForeground, fontSize: 33, fontWeight: '700', marginTop: 7 }}>
        {balanceLabel(available, currency, wallet.isLoading, wallet.isError)}
      </Text>
      <Text style={{ color: colors.primaryForeground, fontSize: 11, opacity: 0.82, marginTop: 7 }}>
        {currency ? `${currency} account` : 'Account currency not provided by OG Exports'}
      </Text>
    </LinearGradient>

    <Section title="Balance Breakdown" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {balanceMetrics.map(metric => {
        const unavailable = !wallet.isLoading && !wallet.isError && metric.value == null;
        return <Card key={metric.label} style={{ width: '48%', minHeight: 91, padding: 13, marginBottom: 0 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{metric.label}</Text>
          <Text numberOfLines={2} adjustsFontSizeToFit style={{ color: metric.value == null ? colors.mutedForeground : colors.foreground, fontSize: metric.value == null ? 12 : 15, fontWeight: '700', marginTop: 8 }}>
            {balanceLabel(metric.value, currency, wallet.isLoading, wallet.isError)}
          </Text>
          {unavailable ? <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 3 }}>Not returned by OG Exports</Text> : null}
        </Card>;
      })}
    </View>
    {wallet.isError ? <ErrorState message="Wallet balance could not be loaded from OG Exports." error={wallet.error} onRetry={() => void wallet.refetch()} /> : null}

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
      const id = first(item, ['transaction_id', 'reference', 'id'], 'Transaction ID not provided');
      const rawType = first(item, ['type', 'transaction_type', 'category']);
      const date = displayDate(first(item, ['created_at', 'date']));
      const status = first(item, ['status', 'state'], 'Not provided');
      const value = amount(item, ['amount']);
      const itemCurrency = first(item, ['currency'], currency).toUpperCase();
      const itemCategory = categoryFor(item);
      const icon = itemCategory === 'Withdrawals' ? 'arrow-up-right'
        : itemCategory === 'Investments' ? 'briefcase'
          : itemCategory === 'Distributions' ? 'trending-up' : 'arrow-down-left';
      return <Card key={`${id}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 }}>
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
            {value != null && itemCurrency ? money(value, itemCurrency) : 'Amount unavailable'}
          </Text>
          <Status value={status} />
        </View>
      </Card>;
    })}
    {hasMoreTransactions ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 2 }}>
      Categories above use the latest {ledger.length}{totalTransactions != null ? ` of ${totalTransactions}` : ''} transactions. Choose View All to browse older records.
    </Text> : null}
    {!transactions.isLoading && !transactions.isError ? <Action title="View All Transactions" icon="list" secondary onPress={() => router.push('/account/transactions')} /> : null}
  </Screen>;
}