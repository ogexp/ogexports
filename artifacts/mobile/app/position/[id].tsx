import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorInvestment } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, messageOf, money, record, unwrap, type Json } from '@/lib/data';
import { TradeTimeline } from '@/components/TradeTimeline';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';

const notProvided = 'Not provided by OG Exports';

export default function PositionDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const [busyDocument, setBusyDocument] = useState('');
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});
  const query = useGetInvestorInvestment(id, { query: { queryKey: ['investor-position', id], enabled: Boolean(id && token) } });
  const row = unwrap(query.data);
  const project = record(row.project ?? row.trade ?? row.trade_details);
  const trade = record(row.trade ?? row.project ?? row.trade_details);
  const container = record(row.container ?? row.container_details ?? project.container ?? project.container_details ?? trade.container ?? trade.container_details);
  const currency = first(row, ['currency', 'amount_currency'], first(project, ['currency'], first(trade, ['currency'])));
  const tradeId = first(row, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code', 'reference'], first(project, ['trade_id', 'trade_code', 'project_code', 'code', 'reference'], notProvided)));
  const investmentId = first(row, ['investment_id', 'reference', 'id'], notProvided);
  const status = first(row, ['status', 'state'], notProvided);
  const containerNumber = first(row, ['container_number', 'container_name'], first(container, ['container_number', 'number', 'name'], notProvided));
  const timeline = list(project.trade_updates);
  const documents = list(project.documents ?? row.documents ?? trade.documents);
  const investedUsd = amount(row, ['amount', 'investment_amount', 'principal']);
  const investedPkr = amount(row, ['amount_pkr']);
  const investedAmountText = [
    investedUsd != null ? money(investedUsd, 'USD') : null,
    investedPkr != null ? money(investedPkr, 'PKR') : null,
  ].filter(Boolean).join(' · ') || notProvided;
  const tradeCycle = first(row, ['trade_cycle', 'estimated_trade_cycle', 'duration'], first(project, ['trade_cycle', 'estimated_trade_cycle', 'duration'], first(trade, ['trade_cycle', 'estimated_trade_cycle', 'duration'], '')));
  const tradeCycleDays = first(row, ['investment_period_days', 'trade_cycle_days', 'duration_days'], first(project, ['investment_period_days', 'trade_cycle_days', 'duration_days'], first(trade, ['investment_period_days', 'trade_cycle_days', 'duration_days'], '')));
  const projectedAmount = amount(row, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution'])
    ?? amount(project, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution'])
    ?? amount(trade, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution']);
  const projectedPercent = amount(row, ['projected_return_percentage', 'projected_return_pct', 'expected_return_pct', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(project, ['projected_return_pct', 'expected_return_pct', 'projected_return_percentage', 'expected_return_percentage', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(trade, ['projected_return_pct', 'expected_return_pct', 'projected_return_percentage', 'expected_return_percentage', 'estimated_return_percentage', 'target_return_percentage']);
  const amountText = (value: number | null) => {
    if (value == null) return notProvided;
    return currency ? `${currency.toUpperCase()} ${value.toLocaleString()}` : `${value.toLocaleString()} · Currency not provided by OG Exports`;
  };
  const actualReturn = amount(row, ['actual_return_amount', 'actual_distribution_amount', 'returned_amount', 'amount_returned', 'distributed_amount'])
    ?? amount(project, ['actual_return_amount', 'actual_distribution_amount', 'returned_amount', 'amount_returned', 'distributed_amount'])
    ?? amount(trade, ['actual_return_amount', 'actual_distribution_amount', 'returned_amount', 'amount_returned', 'distributed_amount']);
  const actualProfitUsd = amount(row, ['profit_amount']);
  const actualProfitPkr = amount(row, ['profit_amount_pkr']);
  const actualPerformance: [string, string][] = [];
  if (actualProfitUsd != null) actualPerformance.push(['Profit recorded (USD)', money(actualProfitUsd, 'USD')]);
  if (actualProfitPkr != null) actualPerformance.push(['Profit recorded (PKR)', money(actualProfitPkr, 'PKR')]);
  if (actualReturn != null) actualPerformance.push(['Returned or distributed amount', amountText(actualReturn)]);

  const investmentDetails: [string, string][] = [
    ['Investment ID', investmentId],
    ['Trade ID', tradeId],
    ['Investment Date', first(row, ['investment_date', 'invested_at', 'created_at', 'date'], notProvided)],
    ['Amount Invested', investedAmountText],
    ['Current Status', status],
    ['Trade Cycle', tradeCycle || (tradeCycleDays ? `${tradeCycleDays} days` : notProvided)],
    ['Distribution status', first(row, ['distribution_status', 'payout_status'], first(project, ['distribution_status', 'payout_status'], first(trade, ['distribution_status', 'payout_status'], notProvided)))],
  ];
  const tradeDetails: [string, string][] = [
    ['Commodity', first(row, ['commodity_name', 'commodity'], first(project, ['commodity_name', 'commodity', 'title', 'name'], first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(row, ['project_name', 'title'], notProvided))))],
    ['Quantity', first(row, ['quantity', 'cargo_quantity', 'quantity_tons'], first(project, ['quantity', 'cargo_quantity', 'quantity_tons'], first(trade, ['quantity', 'cargo_quantity', 'quantity_tons'], notProvided)))],
    ['Container number/name', containerNumber],
    ['Destination', first(row, ['destination', 'destination_country', 'to_country'], first(project, ['destination', 'destination_country', 'to_country', 'destination_market'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market'], notProvided)))],
    ['Trade status', first(row, ['trade_status', 'shipment_status'], first(project, ['trade_status', 'shipment_status', 'status'], first(trade, ['trade_status', 'shipment_status', 'status'], notProvided)))],
  ];
  const trackingDetails: [string, string][] = ([
    ['Bill of lading', first(row, ['bill_of_lading_number', 'bill_of_lading'], first(container, ['bill_of_lading_number', 'bill_of_lading', 'bl_number'], ''))],
    ['Vessel', first(row, ['vessel_name'], first(container, ['vessel_name', 'vessel'], ''))],
    ['Port of loading', first(row, ['port_of_loading', 'loading_port'], first(container, ['port_of_loading', 'loading_port'], ''))],
    ['Destination port', first(row, ['destination_port'], first(container, ['destination_port', 'port_of_discharge'], ''))],
    ['ETD', first(row, ['etd', 'departure_date'], first(container, ['etd', 'departure_date'], ''))],
    ['ETA', first(row, ['eta', 'estimated_arrival'], first(container, ['eta', 'estimated_arrival'], ''))],
    ['Latest update', first(row, ['latest_update', 'last_updated'], first(container, ['latest_update', 'last_updated', 'updated_at'], ''))],
  ] as [string, string][]).filter(([, value]) => value.trim() && !/^not provided$/i.test(value.trim()));

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

  return <Screen title="Investment Details" subtitle={first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(project, ['commodity_name', 'commodity', 'title', 'name'], 'Investment record'))}>
    {query.isLoading ? <Card><View style={{ gap: 11 }}><View style={{ width: '42%', height: 14, borderRadius: 7, backgroundColor: colors.secondary }} /><View style={{ width: '78%', height: 14, borderRadius: 7, backgroundColor: colors.secondary }} /><View style={{ width: '62%', height: 14, borderRadius: 7, backgroundColor: colors.secondary }} /></View></Card> : null}
    {query.isError ? <ErrorState message="This investment position could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Section title="Investment Summary" />
      <Card>
        {investmentDetails.map(([label, value], index) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: index < investmentDetails.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
      </Card>

      <Section title="Trade Information" />
      <Card>
        {tradeDetails.map(([label, value], index) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: index < tradeDetails.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 11 }}>Trade details reflect information reported by OG Exports.</Text>
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