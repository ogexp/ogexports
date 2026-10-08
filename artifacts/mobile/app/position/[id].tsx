import React, { useCallback, useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, AppState, Pressable, View } from 'react-native';
import { LocalizedPressable, LocalizedText as Text } from '@/components/LocalizedText';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useGetInvestorInvestment } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, LoadingCard, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, messageOf, money, record, unwrap, type Json } from '@/lib/data';
import { TradeTimeline } from '@/components/TradeTimeline';
import { TradeProgressCard } from '@/components/TradeProgressCard';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';
import { investmentDownloadSpec, type InvestmentDownloadKind } from '@/lib/investment-download';
import {
  copyFinancialReference,
  resolveCanonicalFinancialId,
  resolveFinancialCopyTarget,
} from '@/lib/financial-reference';
import {
  calculateExpectedProfitFromRoi,
  formatDistributionStatus,
  formatReportedPayoutDate,
  parseRoiPercentageLabel,
} from '@/lib/investment-metrics';

const notProvided = '—';

function firstAvailable(sources: Record<string, unknown>[], keys: string[], fallback = ''): string {
  for (const source of sources) {
    const value = first(source, keys, '').trim();
    if (value && value !== notProvided) return value;
  }
  return fallback;
}

function validRelatedId(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const id = String(value).trim();
    if (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) return id;
  }
  return '';
}

