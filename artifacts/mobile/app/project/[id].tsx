import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useGetInvestorProfile, useGetInvestorProject, useGetInvestorWallet, useInvestInProject } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, messageOf, record, unwrap, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';
import { getInvestorKycStatus, isInvestorKycVerified } from '@/lib/kyc';

export default function OpportunityDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const query = useGetInvestorProject(id, { query: { queryKey: ['investor-project', id], enabled: Boolean(id && token) } });
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token } });
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
  const investorProfile = unwrap(profileQuery.data);
  const kycStatus = getInvestorKycStatus(investorProfile);
  const kycVerified = !profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && isInvestorKycVerified(investorProfile);
  const wallet = unwrap(walletQuery.data);
  const target = amount(project, ['target_amount', 'funding_target', 'amount']);
  const fundedAmount = amount(project, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
  const remainingFunding = target != null && fundedAmount != null ? Math.max(0, target - fundedAmount) : null;
  const minimum = amount(project, ['minimum_investment', 'min_investment']);
  const maximum = amount(project, ['maximum_investment', 'max_investment']);
  const walletBalance = amount(wallet, ['available_balance', 'balance', 'available']);
  const currency = first(project, ['currency'], first(wallet, ['currency']));
  const walletCurrency = first(wallet, ['currency'], currency);
  const documents = list(project.documents);
  const tradeId = first(project, ['trade_id', 'trade_code', 'code', 'reference'], 'Trade ID not provided');
  const tradeCurrency = first(project, ['currency']);
  const origin = first(project, ['origin', 'origin_country', 'from_country'], '');
  const destination = first(project, ['destination', 'destination_country', 'to_country', 'destination_market'], '');
  const routeStops = [
    { label: 'Origin', value: origin || 'Not provided', icon: 'map-pin' as const },
    { label: 'Port of loading', value: first(project, ['port_of_loading', 'loading_port'], 'Not provided'), icon: 'anchor' as const },
    {
      label: 'Transport',
      value: first(project, ['transport_mode', 'mode_of_transport', 'transport_type', 'shipping_mode', 'shipping_method'], 'Not provided'),
      detail: first(project, ['vessel_name', 'vessel']),
      icon: 'navigation' as const,
    },
    { label: 'Destination port', value: first(project, ['destination_port', 'port_of_discharge'], 'Not provided'), icon: 'anchor' as const },
    { label: 'Buyer', value: first(project, ['buyer_name', 'buyer'], 'Not provided'), icon: 'user' as const },
  ];
  const cargoDetails: [string, string][] = ([
    ['Commodity', first(project, ['commodity_name', 'commodity'], 'Not provided')],
    ['Grade', first(project, ['grade', 'commodity_grade'], 'Not provided')],
    ['Quantity', first(project, ['quantity', 'cargo_quantity', 'quantity_tons'], 'Not provided')],
    ['Packaging', first(project, ['packaging', 'package_type'], 'Not provided')],
    ['Container type', first(project, ['container_type'], 'Not provided')],
    ['Container count', first(project, ['container_count', 'containers_count'], 'Not provided')],
    ['Origin', origin || 'Not provided'],
    ['Destination', destination || 'Not provided'],
  ] as [string, string][]);
  const commercialDetails: [string, string][] = ([
    ['Trade term / Incoterm', first(project, ['incoterm', 'trade_term'], 'Not provided')],
    ['Estimated trade cycle', first(project, ['estimated_trade_cycle', 'trade_cycle', 'duration', 'term'], 'Not provided')],
    ['Shipment date', first(project, ['shipment_date', 'estimated_shipment_date'], 'Not provided')],
    ['Estimated arrival', first(project, ['estimated_arrival', 'eta'], 'Not provided')],
    ['Destination market', first(project, ['destination_market', 'destination_country'], 'Not provided')],
  ] as [string, string][]);
  const costBreakdown = record(project.financial_breakdown ?? project.cost_breakdown);
  const financialDetails: [string, number | null][] = ([
    ['Commodity cost', amount(project, ['commodity_cost']) ?? amount(costBreakdown, ['commodity_cost'])],
    ['Packing', amount(project, ['packing_cost']) ?? amount(costBreakdown, ['packing_cost'])],
    ['Inland transportation', amount(project, ['inland_transportation_cost', 'transportation_cost']) ?? amount(costBreakdown, ['inland_transportation_cost', 'transportation_cost'])],
    ['Port charges', amount(project, ['port_charges']) ?? amount(costBreakdown, ['port_charges'])],
    ['Freight', amount(project, ['freight_cost', 'freight']) ?? amount(costBreakdown, ['freight_cost', 'freight'])],
    ['Insurance', amount(project, ['insurance_cost', 'insurance']) ?? amount(costBreakdown, ['insurance_cost', 'insurance'])],
    ['Other trade costs', amount(project, ['other_trade_costs', 'other_costs']) ?? amount(costBreakdown, ['other_trade_costs', 'other_costs'])],
  ] as [string, number | null][]).filter(([, value]) => value != null);
  const formatTradeMoney = (value: number | null) => value == null ? 'Not provided' : tradeCurrency ? money(value, tradeCurrency) : 'Currency not provided';
  const projectedReturn = first(project, ['target_return', 'projected_return', 'expected_return', 'return_rate', 'roi']);
  const projectedDistribution = first(project, ['target_distribution', 'projected_distribution', 'estimated_distribution']);
  const projectedCycle = first(project, ['projected_cycle', 'expected_timeline']);
  const fundingProgress = target != null && target > 0 && fundedAmount != null
    ? Math.max(0, Math.min(100, Math.round(fundedAmount / target * 100)))
    : null;
  const fundingDetails: [string, string][] = [
    ['Total trade requirement', formatTradeMoney(target)],
    ['Amount funded', formatTradeMoney(fundedAmount)],
    ['Remaining funding', formatTradeMoney(remainingFunding)],
    ['Minimum investment', formatTradeMoney(minimum)],
    ['Maximum investment', formatTradeMoney(maximum)],
    ['Funding deadline', first(project, ['funding_deadline', 'closing_date', 'deadline'], 'Not provided')],
  ];
  const kycRequired = /kyc|verification/i.test(error);
  const activeFlowStep = !kycVerified ? 1 : stage === 'amount' ? 2 : stage === 'payment' ? 3 : stage === 'review' ? 4 : 5;

  function continueToPayment() {
    setError('');
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
    const value = Number(investAmount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter an investment amount greater than zero.'); return; }
    if (minimum != null && value < minimum) { setError(`The minimum investment for this opportunity is ${money(minimum, currency)}.`); return; }
    if (maximum != null && value > maximum) { setError(`The maximum investment for this opportunity is ${money(maximum, currency)}.`); return; }
    if (walletBalance != null && walletCurrency === currency && value > walletBalance) { setError('This amount is greater than your available wallet balance.'); return; }
    setStage('payment');
  }

  function continueToReview() {
    setError('');
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
    setRiskAccepted(false);
    setStage('review');
  }

  async function submit() {
    setError('');
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
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
  return <Screen title="Trade Opportunity" subtitle={first(project, ['commodity_name', 'commodity', 'destination'], 'Trade details')}>
    <View accessibilityRole="progressbar" accessibilityLabel={`Investment flow step ${activeFlowStep} of 5`} style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
      {(['Trade', 'Amount', 'Payment', 'Review', 'Submit'] as const).map((label, index) => {
        const complete = index + 1 <= activeFlowStep;
        return <View key={label} style={{ flex: 1, borderRadius: 9, paddingVertical: 8, alignItems: 'center', backgroundColor: complete ? colors.primary : colors.secondary }}>
          <Text style={{ color: complete ? colors.primaryForeground : colors.mutedForeground, fontSize: 9, fontWeight: '700', textAlign: 'center' }}>{index + 1}. {label}</Text>
        </View>;
      })}
    </View>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading opportunity details…</Text></Card> : null}
    {query.isError ? <ErrorState message="Opportunity details could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Section title="Trade overview" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>TRADE ID</Text><Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{tradeId}</Text></View>
          <Status value={first(project, ['status', 'state'], 'Not provided')} />
        </View>
        {first(project, ['description', 'summary']) ? <Text style={{ color: colors.foreground, lineHeight: 22, marginTop: 14 }}>{first(project, ['description', 'summary'])}</Text> : null}
      </Card>

      <Section title="Global trade route" />
      <Card>
        {routeStops.map((stop, index) => <View key={stop.label} style={{ flexDirection: 'row', gap: 11, minHeight: index < routeStops.length - 1 ? 58 : 40 }}>
          <View style={{ width: 27, alignItems: 'center' }}>
            <View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: index === 0 || index === routeStops.length - 1 ? colors.lightGreen : colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={stop.icon} size={13} color={index === 0 || index === routeStops.length - 1 ? colors.primary : colors.mutedForeground} />
            </View>
            {index < routeStops.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 3, backgroundColor: colors.border }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 13 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{stop.label}</Text>
            <Text style={{ color: stop.value === 'Not provided' ? colors.mutedForeground : colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 3 }}>{stop.value}</Text>
            {stop.detail ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Vessel: {stop.detail}</Text> : null}
          </View>
        </View>)}
        {routeStops.every(stop => stop.value === 'Not provided' && !stop.detail) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 4 }}>OG Exports has not supplied route or transport details for this trade.</Text> : null}
      </Card>

      <Section title="Cargo information" />
      <Card>
        {cargoDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text><Text style={{ color: value === 'Not provided' ? colors.mutedForeground : colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
      </Card>

      <Section title="Commercial information" />
      <Card>
        {commercialDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text><Text style={{ color: value === 'Not provided' ? colors.mutedForeground : colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
      </Card>

      <Section title="Funding information" />
      <Card>
        {fundingDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text><Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
        {fundingProgress != null ? <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Funding progress</Text><Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>{fundingProgress}%</Text></View>
          <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}><View style={{ width: `${fundingProgress}%`, height: 7, borderRadius: 4, backgroundColor: colors.primary }} /></View>
        </View> : <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 12 }}>Funding progress is not available.</Text>}
      </Card>

      <Section title="Financial breakdown" />
      <Card>
        {financialDetails.length ? financialDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text><Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{formatTradeMoney(value)}</Text>
        </View>) : <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>A financial cost breakdown has not been provided.</Text>}
      </Card>

      <Section title="Projected / target information" />
      <Card>
        {projectedReturn ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 }}><Text style={{ color: colors.mutedForeground, flex: 1 }}>Projected return · not guaranteed</Text><Text style={{ color: colors.foreground, fontWeight: '700', textAlign: 'right', flex: 1 }}>{projectedReturn}</Text></View> : null}
        {projectedDistribution ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 }}><Text style={{ color: colors.mutedForeground, flex: 1 }}>Estimated distribution · not guaranteed</Text><Text style={{ color: colors.foreground, fontWeight: '700', textAlign: 'right', flex: 1 }}>{projectedDistribution}</Text></View> : null}
        {projectedCycle ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 }}><Text style={{ color: colors.mutedForeground, flex: 1 }}>Expected trade cycle</Text><Text style={{ color: colors.foreground, fontWeight: '700', textAlign: 'right', flex: 1 }}>{projectedCycle}</Text></View> : null}
        {!projectedReturn && !projectedDistribution && !projectedCycle ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>OG Exports has not provided target return, distribution, or projected cycle figures.</Text> : null}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 9 }}>Projected returns and distributions are estimates, not guarantees. Actual outcomes depend on trade performance and applicable risks.</Text>
      </Card>
      <Card>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Trade documents</Text>
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
        }) : <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>No trade documents are available from OG Exports for this opportunity.</Text>}
        {documentError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{documentError}</Text> : null}
      </Card>
      <Pressable onPress={() => router.push('/account/legal/risk')} style={{ marginBottom: 12 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Read the risk disclosure →</Text></Pressable>
      {error ? <ErrorState message={error} /> : null}
      {kycRequired ? <Pressable onPress={() => router.push('/account/kyc')}><Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 12 }}>Complete identity verification →</Text></Pressable> : null}
      {profileQuery.isLoading || profileQuery.isFetching ? <Card><Text style={{ color: colors.mutedForeground }}>Checking your identity-verification status before enabling investments…</Text></Card> : null}
      {profileQuery.isError ? <ErrorState message="Investment access is unavailable because your verification status could not be confirmed." onRetry={() => void profileQuery.refetch()} /> : null}
      {!profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && !kycVerified ? <Card style={{ borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', flex: 1 }}>Verification required to invest</Text>
          <Status value={kycStatus} />
        </View>
        <Text style={{ color: colors.mutedForeground, lineHeight: 20, marginTop: 8 }}>Investments are available only after OG Exports reports your KYC status as Verified. Deposits and withdrawals are not affected by this investment requirement.</Text>
        <View style={{ marginTop: 12 }}><Action title="Complete identity verification" icon="shield" onPress={() => router.push('/account/kyc')} /></View>
      </Card> : null}
      {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Investment request submitted</Text>
        {first(confirmation, ['message']) ? <Text style={{ color: colors.mutedForeground, marginTop: 7, lineHeight: 19 }}>{first(confirmation, ['message'])}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}><Text style={{ color: colors.mutedForeground }}>Server status</Text><Status value={first(confirmation, ['status'], 'Not provided')} /></View>
        <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Reference: {String(confirmation.reference)}</Text>
        {first(confirmation, ['date']) ? <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Date: {first(confirmation, ['date'])}</Text> : null}
        <Text style={{ color: colors.mutedForeground, marginTop: 5 }}>Amount submitted: {money(Number(confirmation.amount), currency)}</Text>
        <View style={{ marginTop: 14 }}><Action title="View portfolio" icon="pie-chart" onPress={() => router.push('/account/portfolio')} /></View>
      </Card> : null}
      {kycVerified && stage === 'amount' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: 5 }}>Invest in this opportunity</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>Investments are funded from your wallet. OG Exports checks eligibility, available balance and verification status before accepting an investment.</Text>
        {walletBalance != null ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 12 }}>Available wallet balance · {money(walletBalance, walletCurrency)}</Text> : walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>Wallet balance could not be checked; the server will validate it before accepting an investment.</Text> : null}
        <Field label={`Amount (${currency})`} value={investAmount} onChangeText={setInvestAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
        <Action title="Continue to payment" icon="arrow-right" disabled={!investAmount} onPress={continueToPayment} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Fee and currency-conversion estimates are not provided by the investor API. The server response is authoritative.</Text>
      </Card> : null}
      {kycVerified && stage === 'payment' ? <Card>
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
      {kycVerified && stage === 'review' ? <Card>
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