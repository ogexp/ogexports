import React from 'react';
import { Pressable, Text, View } from 'react-native';
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

  return (
    <Screen title={`Good to see you, ${name.split(' ')[0]}`} subtitle="Your OG Exports investor overview">
      <Card style={{ backgroundColor: '#1f6d4c', borderColor: '#1f6d4c', padding: 20 }}>
        <Text style={{ color: '#dbe9dc', fontSize: 12, fontWeight: '600' }}>TOTAL INVESTED</Text>
        <Text style={{ color: '#ffffff', fontSize: 33, fontWeight: '700', marginTop: 8 }}>{money(total, first(wallet, ['currency'], 'USD'))}</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.20)', marginVertical: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View><Text style={{ color: '#dbe9dc', fontSize: 11 }}>Available balance</Text><Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 5 }}>{money(balance, first(wallet, ['currency'], 'USD'))}</Text></View>
          <View><Text style={{ color: '#dbe9dc', fontSize: 11 }}>Returns earned</Text><Text style={{ color: '#f0d78d', fontSize: 17, fontWeight: '700', marginTop: 5 }}>{money(profit, first(wallet, ['currency'], 'USD'))}</Text></View>
        </View>
      </Card>

      {dashboard.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading your live account summary…</Text></Card> : dashboard.isError ? <ErrorState message="Your live investor summary could not be loaded." onRetry={() => void dashboard.refetch()} /> : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => router.push('/wallet/deposit')} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 7 }}>
          <Feather name="plus-circle" size={21} color={colors.primary} /><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Add funds</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/wallet/withdraw')} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 7 }}>
          <Feather name="arrow-up-right" size={21} color={colors.primary} /><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Withdraw</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/account/kyc')} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'center', gap: 7 }}>
          <Feather name="shield" size={21} color={colors.primary} /><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Verify</Text>
        </Pressable>
      </View>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Active investments</Text><Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: 5 }}>{active == null ? '—' : money(active, first(wallet, ['currency'], 'USD'))}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Positions</Text><Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: 5 }}>{first(summary, ['active_investments_count', 'investments_count'], '—')}</Text></View>
        </View>
      </Card>

      <Section title="Open opportunities" right={<Pressable onPress={() => router.push('/(tabs)/opportunities')}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>View all</Text></Pressable>} />
      {projects.isError ? <ErrorState message="Opportunities could not be loaded from the investor API." onRetry={() => void projects.refetch()} /> : openProjects.length === 0 && !projects.isLoading ? <EmptyState title="No open opportunities" body="New projects will appear here when they are available." /> : null}
      {openProjects.map((item, index) => {
        const id = first(item, ['id', 'project_id'], '');
        const title = first(item, ['title', 'name', 'project_name'], 'Investment opportunity');
        const status = first(item, ['status', 'state'], 'Open');
        const target = amount(item, ['target_amount', 'funding_target', 'amount']);
        return <Pressable key={id || index} disabled={!id} onPress={() => router.push({ pathname: '/project/[id]', params: { id } })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Feather name="trending-up" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700' }}>{title}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{target == null ? first(item, ['type', 'category'], 'Project') : money(target, first(item, ['currency'], 'USD'))}</Text></View>
            <Status value={status} />
          </Card>
        </Pressable>;
      })}
    </Screen>
  );
}