export default function PositionDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const [busyDocument, setBusyDocument] = useState('');
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});
  const [busyInvestmentDownload, setBusyInvestmentDownload] = useState<InvestmentDownloadKind | ''>('');
  const [investmentDownloadError, setInvestmentDownloadError] = useState('');
  const [copiedInvestmentId, setCopiedInvestmentId] = useState('');
  const [investmentIdCopyError, setInvestmentIdCopyError] = useState('');
  const queryClient = useQueryClient();
  const query = useGetInvestorInvestment(id, { query: { queryKey: ['investor-position', id], enabled: Boolean(id && token) } });
  const refreshPosition = useCallback(() => {
    if (id && token) {
      void queryClient.refetchQueries({ queryKey: ['investor-position', id], type: 'active' });
    }
  }, [id, queryClient, token]);
  useFocusEffect(refreshPosition);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPosition();
    });
    return () => subscription.remove();
  }, [refreshPosition]);
  const row = unwrap(query.data);
  const project = record(row.project ?? row.trade ?? row.trade_details);
  const trade = record(row.trade ?? row.project ?? row.trade_details);
  const relatedTradeId = validRelatedId(
    row.project_id,
    row.trade_id,
    project.project_id,
    project.id,
    trade.project_id,
    trade.id,
  );
  const container = record(row.container ?? row.container_details ?? project.container ?? project.container_details ?? trade.container ?? trade.container_details);
  const projectMeta = record(project.meta ?? trade.meta ?? row.meta);
  const rowMeta = record(row.meta);
  const tradeMeta = record(trade.meta);
  const distributionRecord = record(row.profit_distribution ?? row.distribution
    ?? project.profit_distribution ?? project.distribution
    ?? trade.profit_distribution ?? trade.distribution);
  const currency = first(row, ['currency', 'amount_currency'], first(project, ['currency'], first(trade, ['currency'])));
  const tradeId = first(row, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code', 'reference'], first(project, ['trade_id', 'trade_code', 'project_code', 'code', 'reference'], notProvided)));
  const canonicalInvestmentId = resolveCanonicalFinancialId(row, ['id', 'investment_id']);
  const investmentCopyTarget = resolveFinancialCopyTarget(
    row,
    ['id', 'investment_id'],
    ['investment_reference', 'reference'],
  );
  const investmentId = canonicalInvestmentId || notProvided;
  const status = first(row, ['status', 'state'], notProvided);
  const containerNumber = first(row, ['container_number', 'container_name'], first(container, ['container_number', 'number', 'name'], first(projectMeta, ['container_number', 'container_no', 'containerNumber'], notProvided)));
  const vesselName = first(row, ['vessel_name', 'vessel'], first(container, ['vessel_name', 'vessel'], first(project, ['vessel'], first(trade, ['vessel'], notProvided))));
  const voyage = first(row, ['voyage_number', 'voyage'], first(container, ['voyage_number', 'voyage'], first(projectMeta, ['voyage_number', 'voyage'], notProvided)));
  const vesselAndVoyage = [vesselName, voyage].filter(value => value !== notProvided).join(' · ') || notProvided;
  const timeline = list(project.trade_updates);
  const stageUpdates = list(project.stage_updates);
  const projectStatus = first(project, ['status', 'project_status', 'current_status']);
  const investmentPeriodProgress = record(row.investment_period_progress);
  const documents = list(project.documents ?? row.documents ?? trade.documents);
  const investedAmount = amount(row, ['amount', 'investment_amount', 'principal']);
  const investedPkr = amount(row, ['amount_pkr']);
  const investedAmountText = investedAmount != null
    ? money(investedAmount, currency || 'USD')
    : investedPkr != null
      ? money(investedPkr, 'PKR')
      : money(null, currency || 'USD');
  const amountText = (value: number | null) => money(value, currency || 'USD');
  const tradeCycle = first(row, ['trade_cycle', 'estimated_trade_cycle', 'duration'], first(project, ['trade_cycle', 'estimated_trade_cycle', 'duration'], first(trade, ['trade_cycle', 'estimated_trade_cycle', 'duration'], '')));
  const tradeCycleDays = first(row, ['investment_period_days', 'trade_cycle_days', 'duration_days'], first(project, ['investment_period_days', 'trade_cycle_days', 'duration_days'], first(trade, ['investment_period_days', 'trade_cycle_days', 'duration_days'], '')));
  const projectedAmount = amount(row, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution'])
    ?? amount(project, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution'])
    ?? amount(trade, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution']);
  const projectedPercent = amount(row, ['projected_return_percentage', 'projected_return_pct', 'expected_return_pct', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(project, ['projected_return_pct', 'expected_return_pct', 'projected_return_percentage', 'expected_return_percentage', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(trade, ['projected_return_pct', 'expected_return_pct', 'projected_return_percentage', 'expected_return_percentage', 'estimated_return_percentage', 'target_return_percentage']);
  const actualReturn = amount(row, ['actual_return_amount', 'actual_distribution_amount', 'returned_amount', 'amount_returned', 'distributed_amount'])
    ?? amount(project, ['actual_return_amount', 'actual_distribution_amount', 'returned_amount', 'amount_returned', 'distributed_amount'])
    ?? amount(trade, ['actual_return_amount', 'actual_distribution_amount', 'returned_amount', 'amount_returned', 'distributed_amount']);
  const actualProfitUsd = amount(row, ['profit_amount']);
  const actualProfitPkr = amount(row, ['profit_amount_pkr']);
  const totalReturn = amount(row, ['total_return', 'total_return_amount'])
    ?? amount(record(row.profit_distribution ?? row.distribution), ['total_return']);
  const actualPerformance: [string, string][] = [];
  if (actualProfitUsd != null) actualPerformance.push(['Profit recorded', money(actualProfitUsd, 'USD')]);
  else if (actualProfitPkr != null) actualPerformance.push(['Profit recorded', money(actualProfitPkr, 'PKR')]);
  else actualPerformance.push(['Profit recorded', money(null, 'USD')]);
  if (actualReturn != null) actualPerformance.push(['Returned or distributed amount', amountText(actualReturn)]);
  if (totalReturn != null) actualPerformance.push(['Total return recorded', amountText(totalReturn)]);

  const plannedPayoutDate = firstAvailable(
    [distributionRecord, row],
    ['planned_distribution_date'],
  );
  const reportedPayoutDate = firstAvailable(
    [row, distributionRecord, project, trade, rowMeta, projectMeta, tradeMeta],
    ['next_payout_date', 'next_distribution_date', 'scheduled_payout_date', 'scheduled_distribution_date', 'payout_date'],
  );
  const estimatedPayoutDate = firstAvailable(
    [row, project, trade, rowMeta, projectMeta, tradeMeta],
    ['target_distribution_date', 'estimated_distribution_date', 'expected_distribution_date', 'expected_payout_date', 'distribution_date', 'profit_payout_date'],
  );
  const payoutDateValue = plannedPayoutDate || reportedPayoutDate || estimatedPayoutDate;
  const payoutDateIsEstimated = !plannedPayoutDate && !reportedPayoutDate && Boolean(estimatedPayoutDate);
  const payoutDateText = formatReportedPayoutDate(payoutDateValue) ?? 'Date not announced';
  const payoutDateLabel = plannedPayoutDate
    ? 'Planned payout date'
    : payoutDateIsEstimated ? 'Next payout date · estimated' : 'Next payout date';
  const reportedRoi = amount(row, ['roi', 'expected_return_pct', 'projected_return_pct', 'projected_return_percentage', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(project, ['roi', 'expected_return_pct', 'projected_return_pct', 'projected_return_percentage', 'expected_return_percentage', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(trade, ['roi', 'expected_return_pct', 'projected_return_pct', 'projected_return_percentage', 'expected_return_percentage', 'estimated_return_percentage', 'target_return_percentage']);
  const roiLabel = firstAvailable([row, project, trade], ['roi_label', 'target_return', 'projected_return', 'expected_return', 'return_rate', 'roi']);
  const roiForCalculation = reportedRoi ?? parseRoiPercentageLabel(roiLabel);
  const reportedExpectedProfit = amount(row, ['expected_profit'])
    ?? amount(project, ['expected_profit'])
    ?? amount(trade, ['expected_profit']);
  const reportedExpectedProfitPkr = amount(row, ['expected_profit_pkr'])
    ?? amount(project, ['expected_profit_pkr'])
    ?? amount(trade, ['expected_profit_pkr']);
  const primaryInvestmentAmount = investedAmount ?? (currency.toUpperCase() === 'PKR' ? investedPkr : null);
  const expectedProfit = calculateExpectedProfitFromRoi(primaryInvestmentAmount, roiForCalculation) ?? reportedExpectedProfit;
  const expectedProfitPkr = calculateExpectedProfitFromRoi(investedPkr, roiForCalculation) ?? reportedExpectedProfitPkr;
  const expectedProfitText = expectedProfit != null
    ? money(expectedProfit, currency || 'USD')
    : expectedProfitPkr != null
      ? money(expectedProfitPkr, 'PKR')
      : amountText(null);
  const distributionStatusRaw = firstAvailable([row], ['distribution_status', 'payout_status', 'profit_distribution_status'])
    || firstAvailable([distributionRecord], ['distribution_status', 'payout_status', 'status'])
    || firstAvailable([project], ['distribution_status', 'payout_status', 'profit_distribution_status'])
    || firstAvailable([trade], ['distribution_status', 'payout_status', 'profit_distribution_status']);
  const confirmedDistributionAt = firstAvailable([distributionRecord, row], ['distributed_at']);
  const distributionStatus = formatDistributionStatus(distributionStatusRaw, confirmedDistributionAt);
  const investmentDate = first(row, ['investment_date', 'invested_at', 'created_at', 'date'], notProvided);
  const investmentDetails: [string, string][] = [
    ['Investment ID', investmentId],
    ...(investmentCopyTarget?.kind === 'reference'
      ? [['Investment reference', investmentCopyTarget.value] as [string, string]]
      : []),
    ['Trade ID', tradeId],
    ['Investment Date', formatReportedPayoutDate(investmentDate) ?? investmentDate],
    ['Amount Invested', investedAmountText],
    ['Expected profit', expectedProfitText],
    ['ROI', roiForCalculation != null ? `${roiForCalculation.toFixed(2)}%` : roiLabel || notProvided],
    [payoutDateLabel, payoutDateText],
    ['Current Status', status],
    ['Trade Cycle', tradeCycle || (tradeCycleDays ? `${tradeCycleDays} days` : notProvided)],
    ['Distribution status', distributionStatus],
  ];
  const tradeDetails: [string, string][] = [
    ['Commodity', first(row, ['commodity_name', 'commodity'], first(project, ['commodity_name', 'commodity', 'title', 'name'], first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(row, ['project_name', 'title'], notProvided))))],
    ['Container ID', containerNumber],
    ['Destination', first(row, ['destination', 'destination_country', 'to_country'], first(project, ['destination', 'destination_country', 'to_country', 'destination_market'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market'], notProvided)))],
    ['Trade status', first(row, ['trade_status', 'shipment_status'], first(project, ['trade_status', 'shipment_status', 'status'], first(trade, ['trade_status', 'shipment_status', 'status'], notProvided)))],
  ];
  const loadingPort = first(row, ['port_of_loading', 'loading_port'], first(container, ['port_of_loading', 'loading_port'], first(project, ['port_of_loading'], first(trade, ['port_of_loading'], notProvided))));
  const destinationPort = first(row, ['destination_port'], first(container, ['destination_port', 'port_of_discharge'], first(project, ['port_of_discharge', 'destination_port'], first(trade, ['port_of_discharge', 'destination_port'], notProvided))));
  const route = loadingPort !== notProvided || destinationPort !== notProvided
    ? `${loadingPort} → ${destinationPort}`
    : notProvided;
  const containerType = first(project, ['container_type', 'container_size'], first(trade, ['container_type', 'container_size'], notProvided));
  const shippingLine = first(row, ['shipping_line'], first(project, ['shipping_line'], first(trade, ['shipping_line'], notProvided)));
  const trackingDetails: [string, string][] = ([
    ['Bill of lading', first(row, ['bill_of_lading_number', 'bill_of_lading'], first(container, ['bill_of_lading_number', 'bill_of_lading', 'bl_number'], ''))],
    ['Container size', containerType],
    ['Vessel / voyage', vesselAndVoyage],
    ['Shipping line', shippingLine],
    ['Route', route],
    ['Port of loading', loadingPort],
    ['Destination port', destinationPort],
    ['ETD', first(row, ['etd', 'departure_date'], first(container, ['etd', 'departure_date'], first(project, ['etd'], first(trade, ['etd'], ''))))],
    ['ETA', first(row, ['eta', 'estimated_arrival'], first(container, ['eta', 'estimated_arrival'], first(project, ['eta'], first(trade, ['eta'], ''))))],
    ['Latest update', first(row, ['latest_update', 'latest_tracking_update', 'last_updated'], first(container, ['latest_update', 'latest_tracking_update', 'last_updated', 'updated_at'], ''))],
  ] as [string, string][]).filter(([, value]) => value.trim() && value.trim() !== '—');

  async function downloadDocument(document: Json, key: string) {
    setDocumentErrors(current => ({ ...current, [key]: '' }));
    setBusyDocument(key);
    try {
      if (!apiOrigin) throw new Error('Set the OG Exports investor server address in Settings before downloading.');
      const configuredOrigin = new URL(apiOrigin).origin;
      const documentId = first(document, ['id', 'document_id']);
      const projectId = first(project, ['id', 'project_id'], first(trade, ['project_id']));
      const suppliedUrl = first(document, ['download_url']);
      const downloadUrl = suppliedUrl || (projectId && documentId
        ? `/api/investor/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/download`
        : '');
      if (!downloadUrl) throw new Error('This document does not have an authorized download address.');
      const resolved = new URL(downloadUrl, apiOrigin);
      if ((resolved.protocol !== 'https:' && resolved.protocol !== 'http:') || resolved.origin !== configuredOrigin) {
        throw new Error('For your security, downloads must be hosted by the OG Exports investor server.');
      }
      const mimeType = first(document, ['mime', 'mime_type', 'content_type'], 'application/octet-stream');
      const name = first(document, ['original_name', 'title'], 'investment-document');
      const extensionMatch = name.match(/\.([a-z0-9]{1,12})$/i);
      const mimeExtensions: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'text/csv': 'csv',
      };
      const extension = first(document, ['extension', 'file_extension'], extensionMatch?.[1] ?? mimeExtensions[mimeType.toLowerCase()] ?? 'bin');
      const downloadName = extensionMatch ? name.slice(0, -extensionMatch[0].length) : name;
      await shareInvestorFile(resolved.href, downloadName, apiOrigin, mimeType, extension);
    } catch (error) {
      setDocumentErrors(current => ({ ...current, [key]: messageOf(error) }));
    } finally {
      setBusyDocument('');
    }
  }

  async function downloadInvestmentFile(kind: InvestmentDownloadKind) {
    setInvestmentDownloadError('');
    setBusyInvestmentDownload(kind);
    try {
      if (!apiOrigin) throw new Error('Set the OG Exports investor server address in Settings before downloading.');
      const target = investmentDownloadSpec(first(row, ['id', 'investment_id']), kind);
      if (!target) throw new Error('The server did not provide a valid investment record ID.');
      await shareInvestorFile(target.path, target.name, apiOrigin, target.mimeType, target.extension);
    } catch (error) {
      setInvestmentDownloadError(messageOf(error));
    } finally {
      setBusyInvestmentDownload('');
    }
  }

  async function copyInvestmentReference() {
    setInvestmentIdCopyError('');
    try {
      const copiedTarget = await copyFinancialReference(
        row,
        value => Clipboard.setStringAsync(value),
        ['id', 'investment_id'],
        ['investment_reference', 'reference'],
      );
      setCopiedInvestmentId(copiedTarget.value);
    } catch {
      setCopiedInvestmentId('');
      setInvestmentIdCopyError('Could not copy the financial reference. Select and copy the value instead.');
    }
  }

  return <Screen title="Investment Details" subtitle={first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(project, ['commodity_name', 'commodity', 'title', 'name'], 'Investment record'))} refreshable>
    {query.isLoading ? <LoadingCard label="Loading investment records…" /> : null}
    {query.isError ? <ErrorState message="This investment position could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Section title="Investment files" />
      <Card style={{ gap: 10 }}>
        <Action
          title="Download PDF"
          icon="download"
          secondary
          testID="position-download-pdf"
          loading={busyInvestmentDownload === 'pdf'}
          disabled={Boolean(busyInvestmentDownload && busyInvestmentDownload !== 'pdf') || !investmentDownloadSpec(first(row, ['id', 'investment_id']), 'pdf')}
          onPress={() => void downloadInvestmentFile('pdf')}
        />
        <Action
          title="Export details"
          icon="file-text"
          secondary
          testID="position-export-investment"
          loading={busyInvestmentDownload === 'export'}
          disabled={Boolean(busyInvestmentDownload && busyInvestmentDownload !== 'export') || !investmentDownloadSpec(first(row, ['id', 'investment_id']), 'export')}
          onPress={() => void downloadInvestmentFile('export')}
        />
        {investmentDownloadError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18 }}>{investmentDownloadError}</Text> : null}
      </Card>
      <Section title="Investment Summary" />
      <Card>
        {investmentDetails.map(([label, value], index) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: index < investmentDetails.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          {label === 'Distribution status'
            ? <Status value={value} />
            : <Text style={{ color: label === 'Expected profit' ? colors.primary : colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>}
        </View>)}
        {investmentCopyTarget ? <LocalizedPressable
          accessibilityRole="button"
          accessibilityLabel={copiedInvestmentId === investmentCopyTarget.value
            ? investmentCopyTarget.kind === 'id' ? 'Investment ID copied' : 'Financial reference copied'
            : investmentCopyTarget.kind === 'id' ? 'Copy investment ID' : 'Copy financial reference'}
          accessibilityHint="Copies value to clipboard"
          testID="investment-copy-reference"
          onPress={() => void copyInvestmentReference()}
          style={{ minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}
        >
          <Feather name={copiedInvestmentId === investmentCopyTarget.value ? 'check' : 'copy'} size={16} color={colors.primary} />
          <Text accessibilityLiveRegion="polite" style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
            {copiedInvestmentId === investmentCopyTarget.value ? 'Copied' : 'Copy'}
          </Text>
        </LocalizedPressable> : null}
        {investmentIdCopyError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{investmentIdCopyError}</Text> : null}
      </Card>

      <TradeProgressCard
        stageUpdates={stageUpdates}
        projectStatus={projectStatus}
        periodProgress={investmentPeriodProgress}
      />

      <Section title="Trade Information" />
      <Card>
        {tradeDetails.map(([label, value], index) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: index < tradeDetails.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 11 }}>Trade details reflect information reported by OG Exports.</Text>
        {relatedTradeId ? <Pressable
          testID="position-open-related-trade"
          accessibilityRole="link"
          accessibilityLabel="View related trade"
          onPress={() => router.push({ pathname: '/project/[id]', params: { id: relatedTradeId } })}
          style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderRadius: 12, backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 })}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>View related trade</Text>
          <Feather name="arrow-up-right" size={15} color={colors.primary} />
        </Pressable> : null}
      </Card>

      <Section title="Container tracking" />
      <Card>
        {trackingDetails.length ? trackingDetails.map(([label, value], index) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: index < trackingDetails.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>) : <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>Shipment tracking details have not been provided by OG Exports yet.</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Container status</Text>
          <Status value={first(row, ['container_status', 'shipment_status'], first(container, ['status', 'current_status'], notProvided))} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Only reported shipment details are shown; no live carrier position is inferred.</Text>
        <Pressable testID="position-open-container-record" accessibilityRole="button" onPress={() => router.push({ pathname: '/tracking/[id]', params: { id, source: 'position' } })} style={({ pressed }) => ({ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13, borderRadius: 12, backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 })}>
          <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>Open container record</Text>
          <Text style={{ color: colors.primaryForeground, fontSize: 17 }}>›</Text>
        </Pressable>
      </Card>

      <Section title="Performance" />
      <View style={{ gap: 10 }}>
        <Card style={{ marginBottom: 0, backgroundColor: colors.secondary }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>PROJECTED</Text>
          {projectedAmount != null || projectedPercent != null ? <>
            {projectedAmount != null ? <View style={{ marginTop: 10 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Projected return amount</Text><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 4 }}>{amountText(projectedAmount)}</Text></View> : null}
            {projectedPercent != null ? <View style={{ marginTop: projectedAmount != null ? 9 : 10 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Projected return percentage</Text><Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 4 }}>{projectedPercent}%</Text></View> : null}
          </> : <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 10 }}>{notProvided}</Text>}
        </Card>
        <Card style={{ marginBottom: 0 }}>
          <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>ACTUAL</Text>
          {actualPerformance.length ? actualPerformance.map(([label, value], index) => <View key={label} style={{ marginTop: index === 0 ? 10 : 12 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 4 }}>{value}</Text>
          </View>) : <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 10 }}>{notProvided}</Text>}
        </Card>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12, marginBottom: 4 }}>Projected performance is not guaranteed. Actual results depend on trade performance and applicable risks.</Text>

      <TradeTimeline events={timeline} apiOrigin={apiOrigin} title="Trade updates" />

      <Section title="Documents" />
      {documents.length ? <Card>
        {documents.map((document, index) => {
          const key = first(document, ['id', 'document_id'], String(index));
          const title = first(document, ['title', 'original_name'], 'Investment document');
          const isBusy = busyDocument === key;
          return <View key={key} style={{ paddingVertical: 12, borderBottomWidth: index < documents.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.secondary }}>
                <Feather name="file-text" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>{title}</Text>
                {first(document, ['original_name']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{first(document, ['original_name'])}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Download ${title}`} testID={`position-download-document-${key}`} disabled={!!busyDocument}
                onPress={() => void downloadDocument(document, key)}
                style={({ pressed }) => ({ minWidth: 80, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.lightGreen, opacity: busyDocument && !isBusy ? 0.5 : pressed ? 0.75 : 1 })}>
                {isBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="download" size={14} color={colors.primary} />}
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{isBusy ? 'Opening' : 'Download'}</Text>
              </Pressable>
            </View>
            {documentErrors[key] ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 11, lineHeight: 16, marginTop: 8 }}>{documentErrors[key]}</Text> : null}
          </View>;
        })}
      </Card> : <EmptyState title="No documents available" body="Authorized documents linked to this investment or trade will appear here when provided." />}

    </> : null}
  </Screen>;
}
