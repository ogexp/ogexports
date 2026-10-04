import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGetInvestorProject, useGetInvestorWallet, useInvestInProject } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { amount, first, list, messageOf, record, unwrap, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';

export default function OpportunityDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const query = useGetInvestorProject(id, { query: { queryKey: ['investor-project', id], enabled: Boolean(id && token) } });
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token, staleTime: 30_000 } });
  const invest = useInvestInProject();
  const [investAmount, setInvestAmount] = useState('');
  const [stage, setStage] = useState<'amount' | 'payment' | 'review' | 'submitted'>('amount');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [error, setError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [documentBusy, setDocumentBusy] = useState('');
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
  const activeFlowStep = stage === 'amount' ? 2 : stage === 'payment' ? 3 : stage === 'review' ? 4 : 5;

  function continueToPayment() {
    setError('');
    const value = Number(investAmount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter an investment amount greater than zero.'); return; }
    if (minimum != null && value < minimum) { setError(`The minimum investment for this opportunity is ${money(minimum, currency)}.`); return; }
    if (maximum != null && value > maximum) { setError(`The maximum investment for this opportunity is ${money(maximum, currency)}.`); return; }
    if (walletBalance != null && walletCurrency === currency && value > walletBalance) { setError('This amount is greater than your available wallet balance.'); return; }
    setStage('payment');
  }

  function continueToReview() {
    setError('');
    setRiskAccepted(false);
    setStage('review');
  }

  async function submit() {
    setError('');
    try {
      const result = record(await invest.mutateAsync({ id, data: { amount: Number(investAmount) } }));
      const investment = record(result.data);
      setConfirmation({
        status: first(investment, ['status', 'state'], 'Not provided'),
        message: first(result, ['message']),
        reference: first(investment, ['reference', 'id'], 'Not provided'),
        amount: amount(investment, ['amount', 'investment_amount']) ?? Number(investAmount),
        date: first(investment, ['created_at', 'date'], first(result, ['created_at', 'date'])),
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

  async function viewProjectDocument(url: string) {
    setDocumentError('');
    try {
      if (!/^https?:\/\//i.test(url) && !apiOrigin) throw new Error('The investor server is not configured.');
      const resolved = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, apiOrigin);
      if (resolved.protocol !== 'https:' && resolved.protocol !== 'http:') throw new Error('This document link is not supported.');
      await Linking.openURL(resolved.href);
    } catch (err) {
      setDocumentError(messageOf(err));
    }
  }

  async function downloadProjectDocument(document: Record<string, unknown>, url: string, key: string) {
    setDocumentError('');
    setDocumentBusy(key);
    try {
      if (!apiOrigin) throw new Error('Set the OG Exports investor server address in Settings before downloading.');
      const serverOrigin = new URL(apiOrigin).origin;
      const resolved = new URL(url, apiOrigin);
      if (resolved.origin !== serverOrigin) throw new Error('For your security, downloads must be hosted by the OG Exports investor server.');
      const name = first(document, ['original_name', 'name', 'title'], 'project-document');
      const extensionFromName = name.includes('.') ? name.split('.').pop() ?? 'bin' : 'bin';
      const extension = first(document, ['extension', 'file_extension'], extensionFromName);
      const mimeType = first(document, ['mime_type', 'content_type'], 'application/octet-stream');
      await shareInvestorFile(resolved.href, name, apiOrigin, mimeType, extension);
    } catch (err) {
      setDocumentError(messageOf(err));
    } finally {
      setDocumentBusy('');
    }
  }
  return <Screen title={first(project, ['title', 'name', 'project_name'], query.isLoading ? 'Loading opportunity' : 'Opportunity')} subtitle={first(project, ['type', 'category', 'location'], 'OG Exports opportunity')}>
    <View accessibilityRole="progressbar" accessibilityLabel={`Investment flow step ${activeFlowStep} of 5`} style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
      {(['Opportunity', 'Amount', 'Payment', 'Review', 'Confirm'] as const).map((label, index) => {
        const complete = index + 1 <= activeFlowStep;
        return <View key={label} style={{ flex: 1, borderRadius: 9, paddingVertical: 8, alignItems: 'center', backgroundColor: complete ? colors.primary : colors.secondary }}>
          <Text style={{ color: complete ? colors.primaryForeground : colors.mutedForeground, fontSize: 9, fontWeight: '700', textAlign: 'center' }}>{index + 1}. {label}</Text>
        </View>;
      })}
    </View>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading opportunity details…</Text></Card> : null}
    {query.isError ? <ErrorState message="Opportunity details could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>PROJECT STATUS</Text><Status value={first(project, ['status', 'state'], '—')} /></View>
        {first(project, ['description', 'summary']) ? <Text style={{ color: colors.foreground, lineHeight: 22, marginTop: 15 }}>{first(project, ['description', 'summary'])}</Text> : null}
        <View style={{ marginTop: 18, gap: 13 }}>
          {target != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Funding target</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(target, currency)}</Text></View> : null}
          {amount(project, ['raised_amount', 'funded_amount']) != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Raised</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(amount(project, ['raised_amount', 'funded_amount']), currency)}</Text></View> : null}
          {amount(project, ['current_funding', 'current_amount']) != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Current funding</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(amount(project, ['current_funding', 'current_amount']), currency)}</Text></View> : null}
          {minimum != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Minimum investment</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(minimum, currency)}</Text></View> : null}
          {maximum != null ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Maximum investment</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{money(maximum, currency)}</Text></View> : null}
          {first(project, ['expected_return', 'return_rate', 'roi']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Indicative return · not guaranteed</Text><Text style={{ color: colors.primary, fontWeight: '700' }}>{first(project, ['expected_return', 'return_rate', 'roi'])}</Text></View> : null}
          {first(project, ['duration', 'term']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Investment term</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['duration', 'term'])}</Text></View> : null}
          {first(project, ['quantity', 'trade_size', 'volume']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Trade size</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['quantity', 'trade_size', 'volume'])}</Text></View> : null}
          {first(project, ['expected_timeline', 'timeline']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Expected timeline</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['expected_timeline', 'timeline'])}</Text></View> : null}
          {first(project, ['risk_level', 'risk_rating']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Risk level</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['risk_level', 'risk_rating'])}</Text></View> : null}
          {first(project, ['commodity']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Commodity</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['commodity'])}</Text></View> : null}
          {first(project, ['origin']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Origin</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['origin'])}</Text></View> : null}
          {first(project, ['destination']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Destination</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['destination'])}</Text></View> : null}
          {first(project, ['trade_direction']) ? <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground }}>Trade direction</Text><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(project, ['trade_direction'])}</Text></View> : null}
        </View>
      </Card>
      <Card>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Project documents</Text>
        {documents.length ? documents.map((document, index) => {
          const key = first(document, ['id'], String(index));
          const name = first(document, ['title', 'original_name', 'name'], 'Project document');
          const viewUrl = first(document, ['view_url', 'url']);
          const downloadUrl = first(document, ['download_url']);
          return <View key={key} style={{ paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 10 }}>{name}</Text>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <Pressable accessibilityRole="button" disabled={!viewUrl || documentBusy === key} onPress={() => void viewProjectDocument(viewUrl)} style={{ flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', opacity: viewUrl ? 1 : 0.5 }}>
                <Feather name="eye" size={15} color={colors.primary} /><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 12 }}>View</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!downloadUrl || Boolean(documentBusy)} onPress={() => void downloadProjectDocument(document, downloadUrl, key)} style={{ flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', opacity: downloadUrl ? 1 : 0.5 }}>
                <Feather name="download" size={15} color={colors.primary} /><Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 12 }}>{documentBusy === key ? 'Preparing…' : 'Download'}</Text>
              </Pressable>
            </View>
            {!viewUrl && !downloadUrl ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 8 }}>Secure access links are not provided for this document.</Text> : null}
          </View>;
        }) : <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>No project documents are available from OG Exports for this opportunity.</Text>}
        {documentError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{documentError}</Text> : null}
      </Card>
      <Pressable onPress={() => router.push('/account/legal/risk')} style={{ marginBottom: 12 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Read the risk disclosure →</Text></Pressable>
      {error ? <ErrorState message={error} /> : null}
      {kycRequired ? <Pressable onPress={() => router.push('/account/kyc')}><Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 12 }}>Complete identity verification →</Text></Pressable> : null}
      {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Investment request submitted</Text>
        {first(confirmation, ['message']) ? <Text style={{ color: colors.mutedForeground, marginTop: 7, lineHeight: 19 }}>{first(confirmation, ['message'])}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}><Text style={{ color: colors.mutedForeground }}>Server status</Text><Status value={first(confirmation, ['status'], 'Not provided')} /></View>
        <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Reference: {String(confirmation.reference)}</Text>
        {first(confirmation, ['date']) ? <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Date: {first(confirmation, ['date'])}</Text> : null}
        <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Amount submitted: {money(Number(confirmation.amount), currency)}</Text>
        <View style={{ marginTop: 14 }}><Action title="View portfolio" icon="pie-chart" onPress={() => router.push('/account/portfolio')} /></View>
      </Card> : null}
      {stage === 'amount' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: 5 }}>Invest in this opportunity</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Investments are funded from your wallet. OG Exports checks eligibility, available balance and verification status before accepting an investment.</Text>
        {walletBalance != null ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 12 }}>Available wallet balance · {money(walletBalance, walletCurrency)}</Text> : walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>Wallet balance could not be checked; the server will validate it before accepting an investment.</Text> : null}
        <Field label={`Amount (${currency})`} value={investAmount} onChangeText={setInvestAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
        <Action title="Continue to payment" icon="arrow-right" disabled={!investAmount} onPress={continueToPayment} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Fee and currency-conversion estimates are not provided by the investor API. The server response is authoritative.</Text>
      </Card> : null}
      {stage === 'payment' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Payment method</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 12 }}>Choose how this investment request will be funded.</Text>
        <Card style={{ borderColor: colors.primary, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>Wallet balance</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>{walletBalance != null && walletCurrency ? money(walletBalance, walletCurrency) : 'Balance unavailable'}</Text></View>
            <Status value="Selected" />
          </View>
        </Card>
        <Card style={{ opacity: 0.72, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>Bank transfer</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>Not available for this investment request.</Text></View>
            <Status value="Unavailable" />
          </View>
        </Card>
        <Action title="Review investment" icon="arrow-right" onPress={continueToReview} />
        <View style={{ marginTop: 9 }}><Action title="Back to amount" secondary onPress={() => setStage('amount')} /></View>
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