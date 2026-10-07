import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
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
  useGetInvestorDashboard,
  useGetInvestorProfile,
  useGetInvestorProject,
  useGetInvestorWallet,
  useGetPublicInvestorAppSettings,
  useInvestInProject,
} from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status, SuccessFeedback } from '@/components/InvestorUI';
import { amount, availableBalanceFromDashboard, first, messageOf, record, unwrap, money, moneyInSourceCurrency } from '@/lib/data';
import { OpportunityDetailOverview } from '@/components/OpportunityDetailOverview';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';
import { getInvestorKycStatus, isInvestorKycVerified } from '@/lib/kyc';
import { verifyAppPin } from '@/lib/app-pin';
import { motionHaptic } from '@/lib/motion';

function formatEstimatedDistributionDate(value: string): string {
  const raw = value.trim();
  if (!raw) return '—';

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  let date: Date;
  if (dateParts) {
    const [, year, month, day] = dateParts;
    date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() !== Number(year)
      || date.getUTCMonth() !== Number(month) - 1
      || date.getUTCDate() !== Number(day)
    ) return '—';
  } else {
    date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export default function OpportunityDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token, apiOrigin, user, appPinEnabled, biometricEnabled } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const query = useGetInvestorProject(id, { query: { queryKey: getGetInvestorProjectQueryKey(id), enabled: Boolean(id && token) } });
  const profileQuery = useGetInvestorProfile({ query: { queryKey: getGetInvestorProfileQueryKey(), enabled: !!token } });
  const walletQuery = useGetInvestorWallet({ query: { queryKey: getGetInvestorWalletQueryKey(), enabled: !!token, staleTime: 30_000 } });
  const dashboardQuery = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: !!token, staleTime: 30_000 } });
  const settingsQuery = useGetPublicInvestorAppSettings({ query: { queryKey: getGetPublicInvestorAppSettingsQueryKey(), staleTime: 300_000 } });
  const invest = useInvestInProject();
  const [investAmount, setInvestAmount] = useState('');
  const [stage, setStage] = useState<'details' | 'amount' | 'review' | 'risk' | 'confirmation' | 'success'>('details');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pin, setPin] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [documentBusy, setDocumentBusy] = useState('');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const [successFeedbackVisible, setSuccessFeedbackVisible] = useState(false);
  const project = unwrap(query.data);
  const tradeData = record(project.trade ?? project.project ?? project.trade_details);
  const projectMeta = record(project.meta);
  const tradeMeta = record(tradeData.meta);
  const appSettings = unwrap(settingsQuery.data);
  const siteSettings = record(appSettings.site);
  const supportEmail = first(siteSettings, ['support_email', 'supportEmail'], 'support@ogexports.co');
  const plainPolicyText = (value: string) => value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
  const riskContentRaw = [
    siteSettings.risk_disclosure,
    siteSettings.investment_risk_disclosure,
    siteSettings.risk_disclaimer,
    siteSettings.risk_disclosure_content,
  ].map(value => {
    if (typeof value === 'string') return value;
    const entry = record(value);
    return first(entry, ['content', 'body', 'text', 'description']);
  }).find(value => value.trim().length > 0) ?? '';
  const riskContent = riskContentRaw ? plainPolicyText(riskContentRaw) : '';
  const investorProfile = unwrap(profileQuery.data);
  const kycStatus = getInvestorKycStatus(investorProfile);
  const kycVerified = !profileQuery.isLoading && !profileQuery.isFetching && !profileQuery.isError && isInvestorKycVerified(investorProfile);
  const wallet = unwrap(walletQuery.data);
  const dashboard = unwrap(dashboardQuery.data);
  const dashboardWallet = record(dashboard.wallet);
  const walletCurrency = first(
    dashboardWallet,
    ['currency', 'default_currency'],
    first(wallet, ['currency', 'default_currency']),
  );
  const remainingFunding = amount(project, ['remaining_amount', 'remaining_capacity', 'remaining_funding']);
  const minimum = amount(project, ['minimum_investment', 'min_investment']);
  const maximum = amount(project, ['maximum_investment', 'max_investment']);
  const walletBalance = availableBalanceFromDashboard(dashboardQuery.data);
  const projectType = first(project, ['type'], first(tradeData, ['type'])).toLowerCase();
  const apiCurrencyFallback = projectType === 'container' ? 'USD' : walletCurrency;
  const currency = first(
    project,
    ['currency', 'investment_currency'],
    first(tradeData, ['currency', 'investment_currency'], apiCurrencyFallback),
  );
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
  const flowSteps = ['Amount', 'Review', 'Terms & risk', 'Confirm'];
  const activeFlowStep = ({ details: 0, amount: 1, review: 2, risk: 3, confirmation: 4, success: 4 } as const)[stage];
  const currencyLabel = currency || (walletQuery.isLoading || walletQuery.isFetching ? 'Loading currency…' : 'Currency unavailable');
  const remainingCapacity = remainingFunding;
  const formatTradeMoney = (value: number | null) => money(value, tradeCurrency || 'USD');
  const feeValue = first(project, ['investment_fee', 'investor_fee', 'fee', 'fees', 'transaction_fee', 'platform_fee']);
  const cycleValue = first(project, ['estimated_trade_cycle', 'trade_cycle', 'duration', 'term'], projectedCycle || '—');
  const distributionDateKeys = [
    'target_distribution_date',
    'estimated_distribution_date',
    'expected_distribution_date',
    'expected_payout_date',
    'distribution_date',
    'profit_payout_date',
  ];
  const distributionDateRaw = first(
    project,
    distributionDateKeys,
    first(projectMeta, distributionDateKeys, first(tradeData, distributionDateKeys, first(tradeMeta, distributionDateKeys))),
  );
  const distributionDate = formatEstimatedDistributionDate(distributionDateRaw);
  const projectTradeAssociation = first(project, ['trade_id', 'trade_code', 'code', 'reference'], '—');
  const tradeLabel = projectTradeAssociation !== '—'
    ? `Trade #${projectTradeAssociation}`
    : '—';
  const projectTitle = first(project, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade opportunity');
  const amountFacts: [string, string][] = [
    ['Minimum', formatTradeMoney(minimum)],
    ...(maximum == null ? [] : [['Maximum', formatTradeMoney(maximum)] as [string, string]]),
    ['Wallet balance', walletBalance == null
      ? dashboardQuery.isLoading ? 'Loading…' : 'Unavailable'
      : money(walletBalance, walletCurrency || 'USD')],
    ['Remaining capacity', formatTradeMoney(remainingCapacity)],
  ];
  const amountSummary = currency && Number.isFinite(Number(investAmount)) && Number(investAmount) > 0
    ? moneyInSourceCurrency(Number(investAmount), currency)
    : investAmount ? 'Currency pending' : 'Not entered';

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
    if (!agreementAccepted) {
      setError('Acknowledge the Investment Agreement and risk statement before continuing.');
      return;
    }
    const userId = first(record(user), ['id']);
    if (!userId) { setError('Your signed-in account could not be verified. Sign in again before investing.'); return; }
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
      if ((appPinEnabled || biometricEnabled) && !authenticated) {
        throw new Error('Investment confirmation requires your configured app PIN or enabled device biometrics.');
      }
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
      setSuccessFeedbackVisible(true);
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
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
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
  const confirmedStatus = first(confirmation ?? {}, ['status', 'state'], '—');
  const normalizedConfirmationStatus = confirmedStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const investmentServerCompleted = ['completed', 'settled', 'confirmed', 'success', 'successful'].includes(normalizedConfirmationStatus);
  const investmentServerApproved = ['approved', 'active'].includes(normalizedConfirmationStatus);
  const investmentServerRejected = ['failed', 'error', 'rejected', 'declined', 'cancelled', 'canceled'].includes(normalizedConfirmationStatus);
  const investmentSuccessTitle = investmentServerCompleted
    ? 'Investment confirmed'
    : investmentServerApproved
      ? normalizedConfirmationStatus === 'active' ? 'Investment active' : 'Investment approved'
      : investmentServerRejected ? 'Investment status updated' : 'Investment request submitted';
  const investmentSuccessBody = investmentServerRejected
    ? first(confirmation ?? {}, ['message'], `OG Exports reports this investment as ${confirmedStatus}. Review the returned status before relying on a wallet debit.`)
    : investmentServerApproved
      ? `OG Exports reports this investment as ${confirmedStatus}. This status does not indicate that the investment is complete.`
      : investmentServerCompleted
        ? first(confirmation ?? {}, ['message'], `OG Exports reports this investment as ${confirmedStatus}.`)
        : first(confirmation ?? {}, ['message'], 'Your investment request was received. The returned server status appears in your confirmation.');
  const investmentStageTitle = stage === 'details'
    ? 'Trade Opportunity'
    : stage === 'success'
      ? investmentServerCompleted
        ? 'Investment complete'
        : investmentServerApproved
          ? normalizedConfirmationStatus === 'active' ? 'Investment active' : 'Investment approved'
          : investmentServerRejected ? 'Investment status updated' : 'Investment request submitted'
      : 'Complete your investment';

  return <Screen
    title={investmentStageTitle}
    subtitle={stage === 'details'
      ? first(project, ['commodity_name', 'commodity', 'destination'], 'Trade details')
      : stage === 'success' ? 'Your request status and reference details' : flowSteps[activeFlowStep - 1]}
    action={stage !== 'details' ? <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>
      {stage === 'success' ? 'Complete' : `Step ${activeFlowStep} of ${flowSteps.length}`}
    </Text> : undefined}
  >
    {stage !== 'details' ? <View accessibilityRole="progressbar" accessibilityLabel={`Investment flow step ${activeFlowStep} of ${flowSteps.length}`} testID="investment-flow-progress" style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
      {flowSteps.map((label, index) => <View key={label} style={{ flex: 1, height: 5, borderRadius: 8, backgroundColor: index + 1 <= activeFlowStep ? colors.primary : colors.border }} />)}
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
        <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', letterSpacing: -0.25 }}>Set your investment amount</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 5, marginBottom: 16 }}>
          Choose an amount for this trade. OG Exports checks it against the current opportunity and wallet limits.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lightGreen }}>
            <Feather name="shield" size={19} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{projectTitle}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{tradeLabel} · {currency || currencyLabel}</Text>
          </View>
        </View>
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {amountFacts.map(([label, value]) => <View key={label} style={{ flexGrow: 1, flexBasis: '46%', minWidth: '44%', padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text>
            <Text style={{ color: value === 'Unavailable' ? colors.mutedForeground : colors.foreground, fontSize: 14, fontWeight: '700', marginTop: 5 }}>{value}</Text>
          </View>)}
        </View>
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.lightGreen, marginBottom: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 10, letterSpacing: 0.7, fontWeight: '700', marginBottom: 7 }}>INVESTMENT SUMMARY</Text>
          {[
            ['Investment amount', amountSummary],
            ['Target return · not guaranteed', projectedReturn || 'Not reported'],
            ['Trade term', cycleValue],
          ].map(([label, value], index) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 7, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontSize: 12, flex: 1 }}>{label}</Text>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1 }}>{value}</Text>
          </View>)}
        </View>
        {!currency && !walletQuery.isLoading && !walletQuery.isFetching ? <Text style={{ color: colors.destructive, fontSize: 11, lineHeight: 17, marginTop: 10 }}>OG Exports has not supplied a currency for this trade or wallet.</Text> : null}
        {walletQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Wallet balance could not be loaded. The server remains authoritative.</Text> : null}
        {error ? <ErrorState message={error} /> : null}
        <View style={{ marginTop: 15 }}><Action title="Continue to review" icon="arrow-right" disabled={!investAmount || !currency || !investmentAvailable} onPress={continueToReview} /></View>
        <View style={{ marginTop: 9 }}><Action title="Back to opportunity" secondary onPress={() => setStage('details')} /></View>
      </Card> : null}
      {kycVerified && stage === 'review' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', letterSpacing: -0.25 }}>Review your investment</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>Confirm the trade and money movement details before moving to the published terms.</Text>
        <View style={{ marginTop: 16, marginBottom: 7, padding: 15, borderRadius: 14, backgroundColor: colors.lightGreen }}>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 }}>YOUR INVESTMENT</Text>
          <Text style={{ color: colors.foreground, fontSize: 24, fontWeight: '700', marginTop: 5 }}>{moneyInSourceCurrency(Number(investAmount), currency)}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{projectTitle} · {tradeLabel}</Text>
        </View>
        {[
          ['Trade', tradeLabel],
          ['Target return · not guaranteed', projectedReturn || '—'],
          ['Target distribution date · estimated', distributionDate],
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, marginTop: 12, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
          <Feather name="info" size={15} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, flex: 1 }}>The distribution date is an estimate, not a guarantee. Returns are targets, not guarantees. Fees and currency conversion are confirmed by OG Exports; this screen does not estimate them.</Text>
        </View>
        <View style={{ marginTop: 15 }}><Action title="Continue to Terms & risk" icon="arrow-right" onPress={() => { setError(''); setStage('risk'); }} /></View>
        <View style={{ marginTop: 9 }}><Action title="Back to amount" secondary icon="arrow-left" onPress={() => setStage('amount')} /></View>
      </Card> : null}
      {kycVerified && stage === 'risk' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', letterSpacing: -0.25 }}>Investment Agreement</Text>
        <View style={{ height: 310, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, overflow: 'hidden' }}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 16 }}>OG EXPORTS — PROFIT SHARING AGREEMENT</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>
              Funds will be deducted from your OG Wallet immediately and transferred to the platform investment pool. Your investment is confirmed on submission (first-come, first-served).
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>
              1. <Text style={{ color: colors.foreground, fontWeight: '700' }}>Capital at Risk:</Text> All investments involve risk. Capital is not guaranteed.
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 21, marginBottom: 16 }}>
              2. <Text style={{ color: colors.foreground, fontWeight: '700' }}>Returns:</Text> The stated return of 4% is an expected target.
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 21 }}>
              3. <Text style={{ color: colors.foreground, fontWeight: '700' }}>Completion:</Text> When the project completes, principal plus profit will be credited back to your wallet.
            </Text>
          </ScrollView>
        </View>
        <Pressable testID="investment-agreement-acknowledgement" accessibilityRole="checkbox" accessibilityState={{ checked: agreementAccepted }} onPress={() => setAgreementAccepted(value => !value)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: agreementAccepted ? colors.primary : colors.border, backgroundColor: agreementAccepted ? colors.lightGreen : colors.background }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: agreementAccepted ? colors.primary : colors.border, backgroundColor: agreementAccepted ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>{agreementAccepted ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}</View>
          <Text style={{ flex: 1, color: colors.foreground, lineHeight: 20, fontSize: 14 }}>I agree to the Investment Agreement and understand the risks.</Text>
        </Pressable>
        {error ? <ErrorState message={error} /> : null}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <View style={{ flex: 1 }}><Action title="Back" secondary onPress={() => setStage('review')} testID="investment-agreement-back" /></View>
          <View style={{ flex: 1.5 }}><Action title="Confirm Invest" disabled={!agreementAccepted} onPress={() => { setError(''); setStage('confirmation'); }} testID="investment-agreement-confirm" /></View>
        </View>
      </Card> : null}
      {kycVerified && stage === 'confirmation' ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', letterSpacing: -0.25 }}>
          {appPinEnabled || biometricEnabled ? 'Secure confirmation' : 'Confirm investment'}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 13 }}>
          {appPinEnabled || biometricEnabled
            ? 'Authenticate locally before the investment request is sent. This device confirmation is separate from account sign-in verification.'
            : 'You can submit this investment using your signed-in account. Withdrawals require email verification and your transaction password.'}
        </Text>
        {appPinEnabled ? <Field label="Six-digit app PIN" value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter your six-digit PIN" keyboardType="numeric" secureTextEntry autoCapitalize="none" /> : null}
        {biometricEnabled ? <View style={{ backgroundColor: colors.lightGreen, borderRadius: 12, padding: 12, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Feather name="smartphone" size={17} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, flex: 1 }}>Device biometric confirmation is enabled. It will be checked on this device before submitting.</Text>
        </View> : null}
        <View style={{ backgroundColor: colors.lightGreen, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <Text style={{ color: colors.primary, fontSize: 10, letterSpacing: 0.7, fontWeight: '700' }}>FINAL REQUEST SUMMARY</Text>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 20, marginTop: 6 }}>{moneyInSourceCurrency(Number(investAmount), currency)}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{projectTitle} · {tradeLabel}</Text>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <Text style={{ color: colors.foreground, fontSize: 12 }}>Payment method: Wallet balance</Text>
        </View>
        {error ? <ErrorState message={error} /> : null}
        <Action
          title={appPinEnabled || biometricEnabled ? 'Authenticate & submit request' : 'Confirm & submit request'}
          icon={appPinEnabled || biometricEnabled ? 'lock' : 'check'}
          loading={authBusy || invest.isPending}
          disabled={appPinEnabled && !biometricEnabled && pin.length !== 6}
          onPress={() => void submit()}
        />
        <View style={{ marginTop: 9 }}><Action title="Back to Terms & risk" secondary icon="arrow-left" onPress={() => { setPin(''); setStage('risk'); }} /></View>
      </Card> : null}
      {kycVerified && stage === 'success' && confirmation ? (() => {
        const status = first(confirmation, ['status'], '—');
        const investmentId = first(confirmation, ['id']);
        const resultCurrency = first(confirmation, ['amountCurrency'], currency);
        const resultAmount = moneyInSourceCurrency(confirmation.amount, resultCurrency || 'USD');
        const resultWalletAmount = typeof confirmation.amountPkr === 'number' ? moneyInSourceCurrency(confirmation.amountPkr, 'PKR') : '';
        const exchangeRate = typeof confirmation.exchangeRate === 'number'
          ? `1 USD = ${confirmation.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 8 })} PKR`
          : '';
        return <Card style={{ borderColor: colors.primary }}>
          <Text style={{ color: colors.primary, fontSize: 10, letterSpacing: 0.7, fontWeight: '700', marginBottom: 10 }}>INVESTMENT CONFIRMATION</Text>
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>
            {investmentServerCompleted
              ? 'Investment confirmed'
              : investmentServerApproved
                ? normalizedConfirmationStatus === 'active' ? 'Investment active' : 'Investment approved'
                : investmentServerRejected ? 'Investment status updated' : 'Investment request submitted'}
          </Text>
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
    <SuccessFeedback
      visible={successFeedbackVisible}
      title={investmentSuccessTitle}
      body={investmentSuccessBody}
      feedback={investmentServerCompleted ? 'success' : investmentServerApproved ? 'approved' : investmentServerRejected ? 'attention' : 'ack'}
      status={confirmedStatus !== '—' ? confirmedStatus : undefined}
      reference={first(confirmation ?? {}, ['reference']) || undefined}
      onDismiss={() => setSuccessFeedbackVisible(false)}
      testID="investment-success-feedback"
    />
  </Screen>;
}
