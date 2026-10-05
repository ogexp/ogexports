import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorProjects } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

function commodityOf(item: Record<string, unknown>) {
  return first(item, ['commodity', 'product', 'crop', 'category', 'type'], 'Other');
}

export default function Trade() {
  const { token } = useAuth();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const query = useGetInvestorProjects({ per_page: 50 }, {
    query: { queryKey: ['investor-trade-projects', 50], enabled: !!token, staleTime: 60_000 },
  });
  const projects = list(query.data);
  const categories = useMemo(() => ['All', ...Array.from(new Set(projects.map(commodityOf).filter(value => value !== 'Other'))).slice(0, 5)], [projects]);
  const filtered = projects.filter(item => {
    const commodity = commodityOf(item);
    const matchesCategory = category === 'All' || commodity.toLowerCase() === category.toLowerCase();
    const haystack = [
      commodity,
      first(item, ['title', 'name', 'project_name']),
      first(item, ['origin', 'origin_country']),
      first(item, ['destination', 'destination_country']),
      first(item, ['trade_direction', 'type', 'status']),
    ].join(' ').toLowerCase();
    return matchesCategory && haystack.includes(search.trim().toLowerCase());
  });

  return <Screen title="Trade opportunities" subtitle="Explore live commodities and trade projects" refreshable>
    <Field label="Search opportunities" value={search} onChangeText={setSearch} placeholder="Commodity, origin or destination" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      {categories.map(item => {
        const selected = category === item;
        return <Pressable key={item} onPress={() => setCategory(item)} style={{ borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: selected ? colors.primary : colors.secondary, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}>
          <Text style={{ color: selected ? colors.primaryForeground : colors.secondaryForeground, fontSize: 12, fontWeight: '600' }}>{item}</Text>
        </Pressable>;
      })}
    </View>
    <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Feather name="info" size={17} color={colors.primary} style={{ marginTop: 1 }} />
      <Text style={{ color: colors.mutedForeground, flex: 1, fontSize: 12, lineHeight: 18 }}>Commodities, routes, prices and terms are shown only when provided for an opportunity by OG Exports.</Text>
    </Card>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading live opportunities…</Text></Card> : null}
    {query.isError ? <ErrorState message="Trade opportunities could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && filtered.length === 0 ? <EmptyState title={search || category !== 'All' ? 'No matching opportunities' : 'No trade opportunities available'} body={search || category !== 'All' ? 'Try a different search or category.' : 'New opportunities will appear here when OG Exports publishes them.'} /> : null}
    {filtered.map((item, index) => {
      const id = first(item, ['id', 'project_id'], '');
      const title = first(item, ['title', 'name', 'project_name'], commodityOf(item));
      const origin = first(item, ['origin', 'origin_country']);
      const destination = first(item, ['destination', 'destination_country']);
      const route = [origin, destination].filter(Boolean).join(' → ');
      const target = amount(item, ['target_amount', 'funding_target', 'amount']);
      return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="package" size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{title}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>{commodityOf(item)}{route ? ` · ${route}` : ''}</Text>
            </View>
            <Status value={first(item, ['status', 'state'], '—')} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{first(item, ['trade_direction', 'type'], 'Opportunity')}</Text>
            {target != null ? <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 12 }}>{money(target, first(item, ['currency']))}</Text> : null}
          </View>
        </Card>
      </Pressable>;
    })}
  </Screen>;
}
