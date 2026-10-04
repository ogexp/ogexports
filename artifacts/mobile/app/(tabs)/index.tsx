import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorDashboard, useGetInvestorProjects } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function InvestorHome() {
  const { token, user } = useAuth();
  const colors = useColors();
  const dashboard = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: !!token, staleTime: 30_000 } });
  const projects = useGetInvestorProjects({ per_page: 3 }, { query: { queryKey: ['investor-projects', 3], enabled: !!token, staleTime: 60_000 } });
  const data = unwrap(dashboard.data);
  const summary = record(data.summary);
  const wallet = record(data.wallet);
  const name = first(record(user), ['name', 'first_name'], 'Investor');
  const balance = amount(wallet, ['available_balance', 'balance', 'available']) ?? amount(summary, ['available_balance']);
  const total = amount(summary, ['total_investment', 'total_investment_usd', 'portfolio_value']);
  const active = amount(summary, ['active_investment', 'active_investment_usd']);
  const profit = amount(summary, ['total_profit_earned', 'total_profit_earned_usd', 'profit']);
  const openProjects = list(projects.data);
  const quickActions = [
    { title: 'Add funds', icon: 'plus-circle' as const, onPress: () => router.push('/wallet/deposit') },
    { title: 'Invest', icon: 'trending-up' as const, onPress: () => router.push('/(tabs)/opportunities') },
    { title: 'Trade', icon: 'repeat' as const, onPress: () => router.push('/(tabs)/trade') },
    { title: 'Withdraw', icon: 'arrow-up-right' as const, onPress: () => router.push('/wallet/withdraw') },
  ];

  return (
    <Screen title={`Good to see you, ${name.split(' ')[0]}`} subtitle="Your OG Exports investor overview">
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary, padding: 20 }}>
        <Text style={{ color: colors.primaryForeground, opacity: 0.78, fontSize: 12, fontWeight: '600' }}>TOTAL INVESTED</Text>
        <Text style={{ color: colors.primaryForeground, fontSize: 33, fontWeight: '700', marginTop: 8 }}>{money(total, first(wallet, ['currency']))}</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.20)', marginVertical: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View><Text style={{ color: colors.primaryForeground, opacity: 0.78, fontSize: 11 }}>Available balance</Text><Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{money(balance, first(wallet, ['currency']))}</Text></View>
          <View><Text style={{ color: colors.primaryForeground, opacity: 0.78, fontSize: 11 }}>Returns earned</Text><Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: 5 }}>{money(profit, first(wallet, ['currency']))}</Text></View>
        </View>
      </Card>

      {dashboard.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading your live account summary…</Text></Card> : dashboard.isError ? <ErrorState message="Your live investor summary could not be loaded." onRetry={() => void dashboard.refetch()} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {quickActions.map(action => <Pressable key={action.title} onPress={action.onPress} style={{ width: '48.5%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name={action.icon} size={19} color={colors.primary} /><Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{action.title}</Text>
        </Pressable>)}
      </View>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Active investments</Text><Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: 5 }}>{active == null ? '—' : money(active, first(wallet, ['currency']))}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Positions</Text><Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: 5 }}>{first(summary, ['active_investments_count', 'investments_count'], '—')}</Text></View>
        </View>
      </Card>

      <Section title="Featured opportunities" right={<Pressable onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>View all</Text></Pressable>} />
      {projects.isError ? <ErrorState message="Opportunities could not be loaded from the investor API." onRetry={() => void projects.refetch()} /> : openProjects.length === 0 && !projects.isLoading ? <EmptyState title="No open opportunities" body="New projects will appear here when they are available." /> : null}
      {openProjects.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 12 }}>
        {openProjects.map((item, index) => {
          const id = first(item, ['id', 'project_id'], '');
          const title = first(item, ['title', 'name', 'project_name'], 'Investment opportunity');
          const status = first(item, ['status', 'state'], 'Open');
          const target = amount(item, ['target_amount', 'funding_target', 'amount']);
          return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
            <Card style={{ width: 270, minHeight: 112 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Feather name="trending-up" size={17} color={colors.primary} /><Status value={status} /></View>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', marginTop: 12 }}>{title}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>{target == null ? first(item, ['type', 'category'], 'Project') : money(target, first(item, ['currency']))}</Text>
            </Card>
          </Pressable>;
        })}
      </ScrollView> : null}
    </Screen>
  );
}