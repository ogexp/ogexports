import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGetInvestorProject, useInvestInProject } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { amount, first, messageOf, record, unwrap, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function OpportunityDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token } = useAuth();
  const colors = useColors();
  const query = useGetInvestorProject(id, { query: { queryKey: ['investor-project', id], enabled: Boolean(id && token) } });
  const invest = useInvestInProject();
  const [investAmount, setInvestAmount] = useState('');
  const [error, setError] = useState('');
  const project = unwrap(query.data);
  const target = amount(project, ['target_amount', 'funding_target', 'amount']);
  const currency = first(project, ['currency'], 'USD');
  async function submit() {
    setError('');
    const value = Number(investAmount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter an investment amount greater than zero.'); return; }
    try {
      await invest.mutateAsync({ id, data: { amount: value } });
      Alert.alert('Investment submitted', 'Your request has been sent to OG Exports.');
      setInvestAmount('');
    } catch (err) { setError(messageOf(err)); }
  }
  return <Screen title={first(project, ['title', 'name', 'project_name'], query.isLoading ? 'Loading opportunity' : 'Opportunity')} subtitle={first(project, ['type', 'category', 'location'], 'OG Exports investment')}>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading opportunity details…</Text></Card> : null}
    {query.isError ? <ErrorState message="Opportunity details could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>PROJECT STATUS</Text><Status value={first(project, ['status', 'state'], '—')} /></View>
        {first(project, ['description', 'summary']) ? <Text style={{ color: colors.foreground, lineHeight: 22, marginTop: 15 }}>{first(project, ['description', 'summary'])}</Text> : null}
        <View style={{ marginTop: 18, gap: 13 }}>
          {target != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Funding target</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(target, currency)}</Text></View> : null}
          {amount(project, ['minimum_investment', 'min_investment']) != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Minimum investment</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(amount(project, ['minimum_investment', 'min_investment']), currency)}</Text></View> : null}
          {first(project, ['expected_return', 'return_rate', 'roi']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Target return</Text><Text style={{ color: colors.primary, fontWeight: '700' }}>{first(project, ['expected_return', 'return_rate', 'roi'])}</Text></View> : null}
          {first(project, ['duration', 'term']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Investment term</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['duration', 'term'])}</Text></View> : null}
        </View>
      </Card>
      <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: 5 }}>Invest in this project</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>The investor server validates your account, available balance and verification status before accepting the request.</Text>
        <Field label={`Amount (${currency})`} value={investAmount} onChangeText={setInvestAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
        {error ? <Text style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
        <Action title="Submit investment" icon="trending-up" loading={invest.isPending} disabled={!investAmount} onPress={() => void submit()} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Investments involve risk. Review the project information before confirming.</Text>
      </Card>
    </> : null}
  </Screen>;
}