import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGetInvestorInvestment } from '@workspace/api-client-react';
import { Card, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { amount, first, money, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function PositionDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token } = useAuth();
  const colors = useColors();
  const query = useGetInvestorInvestment(id, { query: { queryKey: ['investor-position', id], enabled: Boolean(id && token) } });
  const row = unwrap(query.data);
  const currency = first(row, ['currency'], 'USD');
  return <Screen title={first(row, ['project_name', 'title', 'name'], 'Investment')} subtitle="Portfolio position">
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading position…</Text></Card> : null}
    {query.isError ? <ErrorState message="This investment position could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.mutedForeground }}>Position status</Text><Status value={first(row, ['status', 'state'], '—')} /></View>
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 18, marginBottom: 8 }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Invested amount</Text><Text style={{ color: colors.foreground, fontSize: 30, fontWeight: '700', marginTop: 5 }}>{money(amount(row, ['amount', 'investment_amount', 'principal']), currency)}</Text></View>
      {[
        ['Project', first(row, ['project_name', 'title', 'name'], '—')],
        ['Investment type', first(row, ['type', 'category'], '—')],
        ['Return earned', money(amount(row, ['profit_earned', 'profit', 'returns']), currency)],
        ['Created', first(row, ['created_at', 'investment_date', 'date'], '—')],
        ['Reference', first(row, ['reference', 'reference_number'], '—')],
      ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.mutedForeground }}>{label}</Text><Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text></View>)}
    </Card> : null}
  </Screen>;
}