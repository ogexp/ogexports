import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGetInvestorInvestments } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Portfolio() {
  const { token } = useAuth();
  const colors = useColors();
  const query = useGetInvestorInvestments({ per_page: 40 }, { query: { queryKey: ['investor-positions'], enabled: !!token, staleTime: 30_000 } });
  const rows = list(query.data);
  const invested = rows.reduce((sum, item) => sum + (amount(item, ['amount', 'investment_amount', 'principal']) ?? 0), 0);
  return <Screen title="Portfolio" subtitle="Your investment positions in one place">
    <Card style={{ backgroundColor: '#1f6d4c', borderColor: '#1f6d4c' }}><Text style={{ color: '#dbe9dc', fontSize: 12 }}>TOTAL POSITIONS</Text><Text style={{ color: '#fff', fontSize: 30, fontWeight: '700', marginTop: 7 }}>{query.isLoading ? '…' : rows.length}</Text><Text style={{ color: '#dbe9dc', marginTop: 12, fontSize: 12 }}>Invested capital · {query.isLoading ? '…' : money(invested, 'USD')}</Text></Card>
    {query.isError ? <ErrorState message="Portfolio positions could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && rows.length === 0 ? <EmptyState title="Your portfolio is waiting" body="When you invest in an opportunity, its progress will appear here." /> : null}
    {rows.map((item, index) => {
      const id = first(item, ['id', 'investment_id'], '');
      return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/position/[id]', params: { id } })}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text numberOfLines={1} style={{ flex: 1, color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{first(item, ['project_name', 'title', 'name'], 'Investment')}</Text><Status value={first(item, ['status', 'state'], '—')} /></View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 7 }}>{first(item, ['type', 'category'], 'OG Exports')}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Invested</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(amount(item, ['amount', 'investment_amount', 'principal']), first(item, ['currency'], 'USD'))}</Text></View>
        </Card>
      </Pressable>;
    })}
  </Screen>;
}