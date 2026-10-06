import React, { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  getGetInvestorDashboardQueryKey,
  getGetInvestorInvestmentsQueryKey,
  getGetInvestorProjectQueryKey,
  getGetInvestorProjectsQueryKey,
  getGetInvestorProfileQueryKey,
  getGetInvestorWalletQueryKey,
  getGetPublicInvestorAppSettingsQueryKey,
  useGetInvestorProfile,
  useGetInvestorProject,
  useGetInvestorWallet,
  useGetPublicInvestorAppSettings,
  useInvestInProject,
} from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status, SuccessMark } from '@/components/InvestorUI';
import { amount, first, messageOf, record, unwrap, money, moneyInSourceCurrency } from '@/lib/data';
import { OpportunityDetailOverview } from '@/components/OpportunityDetailOverview';
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
  const [stage, setStage] = useState<'details' | 'amount' | 'review' | 'risk' | 'confirmation' | 'success'>('details');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pin, setPin] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [documentBusy, setDocumentBusy] = useState('');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const project = unwrap(query.data);
  const tradeData = record(project.trade ?? project.project ?? project.trade_details);
  const appSettings = unwrap(settingsQuery.data);
  const siteSettings = record(appSettings.site);
  const supportEmail = first(siteSettings, ['support_email', 'supportEmail'], 'support@ogexports.co');
  const investorProfile = unwrap(profileQuery.data);
  const kycStatus = getInvestorKycStatus(investorProfile);
  const kycVerified = !profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && isInvestorKycVerified(investorProfile);
  const wallet = unwrap(walletQuery.data);
  const remainingFunding = amount(project, ['remaining_amount', 'remaining_capacity', 'remaining_funding']);
  const minimum = amount(project, ['minimum_investment', 'min_investment']);
  const maximum = amount(project, ['maximum_investment', 'max_investment']);
  const walletBalance = amount(wallet, ['available_balance', 'balance', 'available']);
  const currency = first(project, ['currency', 'investment_currency'], first(tradeData, ['currency', 'investment_currency']));
  const walletCurrency = first(wallet, ['currency']);
  const tradeCurrency = currency;
  const reportedReturn = first(project, ['roi_label', 'target_return', 'projected_return', 'expected_return', 'return_rate', 'roi']);
  const returnRate = amount(project, ['expected_return_pct']);
  const projectedReturn = reportedReturn || (returnRate != null ? `${returnRate}%` : '');
  const projectedDistribution = first(project, ['target_distribution', 'projected_distribution', 'estimated_distribution']);
  const projectedCycle = first(project, ['projected_cycle', 'expected_timeline'], amount(project, ['investment_period_days']) == null ? '' : `${amount(project, ['investment_period_days'])} days`);
  const investmentStatus = [
    'trade_status',
    'project_status',
    'funding_status',
    'investment_status',
    'availability_status',
    'investment_availability',
    'status',
    'state',
  ].map(key => first(project, [key])).filter(Boolean).join(' ');
  const normalizedInvestmentStatus = investmentStatus.toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const investmentFlags = [
    'can_invest',
    'is_investable',
    'investable',
    'accepting_investments',
    'is_open_for_investment',
    'is_available_for_investment',
  ].map(key => first(project, [key]).toLowerCase()).filter(value => /^(true|yes|1|false|no|0)$/.test(value));
  const explicitCanInvest = investmentFlags.some(value => /^(false|no|0)$/.test(value)) ? false
    : investmentFlags.some(value => /^(true|yes|1)$/.test(value)) ? true
      : null;
  const closedStatus = /\b(closed|complete|completed|settled|delivered|disbursed|cancelled|canceled|rejected|expired|fully funded|unavailable|not available|not open|not accepting|not funding|inactive|paused|suspended|withdrawn|on hold)\b/.test(normalizedInvestmentStatus);
  const openStatus = /\b(open|funding|fundrais(?:e|ing)|available|accepting)\b/.test(normalizedInvestmentStatus);
  const fundingClosed = closedStatus || explicitCanInvest === false || (remainingFunding != null && remainingFunding <= 0);
  const investmentAvailable = !fundingClosed && (openStatus || explicitCanInvest === true);
  const flowSteps = ['Amount', 'Review', 'Terms & risk', 'Secure confirmation', 'Complete'];
  const activeFlowStep = ({ details: 0, amount: 1, review: 2, risk: 3, confirmation: 4, success: 5 } as const)[stage];
  const currencyLabel = currency || 'Currency unavailable';
  const remainingCapacity = remainingFunding;
  const formatTradeMoney = (value: number | null) => money(value, tradeCurrency || 'USD');
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
  const cycleValue = first(project, ['estimated_trade_cycle', 'trade_cycle', 'duration', 'term'], projectedCycle || '—');
  const distributionValue = first(project, ['target_distribution', 'projected_distribution', 'estimated_distribution'], '—');
  const projectTradeAssociation = first(project, ['trade_id', 'trade_code', 'code', 'reference'], '—');
  const tradeLabel = projectTradeAssociation !== '—'
    ? `Trade #${projectTradeAssociation}`
    : '—';

  function continueToReview() {
    setError('');
    if (!investmentAvailable) {
      setError('This opportunity is not currently accepting investments.');
      setStage('details');
      return;
    }
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
    setStage('review');
  }

  async function submit() {
    setError('');
    if (!investmentAvailable) {
      setError('This opportunity is no longer accepting investments. Refresh the opportunity before trying again.');
      setStage('details');
      return;
    }
    if (!kycVerified) {
      setError('Investment access requires a Verified identity status from OG Exports.');
      router.push('/account/kyc');
      return;
    }
    if (!legalContentReady || !termsAccepted || !riskAccepted || !agreementAccepted) {
      setError('Read the published Terms of Service and Risk Disclosure, then acknowledge each and the investment request separately before proceeding.');
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
      const responseStatus = first(investment, ['status', 'state'], first(payload, ['status', 'state'], first(response, ['status', 'state'], '—')));
      const message = first(payload, ['message'], first(response, ['message'], first(investment, ['message'])));
      if (/^(failed|error|rejected|declined|cancelled|canceled)$/i.test(responseStatus.trim())) {
        throw new Error(message || `OG Exports reported that this investment request was ${responseStatus}.`);
      }
      const responseAmount = amount(investment, ['amount', 'investment_amount']) ?? amount(payload, ['amount', 'investment_amount']) ?? amount(response, ['amount', 'investment_amount']);
      const responseDate = first(investment, ['invested_at', 'created_at', 'date'], first(payload, ['invested_at', 'created_at', 'date'], first(response, ['invested_at', 'created_at', 'date'])));
      setConfirmation({
        status: responseStatus,
        message,
        id: investmentId,
        reference: first(investment, ['reference', 'investment_reference'], first(payload, ['reference', 'investment_reference'])),
        tradeId: returnedTradeId || projectTradeAssociation,
        amount: responseAmount,
        amountCurrency: first(investment, ['amount_currency', 'currency'], first(payload, ['amount_currency', 'currency'], currency)),
        amountPkr: amount(investment, ['amount_pkr']) ?? amount(payload, ['amount_pkr']),
        exchangeRate: amount(investment, ['exchange_rate']) ?? amount(payload, ['exchange_rate']),
        date: responseDate,
      });
      setStage('success');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetInvestorWalletQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetInvestorInvestmentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetInvestorDashboardQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetInvestorProjectQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getGetInvestorProjectsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ['investor-wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['investor-projects'] }),
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
      : `${flowSteps[activeFlowStep - 1]} · Step ${activeFlowStep} of 5`}
  >
    {stage !== 'details' ? <View accessibilityRole="progressbar" accessibilityLabel={`Investment flow step ${activeFlowStep} of 5`} style={{ flexDirection: 'row', gap: 4, marginBottom: 14 }}>
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
      {stage === 'details' ? <OpportunityDetailOverview
        key={id}
        project={project}
        apiOrigin={apiOrigin}
        canInvest={investmentAvailable}
        fundingClosed={fundingClosed}
        profileLoading={profileQuery.isLoading || profileQuery.isFetching}
        profileError={profileQuery.isError ? profileQuery.error : undefined}
        kycVerified={kycVerified}
        kycStatus={kycStatus}
        pageError={error}
        supportEmail={supportEmail}
        riskContent={riskContent}
        riskLoading={settingsQuery.isLoading || settingsQuery.isFetching}
        riskError={settingsQuery.isError ? settingsQuery.error : undefined}
        documentError={documentError}
        documentBusy={documentBusy}
        onBack={() => router.back()}
        onInvest={() => {
          if (!investmentAvailable) return;
          setError('');
          if (!kycVerified) {
            router.push('/account/kyc');
            return;
          }
          setStage('amount');
        }}
        onVerify={() => router.push('/account/kyc')}
        onRetryKyc={() => void profileQuery.refetch()}
        onRetryRisk={() => void settingsQuery.refetch()}
        onViewDocument={url => void viewProjectDocument(url)}
        onDownloadDocument={(document, url, key) => void downloadProjectDocument(document, url, key)}
        onSupport={() => {
          void Linking.openURL(`mailto:${encodeURIComponent(supportEmail)}`).catch(err => setError(messageOf(err)));
        }}
      /> : null}
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
        <Field label={`Investment amount · ${currencyLabel}`} value={investAmount} onChangeText={value => {
          const nextAmount = value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
          if (nextAmount !== investAmount) setAgreementAccepted(false);
          setInvestAmount(nextAmount);
        }} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
        {currency?.toUpperCase() === 'USD' && walletCurrency.toUpperCase() === 'PKR' ? <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.lightGreen, padding: 12, borderRadius: 12, marginBottom: 14 }}>
          <Feather name="refresh-cw" size={15} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, color: colors.foreground, fontSize: 11, lineHeight: 17 }}>
            Container investments are entered in USD. OG Exports converts the PKR wallet debit at submission; this app does not estimate the exchange rate.
          </Text>
        </View> : null}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          {[
            ['Minimum investment', formatTradeMoney(minimum)],
            ['Available wallet balance', walletQuery.isError && walletBalance == null ? 'Unavailable' : moneyInSourceCurrency(walletBalance, walletCurrency || 'USD')],
            ['Remaining opportunity capacity', formatTradeMoney(remainingCapacity)],
          ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
            <Text style={{ color: value === 'Unavailable' ? colors.mutedForeground : colors.foreground, fontWeight: '700', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>)}
        </View>
        {!currency ? <Text style={{ color: colors.destructive, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Confirm the trade currency before submitting an investment.</Text> : null}
        {walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Wallet balance could not be loaded. The server remains authoritative.</Text> : null}
        {error ? <ErrorState message={error} /> : null}
        <View style={{ marginTop: 15 }}><Action title="Continue to review" icon="arrow-right" disabled={!investAmount || !currency || !investmentAvailable} onPress={continueToReview} /></View>
        <View style={{ marginTop: 9 }}><Action title="Cancel investment flow" secondary onPress={() => setStage('details')} /></View>
      </Card> : null}
      {kycVerified && stage === 'review' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>02 · Review commitment</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Confirm the trade and money movement details before moving to the published terms.</Text>
        {[
          ['Your investment', moneyInSourceCurrency(Number(investAmount), currency)],
          ['Trade', tradeLabel],
          ['Target return · not guaranteed', projectedReturn || '—'],
          ['Target distribution · not guaranteed', distributionValue],
          ['Fees', feeValue || money(null, tradeCurrency || 'USD')],
          ['Trade cycle', cycleValue],
          ['Wallet debit', currency && walletCurrency
            ? currency.toUpperCase() === walletCurrency.toUpperCase()
              ? moneyInSourceCurrency(Number(investAmount), walletCurrency)
              : 'Calculated by OG Exports at submission'
            : 'Validated by OG Exports at submission'],
          ['Payment method', 'Wallet balance'],
        ].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: value === '—' ? colors.mutedForeground : colors.foreground, fontWeight: '700', flex: 1, textAlign: 'right' }}>{value}</Text>
        </View>)}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>No fee, conversion, or return is estimated here. Any available terms above are supplied by the opportunity record.</Text>
        <View style={{ marginTop: 15 }}><Action title="Continue to Terms & risk" icon="arrow-right" onPress={() => { setError(''); setStage('risk'); }} /></View>
        <View style={{ marginTop: 9 }}><Action title="Back to amount" secondary onPress={() => setStage('amount')} /></View>
      </Card> : null}
      {kycVerified && stage === 'risk' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>03 · Official terms & risk</Text>
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
        <Card>
          <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 8 }}>Investment agreement acknowledgement</Text>
          <Text style={{ color: colors.mutedForeground, lineHeight: 19, fontSize: 12 }}>
            This acknowledgement is required to submit the request but is not saved as a consent record in your OG Exports account.
          </Text>
          <Pressable testID="investment-agreement-acknowledgement" accessibilityRole="checkbox" accessibilityState={{ checked: agreementAccepted }} onPress={() => setAgreementAccepted(value => !value)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 15 }}>
            <View style={{ width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: agreementAccepted ? colors.primary : colors.border, backgroundColor: agreementAccepted ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>{agreementAccepted ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}</View>
            <Text style={{ flex: 1, color: colors.foreground, lineHeight: 19, fontSize: 12 }}>I acknowledge the investment details and want to submit this investment request.</Text>
          </Pressable>
        </Card>
        {error ? <ErrorState message={error} /> : null}
        <Action title="Continue to secure confirmation" icon="arrow-right" disabled={!legalContentReady || !termsAccepted || !riskAccepted || !agreementAccepted} onPress={() => { setError(''); setStage('confirmation'); }} />
        <View style={{ marginTop: 9 }}><Action title="Back to review" secondary onPress={() => setStage('review')} /></View>
      </Card> : null}
      {kycVerified && stage === 'confirmation' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700' }}>04 · Confirm on this device</Text>
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
        <View style={{ marginTop: 9 }}><Action title="Back to Terms & risk" secondary onPress={() => { setPin(''); setStage('risk'); }} /></View>
        <Pressable onPress={() => router.push('/account/security')} style={{ alignSelf: 'center', padding: 12 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Manage confirmation methods</Text></Pressable>
      </Card> : null}
      {kycVerified && stage === 'success' && confirmation ? (() => {
        const status = first(confirmation, ['status'], '—');
        const investmentId = first(confirmation, ['id']);
        const serverConfirmed = /^(confirmed|active|approved|success|successful)$/i.test(status.trim());
        const resultCurrency = first(confirmation, ['amountCurrency'], currency);
        const resultAmount = moneyInSourceCurrency(confirmation.amount, resultCurrency || 'USD');
        const resultWalletAmount = typeof confirmation.amountPkr === 'number' ? moneyInSourceCurrency(confirmation.amountPkr, 'PKR') : '';
        const exchangeRate = typeof confirmation.exchangeRate === 'number'
          ? `1 USD = ${confirmation.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 8 })} PKR`
          : '';
        return <Card style={{ borderColor: colors.primary }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', marginBottom: 10 }}>05 · Complete</Text>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }}>
            <Feather name={serverConfirmed ? 'check' : 'send'} size={21} color={colors.primary} />
          </View>
          <SuccessMark icon={serverConfirmed ? 'check' : 'clock'} />
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>{serverConfirmed ? 'Investment Confirmed' : 'Investment request submitted'}</Text>
          {first(confirmation, ['message']) ? <Text style={{ color: colors.mutedForeground, marginTop: 7, lineHeight: 19 }}>{first(confirmation, ['message'])}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.mutedForeground }}>Server status</Text><Status value={status} /></View>
          {[
            ['Investment ID', investmentId || 'Unavailable'],
            ['Investment reference', first(confirmation, ['reference'], 'Unavailable')],
            ['Trade ID', first(confirmation, ['tradeId'], 'Unavailable')],
            ['Amount invested', resultAmount],
            ...(resultWalletAmount ? [['Wallet debit', resultWalletAmount] as [string, string]] : []),
            ...(exchangeRate ? [['Server exchange rate', exchangeRate] as [string, string]] : []),
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
