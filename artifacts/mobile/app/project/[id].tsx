import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGetInvestorProject, useGetInvestorWallet, useInvestInProject } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, messageOf, record, unwrap, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function OpportunityDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const query = useGetInvestorProject(id, { query: { queryKey: ['investor-project', id], enabled: Boolean(id && token) } });
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token, staleTime: 30_000 } });
  const invest = useInvestInProject();
  const [investAmount, setInvestAmount] = useState('');
  const [stage, setStage] = useState<'amount' | 'review' | 'submitted'>('amount');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const project = unwrap(query.data);
  const wallet = unwrap(walletQuery.data);
  const target = amount(project, ['target_amount', 'funding_target', 'amount']);
  const minimum = amount(project, ['minimum_investment', 'min_investment']);
  const maximum = amount(project, ['maximum_investment', 'max_investment']);
  const walletBalance = amount(wallet, ['available_balance', 'balance', 'available']);
  const currency = first(project, ['currency'], first(wallet, ['currency']));
  const walletCurrency = first(wallet, ['currency'], currency);
  const documents = list(project.documents);
  const kycRequired = /kyc|verification/i.test(error);

  function review() {
    setError('');
    const value = Number(investAmount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter an investment amount greater than zero.'); return; }
    if (minimum != null && value < minimum) { setError(`The minimum investment for this opportunity is ${money(minimum, currency)}.`); return; }
    if (maximum != null && value > maximum) { setError(`The maximum investment for this opportunity is ${money(maximum, currency)}.`); return; }
    if (walletBalance != null && walletCurrency === currency && value > walletBalance) { setError('This amount is greater than your available wallet balance.'); return; }
    setRiskAccepted(false);
    setStage('review');
  }

  async function submit() {
    setError('');
    try {
      const result = record(await invest.mutateAsync({ id, data: { amount: Number(investAmount) } }));
      const investment = record(result.data);
      setConfirmation({
        status: first(investment, ['status', 'state'], first(result, ['message'], 'Request received')),
        reference: first(investment, ['reference', 'id'], 'Not provided'),
        amount: amount(investment, ['amount', 'investment_amount']) ?? Number(investAmount),
      });
      setStage('submitted');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['investor-wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-positions'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] }),
      ]);
    } catch (err) { setError(messageOf(err)); }
  }
  return <Screen title={first(project, ['title', 'name', 'project_name'], query.isLoading ? 'Loading opportunity' : 'Opportunity')} subtitle={first(project, ['type', 'category', 'location'], 'OG Exports opportunity')}>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading opportunity details…</Text></Card> : null}
    {query.isError ? <ErrorState message="Opportunity details could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>PROJECT STATUS</Text><Status value={first(project, ['status', 'state'], '—')} /></View>
        {first(project, ['description', 'summary']) ? <Text style={{ color: colors.foreground, lineHeight: 22, marginTop: 15 }}>{first(project, ['description', 'summary'])}</Text> : null}
        <View style={{ marginTop: 18, gap: 13 }}>
          {target != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Funding target</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(target, currency)}</Text></View> : null}
          {amount(project, ['raised_amount', 'funded_amount']) != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Raised</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(amount(project, ['raised_amount', 'funded_amount']), currency)}</Text></View> : null}
          {minimum != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Minimum investment</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(minimum, currency)}</Text></View> : null}
          {maximum != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Maximum investment</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(maximum, currency)}</Text></View> : null}
          {first(project, ['expected_return', 'return_rate', 'roi']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Indicative return · not guaranteed</Text><Text style={{ color: colors.primary, fontWeight: '700' }}>{first(project, ['expected_return', 'return_rate', 'roi'])}</Text></View> : null}
          {first(project, ['duration', 'term']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Investment term</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['duration', 'term'])}</Text></View> : null}
          {first(project, ['commodity']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Commodity</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['commodity'])}</Text></View> : null}
          {first(project, ['origin']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Origin</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['origin'])}</Text></View> : null}
          {first(project, ['destination']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Destination</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['destination'])}</Text></View> : null}
          {first(project, ['trade_direction']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Trade direction</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['trade_direction'])}</Text></View> : null}
        </View>
      </Card>
      {documents.length ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Project documents</Text>
        {documents.map((document, index) => <Text key={first(document, ['id'], String(index))} style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20, marginBottom: 6 }}>• {first(document, ['title', 'original_name', 'name'], 'Project document')}</Text>)}
      </Card> : null}
      {error ? <ErrorState message={error} /> : null}
      {kycRequired ? <Pressable onPress={() => router.push('/account/kyc')}><Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 12 }}>Complete identity verification →</Text></Pressable> : null}
      {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Server confirmation</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Status: <Text style={{ color: colors.foreground, fontWeight: '700' }}>{String(confirmation.status)}</Text></Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Reference: {String(confirmation.reference)}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Amount: {money(Number(confirmation.amount), currency)}</Text>
        <View style={{ marginTop: 14 }}><Action title="View portfolio" icon="pie-chart" onPress={() => router.push('/account/portfolio')} /></View>
      </Card> : null}
      {stage === 'amount' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: 5 }}>Invest in this opportunity</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Investments are funded from your wallet. OG Exports checks eligibility, available balance and verification status before accepting an investment.</Text>
        {walletBalance != null ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 12 }}>Available wallet balance · {money(walletBalance, walletCurrency)}</Text> : walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>Wallet balance could not be checked; the server will validate it before accepting an investment.</Text> : null}
        <Field label={`Amount (${currency})`} value={investAmount} onChangeText={setInvestAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
        <Action title="Review investment" icon="arrow-right" disabled={!investAmount} onPress={review} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Fee and currency-conversion estimates are not provided by the investor API. The server response is authoritative.</Text>
      </Card> : null}
      {stage === 'review' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Review before confirming</Text>
        <View style={{ marginTop: 14, gap: 11 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.mutedForeground }}>Opportunity</Text><Text style={{ color: colors.foreground, fontWeight: '700', flex: 1, textAlign: 'right' }}>{first(project, ['title', 'name', 'project_name'], 'Opportunity')}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Investment amount</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(Number(investAmount), currency)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Payment source</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>Wallet balance</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.mutedForeground }}>Fees / conversion</Text><Text style={{ color: colors.mutedForeground, flex: 1, textAlign: 'right' }}>Not estimated by this API</Text></View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19 }}>Investment returns are not guaranteed. Review the available project information and the official risk disclosure before committing.</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: riskAccepted }} onPress={() => setRiskAccepted(value => !value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 16 }}>
          <View style={{ width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: riskAccepted ? colors.primary : colors.border, backgroundColor: riskAccepted ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>{riskAccepted ? <Text style={{ color: colors.primaryForeground, fontSize: 14 }}>✓</Text> : null}</View>
          <Text style={{ flex: 1, color: colors.foreground, lineHeight: 19, fontSize: 12 }}>I have reviewed this opportunity and understand the investment involves risk. My wallet will be debited if OG Exports confirms the request.</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/account/legal/risk')} style={{ marginBottom: 14 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Read official risk disclosure →</Text></Pressable>
        {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
        <Action title="Confirm investment" icon="lock" loading={invest.isPending} disabled={!riskAccepted} onPress={() => void submit()} />
        <View style={{ marginTop: 10 }}><Action title="Edit amount" secondary onPress={() => { setStage('amount'); setRiskAccepted(false); setError(''); }} /></View>
      </Card> : null}
    </> : null}
  </Screen>;
}