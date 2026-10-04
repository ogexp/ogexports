import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorProjects } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const filters = ['All', 'container', 'ricemill', 'feed', 'produce', 'plant'];
const label = (value: string) => value === 'All' ? value : value === 'ricemill' ? 'Rice mill' : value === 'feed' ? 'Feed mill' : value.charAt(0).toUpperCase() + value.slice(1);

export default function Opportunities() {
  const { token } = useAuth();
  const colors = useColors();
  const [filter, setFilter] = useState('All');
  const query = useGetInvestorProjects(filter === 'All' ? { per_page: 40 } : { per_page: 40, type: filter }, { query: { queryKey: ['investor-projects', filter], enabled: !!token, staleTime: 60_000 } });
  const rows = list(query.data);
  return <Screen title="Invest" subtitle="Explore opportunities from OG Exports">
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>{filters.map(item => <Pressable key={item} onPress={() => setFilter(item)} style={{ borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: filter === item ? colors.primary : colors.secondary }}><Text style={{ color: filter === item ? colors.primaryForeground : colors.foreground, fontWeight: '600', fontSize: 12 }}>{label(item)}</Text></Pressable>)}</View>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading live opportunities…</Text></Card> : null}
    {query.isError ? <ErrorState message="The investor API could not load opportunities." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && rows.length === 0 ? <EmptyState title="No opportunities found" body="Try another category or check again later." /> : null}
    {rows.map((item, index) => {
      const id = first(item, ['id', 'project_id'], '');
      const title = first(item, ['title', 'name', 'project_name'], 'Investment opportunity');
      const subtitle = first(item, ['type', 'category', 'location'], 'OG Exports project');
      const target = amount(item, ['target_amount', 'funding_target', 'amount']);
      const minimum = amount(item, ['minimum_investment', 'min_investment', 'minimum_amount']);
      const funded = amount(item, ['funded_amount', 'raised_amount', 'current_amount']);
      const progress = target && funded ? Math.min(100, Math.round(funded / target * 100)) : 0;
      return <Pressable key={id || index} onPress={() => id && router.push({ pathname: '/project/[id]', params: { id } })} disabled={!id}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 }}>{subtitle.toUpperCase()}</Text><Status value={first(item, ['status', 'state'], 'Open')} /></View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 11 }}>{title}</Text>
          {first(item, ['description', 'summary']) ? <Text numberOfLines={2} style={{ color: colors.mutedForeground, lineHeight: 20, marginTop: 6 }}>{first(item, ['description', 'summary'])}</Text> : null}
          {target != null ? <View style={{ marginTop: 15 }}><View style={{ height: 6, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: 6, backgroundColor: colors.primary }} /></View><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{funded == null ? 'Funding target' : `${progress}% funded`}</Text><Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>{money(target, first(item, ['currency'], 'USD'))}</Text></View></View> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 13 }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Minimum investment</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{minimum == null ? 'See details' : money(minimum, first(item, ['currency'], 'USD'))}</Text></View>
          <View style={{ position: 'absolute', right: 15, bottom: 14 }}><Feather name="arrow-up-right" size={16} color={colors.primary} /></View>
        </Card>
      </Pressable>;
    })}
  </Screen>;
}