import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorWallet, useGetInvestorWalletTransactions } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Wallet() {
  const { token } = useAuth();
  const colors = useColors();
  const wallet = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token, staleTime: 30_000 } });
  const transactions = useGetInvestorWalletTransactions({ page: 1, per_page: 10 }, { query: { queryKey: ['investor-wallet-transactions', 1, 10], enabled: !!token, staleTime: 30_000 } });
  const data = wallet.data && typeof wallet.data === 'object' ? wallet.data as Record<string, unknown> : {};
  const inner = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : data;
  const currency = first(inner, ['currency', 'default_currency']);
  const balance = amount(inner, ['available_balance', 'balance', 'available']);
  const investedBalance = amount(inner, ['invested_balance', 'investment_balance']);
  const pendingBalance = amount(inner, ['pending_balance', 'pending_amount']);
  const rows = list(transactions.data);
  return <Screen title="Wallet" subtitle="Balances, deposits and withdrawals">
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, padding: 20 }}>
      <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>AVAILABLE BALANCE</Text>
      <Text style={{ color: colors.primaryForeground, fontSize: 32, fontWeight: '700', marginTop: 8 }}>{wallet.isLoading ? '…' : balance != null && currency ? money(balance, currency) : '—'}</Text>
      <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12, marginTop: 8 }}>{currency ? `${currency} wallet` : 'Account currency unavailable'}</Text>
    </Card>
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {[['Invested balance', investedBalance], ['Pending balance', pendingBalance]].map(([label, value]) => <Card key={String(label)} style={{ flex: 1, padding: 13 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{String(label)}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 7 }}>{value != null && currency ? money(value, currency) : '—'}</Text>
      </Card>)}
    </View>
    {wallet.isError ? <ErrorState message="Wallet balance could not be loaded." onRetry={() => void wallet.refetch()} /> : null}
    <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Action title="Add funds" icon="plus" onPress={() => router.push('/wallet/deposit')} /></View><View style={{ flex: 1 }}><Action title="Withdraw" icon="arrow-up-right" secondary onPress={() => router.push('/wallet/withdraw')} /></View></View>
    <Section title="Recent activity" right={<Pressable onPress={() => void transactions.refetch()}><Feather name="refresh-cw" size={15} color={colors.primary} /></Pressable>} />
    {transactions.isError ? <ErrorState message="Wallet activity could not be loaded." onRetry={() => void transactions.refetch()} /> : null}
    {!transactions.isLoading && !transactions.isError && rows.length === 0 ? <EmptyState title="No transactions yet" body="Your deposits, withdrawals and investment activity will appear here." /> : null}
    {rows.map((item, i) => <Card key={first(item, ['id', 'reference'], String(i))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Feather name={/withdraw/i.test(first(item, ['type', 'transaction_type'])) ? 'arrow-up-right' : 'arrow-down-left'} size={17} color={colors.primary} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['description', 'type', 'transaction_type'], 'Transaction')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(item, ['created_at', 'date'], '')}</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['currency'], currency) ? money(amount(item, ['amount', 'total']), first(item, ['currency'], currency)) : '—'}</Text><Status value={first(item, ['status'], '—')} /></View>
    </Card>)}
  </Screen>;
}