import React, { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  getGetInvestorProjectQueryKey,
  getGetInvestorProfileQueryKey,
  getGetInvestorWalletQueryKey,
  getGetPublicInvestorAppSettingsQueryKey,
  useGetInvestorProfile,
  useGetInvestorProject,
  useGetInvestorWallet,
  useGetPublicInvestorAppSettings,
  useInvestInProject,
} from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Section, Status, SuccessMark } from '@/components/InvestorUI';
import { amount, first, list, messageOf, record, unwrap, money, moneyInSourceCurrency } from '@/lib/data';
import { TradeTimeline } from '@/components/TradeTimeline';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';
import { getInvestorKycStatus, isInvestorKycVerified } from '@/lib/kyc';
import { verifyAppPin } from '@/lib/app-pin';

export default function OpportunityDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token, apiOrigin, user, appPinEnabled, biometricEnabled } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const query = useGetInvestorProject(id, { query: { queryKey: getGetInvestorProjectQueryKey(id), enabled: Boolean(id && token) } });
  const profileQuery = useGetInvestorProfile({ query: { queryKey: getGetInvestorProfileQueryKey(), enabled: !!token } });
  const walletQuery = useGetInvestorWallet({ query: { queryKey: getGetInvestorWalletQueryKey(), enabled: !!token, staleTime: 30_000 } });
  const settingsQuery = useGetPublicInvestorAppSettings({ query: { queryKey: getGetPublicInvestorAppSettingsQueryKey(), staleTime: 300_000 } });
  const invest = useInvestInProject();
  const [investAmount, setInvestAmount] = useState('');
  const [stage, setStage] = useState<'details' | 'amount' | 'allocation' | 'review' | 'risk' | 'confirmation' | 'success'>('details');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [pin, setPin] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [documentBusy, setDocumentBusy] = useState('');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const project = unwrap(query.data);
  const appSettings = unwrap(settingsQuery.data);
  const siteSettings = record(appSettings.site);
  const investorProfile = unwrap(profileQuery.data);
  const kycStatus = getInvestorKycStatus(investorProfile);
  const kycVerified = !profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && isInvestorKycVerified(investorProfile);
  const wallet = unwrap(walletQuery.data);
  const target = amount(project, ['target_amount', 'funding_target', 'amount']);
  const fundedAmount = amount(project, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
  const remainingFunding = amount(project, ['remaining_capacity', 'remaining_funding', 'remaining_amount'])
    ?? (target != null && fundedAmount != null ? Math.max(0, target - fundedAmount) : null);
  const minimum = amount(project, ['minimum_investment', 'min_investment']);
  const maximum = amount(project, ['maximum_investment', 'max_investment']);
  const walletBalance = amount(wallet, ['available_balance', 'balance', 'available']);
  const currency = first(project, ['currency']);
  const walletCurrency = first(wallet, ['currency']);
  const documents = list(project.documents);
  const timeline = list(project.trade_updates);
  const tradeId = first(project, ['trade_id', 'trade_code', 'code', 'reference'], 'Not provided');
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
  const formatTradeMoney = (value: number | null) => value == null || !tradeCurrency ? 'Unavailable' : money(value, tradeCurrency);
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
  const flowSteps = ['Amount', 'Allocation', 'Review', 'Risk disclosure', 'Confirmation', 'Success'];
  const activeFlowStep = Math.max(1, flowSteps.indexOf(stage === 'details' ? 'Amount' : stage === 'success' ? 'Success' : stage === 'confirmation' ? 'Confirmation' : stage === 'risk' ? 'Risk disclosure' : stage === 'review' ? 'Review' : stage === 'allocation' ? 'Allocation' : 'Amount') + 1);
  const currencyLabel = currency || 'Currency unavailable';
  const remainingCapacity = remainingFunding;
  const plainPolicyText = (value: string) => value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
  const siteContent = (keys: string[]) => {
    const rawContent = keys.map(key => {
      const value = siteSettings[key];
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') {
        const entry = record(value);
        for (const contentKey of ['content', 'body', 'text', 'description']) {
          const text = entry[contentKey];
          if (typeof text === 'string' && text.trim()) return text;
        }
      }
      return '';
    }).find(value => value.trim().length > 0);
    return rawContent ? plainPolicyText(rawContent) : '';
  };
  const termsContent = siteContent(['terms', 'terms_of_service', 'terms_and_conditions', 'terms_content', 'terms_of_service_content']);
  const riskContent = siteContent(['risk_disclosure', 'investment_risk_disclosure', 'risk_disclaimer', 'risk_disclosure_content']);
  const termsRequired = Boolean(termsContent);
  const riskRequired = Boolean(riskContent);
  const legalContentReady = !settingsQuery.isLoading && !settingsQuery.isFetching && !settingsQuery.isError && termsRequired && riskRequired;
  const feeValue = first(project, ['investment_fee', 'investor_fee', 'fee', 'fees', 'transaction_fee', 'platform_fee']);
  const cycleValue = first(project, ['estimated_trade_cycle', 'trade_cycle', 'duration', 'term'], first(project, ['projected_cycle', 'expected_timeline'], 'Not provided'));
  const distributionValue = first(project, ['target_distribution', 'projected_distribution', 'estimated_distribution', 'target_return', 'projected_return', 'expected_return', 'return_rate', 'roi'], 'Not provided');
  const projectTitle = first(project, ['title', 'name', 'project_name'], 'Trade opportunity');
  const projectTradeAssociation = first(project, ['trade_id', 'trade_code', 'code', 'reference'], 'Not provided');
  const tradeLabel = projectTradeAssociation !== 'Not provided'
    ? `Trade #${projectTradeAssociation}`
    : 'Trade ID not provided by OG Exports';
  const containerAssociation = first(project, ['container_id', 'container_number', 'container_code', 'container_reference'], '');

  function continueToAllocation() {
    setError('');
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
    if (!currency) {
      setError('OG Exports has not supplied the opportunity currency. An amount cannot be safely submitted.');
      return;
    }
    const value = Number(investAmount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter an investment amount greater than zero.'); return; }
    if (currency && minimum != null && value < minimum) { setError(`The minimum investment for this opportunity is ${moneyInSourceCurrency(minimum, currency)}.`); return; }
    if (currency && maximum != null && value > maximum) { setError(`The maximum investment for this opportunity is ${moneyInSourceCurrency(maximum, currency)}.`); return; }
    if (currency && walletCurrency && walletBalance != null && walletCurrency.toUpperCase() === currency.toUpperCase() && value > walletBalance) { setError('This amount is greater than your available wallet balance.'); return; }
    if (currency && remainingCapacity != null && value > remainingCapacity) { setError('This amount exceeds the remaining opportunity capacity.'); return; }
    setStage('allocation');
  }

  function continueToReview() {
    setError('');
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
    setStage('review');
  }

  async function submit() {
    setError('');
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
    if (!legalContentReady || !termsAccepted || !riskAccepted) {
      setError('Read the published Terms of Service and Risk Disclosure, then acknowledge each separately before proceeding.');
      return;
    }
    const userId = first(record(user), ['id']);
    if (!userId) { setError('Your signed-in account could not be verified. Sign in again before investing.'); return; }
    if (!appPinEnabled && !biometricEnabled) {
      setError('Set up an app PIN or enable biometric sign-in in Account security before confirming an investment.');
      return;
    }
    setAuthBusy(true);
    try {
      let authenticated = false;
      if (appPinEnabled && pin.length === 6) {
        const result = await verifyAppPin(pin, userId);
        setPin('');
        if (!result.valid) throw new Error(result.lockedUntil
          ? 'Too many incorrect PIN attempts. Wait one minute before trying again.'
          : 'The app PIN is incorrect.');
        authenticated = true;
      } else if (appPinEnabled && !biometricEnabled) {
        throw new Error('Enter your six-digit app PIN to confirm this investment.');
      }
      if (!authenticated && biometricEnabled) {
        if (Platform.OS === 'web') throw new Error('Device biometric confirmation is not available here. Use your app PIN or continue in the mobile app.');
        const [hardware, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (!hardware || !enrolled) throw new Error('Biometric confirmation is unavailable on this device. Set up an app PIN in Account security.');
        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm this investment',
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
        });
        if (!authResult.success) throw new Error('Device authentication was not completed.');
        authenticated = true;
      }
      if (!authenticated) throw new Error('Investment confirmation requires your app PIN or enabled device biometrics.');
      const response = record(await invest.mutateAsync({ id, data: { amount: Number(investAmount) } }));
      const payload = record(response.data);
      const investment = record(payload.investment ?? payload.position ?? response.investment ?? payload);
      const investmentId = first(investment, ['investment_id', 'id'], first(payload, ['investment_id', 'id'], first(response, ['investment_id', 'id'])));
      const returnedTradeId = first(investment, ['trade_id', 'trade_code'], first(payload, ['trade_id', 'trade_code'], first(response, ['trade_id', 'trade_code'])));
      const responseStatus = first(investment, ['status', 'state'], first(payload, ['status', 'state'], first(response, ['status', 'state'], 'Not provided')));
      const message = first(payload, ['message'], first(response, ['message'], first(investment, ['message'])));
      if (/^(failed|error|rejected|declined|cancelled|canceled)$/i.test(responseStatus.trim())) {
        throw new Error(message || `OG Exports reported that this investment request was ${responseStatus}.`);
      }
      const responseAmount = amount(investment, ['amount', 'investment_amount']) ?? amount(payload, ['amount', 'investment_amount']) ?? amount(response, ['amount', 'investment_amount']);
      const responseDate = first(investment, ['created_at', 'date'], first(payload, ['created_at', 'date'], first(response, ['created_at', 'date'])));
      setConfirmation({
        status: responseStatus,
        message,
        id: investmentId,
        tradeId: returnedTradeId || projectTradeAssociation,
        amount: responseAmount,
        date: responseDate,
      });
      setStage('success');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetInvestorWalletQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ['investor-wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-positions'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] }),
      ]);
    } catch (err) { setError(messageOf(err)); }
    finally { setAuthBusy(false); setPin(''); }
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
  return <Screen
    title={stage === 'details' ? 'Trade Opportunity' : 'Invest in this trade'}
    subtitle={stage === 'details'
      ? first(project, ['commodity_name', 'commodity', 'destination'], 'Trade details')
      : `${flowSteps[activeFlowStep - 1]} · Step ${activeFlowStep} of 6`}
  >
    {stage !== 'details' ? <View accessibilityRole="progressbar" accessibilityLabel={`Investment flow step ${activeFlowStep} of 6`} style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
      {flowSteps.map((label, index) => {
        const complete = index + 1 <= activeFlowStep;
        return <View key={label} style={{ flex: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center', backgroundColor: complete ? colors.primary : colors.secondary }}>
          <Text style={{ color: complete ? colors.primaryForeground : colors.mutedForeground, fontSize: 8, fontWeight: '700', textAlign: 'center' }}>{index + 1}. {label}</Text>
        </View>;
      })}
    </View> : null}
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading opportunity details…</Text></Card> : null}
    {query.isError ? <ErrorState message="Opportunity details could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      {stage === 'details' ? <>
      <Section title="Trade overview" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>TRADE ID</Text><Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{tradeId}</Text></View>
          <Status value={first(project, ['status', 'state'], 'Not provided')} />
        </View>
        {first(project, ['description', 'summary']) ? <Text style={{ color: colors.foreground, lineHeight: 22, marginTop: 14 }}>{first(project, ['description', 'summary'])}</Text> : null}
      </Card>
      {profileQuery.isLoading || profileQuery.isFetching ? <Card><Text style={{ color: colors.mutedForeground }}>Checking your identity-verification status before enabling investments…</Text></Card> : null}
      {profileQuery.isError ? <ErrorState message="Investment access is unavailable because your verification status could not be confirmed." error={profileQuery.error} onRetry={() => void profileQuery.refetch()} /> : null}
      {!profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && !kycVerified ? <Card style={{ borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', flex: 1 }}>Verification required to invest</Text>
          <Status value={kycStatus} />
        </View>
        <Text style={{ color: colors.mutedForeground, lineHeight: 20, marginTop: 8 }}>Investments are available only after OG Exports reports your KYC status as Verified. Deposits and withdrawals are not affected by this investment requirement.</Text>
        <View style={{ marginTop: 12 }}><Action title="Complete identity verification" icon="shield" onPress={() => router.push('/account/kyc')} /></View>
      </Card> : null}
      {kycVerified ? <Card style={{ borderColor: colors.primary }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Invest in this trade</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 14 }}>
          Review the opportunity above, then enter a focused investment flow. Funding is requested from your wallet balance and validated by OG Exports.
        </Text>
        <Action title="Invest Now" icon="arrow-right" onPress={() => { setError(''); setStage('amount'); }} />
      </Card> : null}

      <TradeTimeline events={timeline} apiOrigin={apiOrigin} title="Trade updates" />

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
        <Pressable testID="project-view-container-record" accessibilityRole="button" onPress={() => router.push({ pathname: '/tracking/[id]', params: { id, source: 'project' } })} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderRadius: 12, backgroundColor: colors.primary }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>View container record</Text>
          <Feather name="arrow-up-right" size={15} color={colors.primaryForeground} />
        </Pressable>
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
      {error ? <ErrorState message={error} /> : null}
      {kycRequired ? <Pressable onPress={() => router.push('/account/kyc')}><Text style={{ color: colors.primary, fontWeight: '700', marginBottom: 12 }}>Complete identity verification →</Text></Pressable> : null}
      </> : null}
      {stage !== 'details' && (profileQuery.isLoading || profileQuery.isFetching) ? <Card><Text style={{ color: colors.mutedForeground }}>Rechecking your identity-verification status…</Text></Card> : null}
      {stage !== 'details' && profileQuery.isError ? <ErrorState message="Investment access is unavailable because your verification status could not be confirmed." error={profileQuery.error} onRetry={() => void profileQuery.refetch()} /> : null}
      {stage !== 'details' && !profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && !kycVerified ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Verified identity required</Text>
        <Text style={{ color: colors.mutedForeground, lineHeight: 20, marginTop: 8 }}>OG Exports no longer reports this account as verified. The investment flow is blocked until verification is complete.</Text>
        <View style={{ marginTop: 12 }}><Action title="Complete identity verification" icon="shield" onPress={() => router.push('/account/kyc')} /></View>
        <View style={{ marginTop: 9 }}><Action title="Back to trade details" secondary onPress={() => setStage('details')} /></View>
      </Card> : null}
      {kycVerified && stage === 'amount' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>01 · Set your amount</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 5, marginBottom: 16 }}>
          Your amount is checked against the opportunity and wallet values supplied by OG Exports. Missing figures remain server-authoritative.
        </Text>
        <Field label={`Investment amount · ${currencyLabel}`} value={investAmount} onChangeText={value => setInvestAmount(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          {[
            ['Minimum investment', minimum == null ? 'Unavailable' : formatTradeMoney(minimum)],
          ['Available wallet balance', walletBalance == null || !walletCurrency ? 'Unavailable' : moneyInSourceCurrency(walletBalance, walletCurrency)],
            ['Remaining opportunity capacity', remainingCapacity == null ? 'Unavailable' : formatTradeMoney(remainingCapacity)],
          ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
            <Text style={{ color: value === 'Unavailable' ? colors.mutedForeground : colors.foreground, fontWeight: '700', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>)}
        </View>
        {walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Wallet balance could not be loaded. The server remains authoritative.</Text> : null}
        {!currency ? <Text style={{ color: colors.destructive, fontSize: 11, lineHeight: 17, marginTop: 10 }}>The opportunity currency is not available. An amount cannot be safely submitted until OG Exports supplies it.</Text> : null}
        {walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Wallet balance could not be loaded. The server remains authoritative.</Text> : null}
        {error ? <ErrorState message={error} /> : null}
        <View style={{ marginTop: 15 }}><Action title="Continue to allocation" icon="arrow-right" disabled={!investAmount || !currency} onPress={continueToAllocation} /></View>
        <View style={{ marginTop: 9 }}><Action title="Cancel investment flow" secondary onPress={() => setStage('details')} /></View>
      </Card> : null}
      {kycVerified && stage === 'allocation' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>02 · Trade allocation</Text>
        <View style={{ backgroundColor: colors.lightGreen, borderRadius: 14, padding: 15, marginTop: 14, marginBottom: 13 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>YOUR INVESTMENT</Text>
          <Text style={{ color: colors.primary, fontSize: 26, fontWeight: '700', marginTop: 5 }}>{moneyInSourceCurrency(Number(investAmount), currency)}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>{projectTitle}</Text>
        </View>
        <Card style={{ borderColor: colors.border, marginBottom: 12 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>TRADE RECORD</Text>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 5 }}>{tradeLabel}</Text>
          {containerAssociation ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 8 }}>Container reference supplied for this record: {containerAssociation}</Text> : null}
          <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 9 }}>
            This investment request is submitted against the trade opportunity record shown here. The investor API associates this request through this project record; no separate allocation details are provided.
          </Text>
        </Card>
        <Action title="Review investment" icon="arrow-right" onPress={continueToReview} />
        <View style={{ marginTop: 9 }}><Action title="Back to amount" secondary onPress={() => setStage('amount')} /></View>
      </Card> : null}
      {kycVerified && stage === 'review' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>03 · Review commitment</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Confirm the trade and money movement details before moving to the published terms.</Text>
        {[
          ['Your investment', moneyInSourceCurrency(Number(investAmount), currency)],
          ['Trade', tradeLabel],
          ['Fees', feeValue || 'Not provided by OG Exports'],
          ['Trade cycle', cycleValue],
          ['Target / projected distribution', distributionValue],
          ['Payment method', 'Wallet balance'],
        ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: value === 'Not provided by OG Exports' || value === 'Not provided' ? colors.mutedForeground : colors.foreground, fontWeight: '700', flex: 1, textAlign: 'right' }}>{value}</Text>
        </View>)}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>No fee, conversion, or return is estimated here. Any available terms above are supplied by the opportunity record.</Text>
        <View style={{ marginTop: 15 }}><Action title="Continue to risk disclosure" icon="arrow-right" onPress={() => { setError(''); setStage('risk'); }} /></View>
        <View style={{ marginTop: 9 }}><Action title="Back to allocation" secondary onPress={() => setStage('allocation')} /></View>
      </Card> : null}
      {kycVerified && stage === 'risk' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>04 · Official terms & risk</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 5, marginBottom: 12 }}>
          Review the published documents provided in OG Exports app settings. Acknowledgements are separate and required to continue.
        </Text>
        {settingsQuery.isLoading || settingsQuery.isFetching ? <Card><Text style={{ color: colors.mutedForeground }}>Loading published legal content…</Text></Card> : null}
        {settingsQuery.isError ? <ErrorState message="Published Terms of Service and Risk Disclosure could not be loaded. Retry before continuing." error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} /> : null}
        {!settingsQuery.isLoading && !settingsQuery.isFetching && !settingsQuery.isError && !termsRequired ? <Card style={{ borderColor: colors.destructive }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Terms of Service unavailable</Text>
          <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 5 }}>Official Terms of Service have not been published in investor app settings. You cannot acknowledge or submit this investment until they are available.</Text>
        </Card> : null}
        {termsRequired ? <Card>
          <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 8 }}>Terms of Service</Text>
          <Text selectable style={{ color: colors.mutedForeground, lineHeight: 20, fontSize: 12 }}>{termsContent}</Text>
          <Pressable testID="investment-terms-acknowledgement" accessibilityRole="checkbox" accessibilityState={{ checked: termsAccepted }} onPress={() => setTermsAccepted(value => !value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 15 }}>
            <View style={{ width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: termsAccepted ? colors.primary : colors.border, backgroundColor: termsAccepted ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>{termsAccepted ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}</View>
            <Text style={{ flex: 1, color: colors.foreground, lineHeight: 19, fontSize: 12 }}>I acknowledge the published Terms of Service.</Text>
          </Pressable>
        </Card> : null}
        {!settingsQuery.isLoading && !settingsQuery.isFetching && !settingsQuery.isError && !riskRequired ? <Card style={{ borderColor: colors.destructive }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Risk Disclosure unavailable</Text>
          <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 5 }}>Official risk-disclosure content has not been published in investor app settings. You cannot acknowledge or submit this investment until it is available.</Text>
        </Card> : null}
        {riskRequired ? <Card>
          <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 8 }}>Risk Disclosure</Text>
          <Text selectable style={{ color: colors.mutedForeground, lineHeight: 20, fontSize: 12 }}>{riskContent}</Text>
          <Pressable testID="investment-risk-acknowledgement" accessibilityRole="checkbox" accessibilityState={{ checked: riskAccepted }} onPress={() => setRiskAccepted(value => !value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 15 }}>
            <View style={{ width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: riskAccepted ? colors.primary : colors.border, backgroundColor: riskAccepted ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>{riskAccepted ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}</View>
            <Text style={{ flex: 1, color: colors.foreground, lineHeight: 19, fontSize: 12 }}>I acknowledge the published Risk Disclosure.</Text>
          </Pressable>
        </Card> : null}
        {error ? <ErrorState message={error} /> : null}
        <Action title="Continue to confirmation" icon="arrow-right" disabled={!legalContentReady || !termsAccepted || !riskAccepted} onPress={() => { setError(''); setStage('confirmation'); }} />
        <View style={{ marginTop: 9 }}><Action title="Back to review" secondary onPress={() => setStage('review')} /></View>
      </Card> : null}
      {kycVerified && stage === 'confirmation' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>05 · Confirm on this device</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 13 }}>
          Authenticate locally before the investment request is sent. This device confirmation is separate from account sign-in verification.
        </Text>
        {!appPinEnabled && !biometricEnabled ? <Card style={{ borderColor: colors.destructive }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Device confirmation is not configured</Text>
          <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 5 }}>Set an app PIN or enable device biometrics in Account security before investing.</Text>
          <View style={{ marginTop: 12 }}><Action title="Open Account security" icon="shield" onPress={() => router.push('/account/security')} /></View>
        </Card> : null}
        {appPinEnabled ? <Field label="Six-digit app PIN" value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" keyboardType="numeric" secureTextEntry autoCapitalize="none" /> : null}
        {biometricEnabled ? <View style={{ backgroundColor: colors.lightGreen, borderRadius: 12, padding: 12, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Feather name="smartphone" size={17} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, flex: 1 }}>Device biometric confirmation is enabled. It will be checked on this device before submitting.</Text>
        </View> : null}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 12, padding: 13, marginBottom: 14 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>REQUEST SUMMARY</Text>
          <Text style={{ color: colors.foreground, fontWeight: '700', marginTop: 6 }}>{moneyInSourceCurrency(Number(investAmount), currency)} · {tradeLabel}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>Payment method: Wallet balance</Text>
        </View>
        {error ? <ErrorState message={error} /> : null}
        <Action title="Authenticate & submit request" icon="lock" loading={authBusy || invest.isPending} disabled={(!appPinEnabled && !biometricEnabled) || (appPinEnabled && !biometricEnabled && pin.length !== 6)} onPress={() => void submit()} />
        <View style={{ marginTop: 9 }}><Action title="Back to risk disclosure" secondary onPress={() => { setPin(''); setStage('risk'); }} /></View>
        <Pressable onPress={() => router.push('/account/security')} style={{ alignSelf: 'center', padding: 12 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Manage confirmation methods</Text></Pressable>
      </Card> : null}
      {kycVerified && stage === 'success' && confirmation ? (() => {
        const status = first(confirmation, ['status'], 'Not provided');
        const investmentId = first(confirmation, ['id']);
        const serverConfirmed = /^confirmed$/i.test(status.trim());
        const resultAmount = typeof confirmation.amount === 'number' ? moneyInSourceCurrency(confirmation.amount, currency) : 'Unavailable';
        return <Card style={{ borderColor: colors.primary }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <Feather name={serverConfirmed ? 'check' : 'send'} size={21} color={colors.primary} />
          </View>
          <SuccessMark icon={serverConfirmed ? 'check' : 'clock'} />
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>{serverConfirmed ? 'Investment Confirmed' : 'Investment request submitted'}</Text>
          {first(confirmation, ['message']) ? <Text style={{ color: colors.mutedForeground, marginTop: 7, lineHeight: 19 }}>{first(confirmation, ['message'])}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.mutedForeground }}>Server status</Text><Status value={status} /></View>
          {[
            ['Investment ID', investmentId || 'Unavailable'],
            ['Trade ID', first(confirmation, ['tradeId'], 'Unavailable')],
            ['Amount', resultAmount],
            ['Date', first(confirmation, ['date'], 'Unavailable')],
          ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.mutedForeground }}>{label}</Text><Text style={{ color: value === 'Unavailable' ? colors.mutedForeground : colors.foreground, fontWeight: '700', flex: 1, textAlign: 'right' }}>{value}</Text>
          </View>)}
          <View style={{ marginTop: 15 }}>
            <Action title="View Investment" icon="briefcase" onPress={() => investmentId ? router.push({ pathname: '/position/[id]', params: { id: investmentId } }) : router.push('/account/portfolio')} />
          </View>
          <View style={{ marginTop: 9 }}><Action title="Track Trade" secondary icon="map" onPress={() => router.push({ pathname: '/tracking/[id]', params: { id, source: 'project' } })} /></View>
        </Card>;
      })() : null}
    </> : null}
  </Screen>;
}
