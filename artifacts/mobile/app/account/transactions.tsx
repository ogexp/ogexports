import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetInvestorInvestments, useGetInvestorWallet, useGetInvestorWalletTransactions } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Field, Screen } from '@/components/InvestorUI';
import { amount, first, list, money, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type ActivityTab = 'Wallet' | 'Investments';
type TransactionFilter = 'All' | 'Deposits' | 'Withdrawals' | 'Investments' | 'Returns' | 'Fees';
const transactionFilters: TransactionFilter[] = ['All', 'Deposits', 'Withdrawals', 'Investments', 'Returns', 'Fees'];

function DetailLine({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{label}</Text>
    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
  </View>;
}

export default function Transactions() {
  const { token } = useAuth();
  const colors = useColors();
  const params = useLocalSearchParams<{ search?: string; tab?: string; selected?: string }>();
  const [tab, setTab] = useState<ActivityTab>(params.tab === 'Investments' ? 'Investments' : 'Wallet');
  const [filter, setFilter] = useState<TransactionFilter>('All');
  const [search, setSearch] = useState(typeof params.search === 'string' ? params.search : '');
  const [selectedId, setSelectedId] = useState(typeof params.selected === 'string' ? params.selected : '');
  const transactionsQuery = useGetInvestorWalletTransactions({ page: 1, per_page: 100 }, {
    query: { queryKey: ['investor-wallet-transactions', 1, 100], enabled: !!token, staleTime: 20_000 },
  });
  const investmentsQuery = useGetInvestorInvestments({ per_page: 50 }, {
    query: { queryKey: ['investor-positions', 50], enabled: !!token, staleTime: 30_000 },
  });
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token, staleTime: 30_000 } });
  const wallet = unwrap(walletQuery.data);
  const currency = first(wallet, ['currency']);
  const transactions = list(transactionsQuery.data);
  const investments = list(investmentsQuery.data);
  const rows = (tab === 'Wallet' ? transactions : investments).filter(item => {
    if (tab === 'Investments' || filter === 'All') return true;
    const type = `${first(item, ['type', 'transaction_type', 'category'])} ${first(item, ['description', 'title'])}`.toLowerCase();
    if (filter === 'Deposits') return /deposit|top.?up|funding/.test(type);
    if (filter === 'Withdrawals') return /withdraw|payout/.test(type);
    if (filter === 'Investments') return /invest|purchase|participation/.test(type);
    if (filter === 'Returns') return /return|profit|distribution|dividend/.test(type);
    return /fee|charge/.test(type);
  });
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(item => [
      first(item, ['reference', 'transaction_id', 'id']),
      first(item, ['type', 'transaction_type', 'category']),
      first(item, ['description', 'title', 'project_name', 'name']),
      first(item, ['status', 'state']),
      first(item, ['created_at', 'date']),
    ].join(' ').toLowerCase().includes(query));
  }, [rows, search]);
  const selected = filtered.find(item => first(item, ['id', 'transaction_id', 'reference']) === selectedId);
  const query = tab === 'Wallet' ? transactionsQuery : investmentsQuery;

  function setActivityTab(next: ActivityTab) {
    setTab(next);
    setSelectedId('');
    setFilter('All');
  }

  return <Screen title="Transaction history" subtitle="Search your wallet activity and investment records">
    <View style={{ flexDirection: 'row', backgroundColor: colors.secondary, borderRadius: 14, padding: 4, marginBottom: 14 }}>
      {(['Wallet', 'Investments'] as const).map(item => {
        const active = tab === item;
        return <Pressable key={item} onPress={() => setActivityTab(item)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: active ? colors.card : 'transparent' }}>
          <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontWeight: '700', fontSize: 13 }}>{item}</Text>
        </Pressable>;
      })}
    </View>
    {tab === 'Wallet' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
      {transactionFilters.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => { setFilter(item); setSelectedId(''); }} style={{ borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: filter === item ? colors.primary : colors.secondary, borderWidth: 1, borderColor: filter === item ? colors.primary : colors.border }}>
        <Text style={{ color: filter === item ? colors.primaryForeground : colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>{item}</Text>
      </Pressable>)}
    </ScrollView> : null}
    <Field label="Search history" value={search} onChangeText={setSearch} placeholder="Reference, project, type or status" autoCapitalize="none" />
    {walletQuery.isError && tab === 'Wallet' ? <ErrorState message="Wallet currency details could not be loaded." onRetry={() => void walletQuery.refetch()} /> : null}
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading {tab.toLowerCase()}…</Text></Card> : null}
    {query.isError ? <ErrorState message={`${tab} history could not be loaded.`} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && filtered.length === 0 ? <EmptyState title={search ? 'No matching records' : `No ${tab.toLowerCase()} yet`} body={search ? 'Try another search term.' : 'Records returned by the investor server will appear here.'} /> : null}
    {filtered.map((item, index) => {
      const id = first(item, ['id', 'transaction_id', 'reference'], String(index));
      const title = tab === 'Wallet'
        ? first(item, ['description', 'title', 'type', 'transaction_type'], 'Wallet activity')
        : first(item, ['project_name', 'title', 'name'], 'Investment');
      const status = first(item, ['status', 'state'], '—');
      const value = amount(item, ['amount', 'investment_amount', 'principal']);
      const date = first(item, ['created_at', 'date', 'created'], '');
      const active = selectedId === id;
      return <Pressable key={id} onPress={() => {
        if (tab === 'Investments') {
          const investmentId = first(item, ['id', 'investment_id'], '');
          if (investmentId) router.push({ pathname: '/position/[id]', params: { id: investmentId } });
        } else setSelectedId(active ? '' : id);
      }}>
        <Card style={{ borderColor: active ? colors.primary : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700' }}>{title}</Text>
              <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 11 }}>{first(item, ['reference', 'transaction_id'], 'Reference unavailable')}</Text>
            </View>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{first(item, ['currency'], currency) ? money(value, first(item, ['currency'], currency)) : '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{date}</Text>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{status}</Text>
          </View>
          {active && tab === 'Wallet' ? <View style={{ marginTop: 12 }}>
            <DetailLine label="Transaction ID" value={first(item, ['transaction_id', 'id'], 'Not provided')} />
            <DetailLine label="Date" value={date || 'Not provided'} />
            <DetailLine label="Type" value={first(item, ['type', 'transaction_type', 'category'], 'Not provided')} />
            <DetailLine label="Payment method" value={first(item, ['payment_method', 'method'], 'Not provided')} />
            <DetailLine label="Related investment" value={first(item, ['project_title', 'project_name', 'investment_reference'], 'Not provided')} />
            {amount(item, ['fee', 'fees', 'transaction_fee']) != null ? <DetailLine label="Fee" value={money(amount(item, ['fee', 'fees', 'transaction_fee']), first(item, ['currency'], currency))} /> : null}
            {amount(item, ['net_amount', 'received_amount', 'payout_amount']) != null ? <DetailLine label="Net amount" value={money(amount(item, ['net_amount', 'received_amount', 'payout_amount']), first(item, ['currency'], currency))} /> : null}
            {amount(item, ['balance_after']) != null ? <DetailLine label="Balance after" value={money(amount(item, ['balance_after']), first(item, ['currency'], currency))} /> : null}
            <DetailLine label="Status" value={status} />
          </View> : null}
        </Card>
      </Pressable>;
    })}
  </Screen>;
}