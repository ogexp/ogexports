import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetInvestorInvestment } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record, unwrap } from '@/lib/data';
import { TradeTimeline } from '@/components/TradeTimeline';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function PositionDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = String(raw ?? '');
  const { token } = useAuth();
  const colors = useColors();
  const query = useGetInvestorInvestment(id, { query: { queryKey: ['investor-position', id], enabled: Boolean(id && token) } });
  const row = unwrap(query.data);
  const trade = record(row.trade ?? row.project ?? row.trade_details);
  const container = record(row.container ?? row.container_details ?? trade.container ?? trade.container_details);
  const currency = first(row, ['currency'], first(trade, ['currency']));
  const tradeId = first(row, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code'], 'Trade reference not provided by OG Exports'));
  const investmentId = first(row, ['investment_id', 'id'], 'Not provided');
  const origin = first(row, ['origin', 'origin_country', 'from_country'], first(trade, ['origin', 'origin_country', 'from_country', 'country_of_origin'], ''));
  const destination = first(row, ['destination', 'destination_country', 'to_country'], first(trade, ['destination', 'destination_country', 'to_country', 'destination_market'], ''));
  const containerNumber = first(row, ['container_number'], first(container, ['container_number', 'number', 'name'], ''));
  const routeSummary = origin && destination
    ? `${origin} → ${destination}`
    : origin
      ? `Origin: ${origin} · Destination not provided by OG Exports`
      : destination
        ? `Origin not provided by OG Exports · Destination: ${destination}`
        : 'Trade route not provided by OG Exports';
  const timeline = list(row.trade_timeline ?? row.timeline ?? row.updates ?? trade.trade_timeline ?? trade.timeline ?? trade.updates);
  const documents = list(row.documents ?? trade.documents);
  const actualReturn = amount(row, ['actual_return_amount', 'actual_distribution_amount', 'profit_earned', 'distributed_amount', 'actual_profit']);
  const projectedAmount = amount(row, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution'])
    ?? amount(trade, ['projected_return_amount', 'estimated_return_amount', 'target_return_amount', 'projected_distribution', 'estimated_distribution']);
  const projectedPercent = amount(row, ['projected_return_percentage', 'estimated_return_percentage', 'target_return_percentage'])
    ?? amount(trade, ['projected_return_percentage', 'estimated_return_percentage', 'target_return_percentage']);
  const amountText = (value: number | null) => value == null ? 'Not provided' : currency ? money(value, currency) : 'Currency not provided';
  const investmentDetails: [string, string][] = [
    ['Investment ID', investmentId],
    ['Trade ID', tradeId],
    ['Investment date', first(row, ['investment_date', 'created_at', 'date'], 'Not provided')],
    ['Amount invested', amountText(amount(row, ['amount', 'investment_amount', 'principal']))],
    ['Trade cycle', first(row, ['trade_cycle', 'estimated_trade_cycle', 'duration'], first(trade, ['trade_cycle', 'estimated_trade_cycle', 'duration'], 'Not provided'))],
    ['Distribution status', first(row, ['distribution_status', 'payout_status'], 'Not provided')],
  ];
  const tradeDetails: [string, string][] = ([
    ['Commodity', first(row, ['commodity_name', 'commodity'], first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(row, ['project_name', 'title'], '')))],
    ['Quantity', first(row, ['quantity', 'cargo_quantity', 'quantity_tons'], first(trade, ['quantity', 'cargo_quantity', 'quantity_tons'], ''))],
    ['Trade status', first(row, ['trade_status', 'shipment_status'], first(trade, ['trade_status', 'shipment_status', 'status'], ''))],
  ] as [string, string][]).filter(([, value]) => value.trim() && !/^not provided$/i.test(value.trim()));
  const trackingDetails: [string, string][] = ([
    ['Bill of lading', first(row, ['bill_of_lading_number', 'bill_of_lading'], first(container, ['bill_of_lading_number', 'bill_of_lading', 'bl_number'], ''))],
    ['Vessel', first(row, ['vessel_name'], first(container, ['vessel_name', 'vessel'], ''))],
    ['Port of loading', first(row, ['port_of_loading', 'loading_port'], first(container, ['port_of_loading', 'loading_port'], ''))],
    ['Destination port', first(row, ['destination_port'], first(container, ['destination_port', 'port_of_discharge'], ''))],
    ['ETD', first(row, ['etd', 'departure_date'], first(container, ['etd', 'departure_date'], ''))],
    ['ETA', first(row, ['eta', 'estimated_arrival'], first(container, ['eta', 'estimated_arrival'], ''))],
    ['Latest update', first(row, ['latest_update', 'last_updated'], first(container, ['latest_update', 'last_updated', 'updated_at'], ''))],
  ] as [string, string][]).filter(([, value]) => value.trim() && !/^not provided$/i.test(value.trim()));

  return <Screen title={first(trade, ['commodity_name', 'commodity', 'title', 'name'], first(row, ['project_name', 'title', 'name'], 'Investment details'))} subtitle="Investment details">
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading position…</Text></Card> : null}
    {query.isError ? <ErrorState message="This investment position could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Investment status</Text><Text style={{ color: colors.foreground, fontSize: 21, fontWeight: '700', marginTop: 5 }}>{first(row, ['status', 'state'], 'Not provided')}</Text></View>
          <Status value={first(row, ['status', 'state'], 'Not provided')} />
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 14 }}>Associated trade</Text>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 4 }}>{tradeId}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>{routeSummary}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Container</Text>
          <Text style={{ color: containerNumber ? colors.foreground : colors.mutedForeground, fontSize: 12, fontWeight: containerNumber ? '600' : '400', textAlign: 'right', flex: 1 }}>
            {containerNumber || 'Not provided by OG Exports'}
          </Text>
        </View>
      </Card>

      <Section title="Investment summary" />
      <Card>
        {investmentDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>)}
      </Card>

      <Section title="Trade information" />
      <Card>
        {tradeDetails.length ? tradeDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>) : <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>Trade details have not been provided by OG Exports yet.</Text>}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 11 }}>Only trade information reported by OG Exports is shown.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Container status</Text>
          <Status value={first(row, ['container_status', 'shipment_status'], first(container, ['status', 'current_status'], 'Not provided'))} />
        </View>
      </Card>

      <Section title="Performance" />
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 135, padding: 12, borderRadius: 13, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Projected / target</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{projectedAmount != null ? amountText(projectedAmount) : projectedPercent != null ? `${projectedPercent.toFixed(2)}%` : 'Not provided'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 135, padding: 12, borderRadius: 13, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Actual return / distribution</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{amountText(actualReturn)}</Text>
          </View>
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Projected performance is not guaranteed. Actual results depend on trade performance and applicable risks.</Text>
      </Card>

      <Section title="Container tracking" />
      <Card>
        {trackingDetails.length ? trackingDetails.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', textAlign: 'right', flex: 1 }}>{value}</Text>
        </View>) : <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>Shipment tracking details have not been provided by OG Exports yet.</Text>}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Only reported milestones are shown; no live carrier position is inferred.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/tracking/[id]', params: { id, source: 'position' } })} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13, borderRadius: 12, backgroundColor: colors.primary }}>
          <Text style={{ color: colors.primaryForeground, fontSize: 13, fontWeight: '700' }}>Open container record</Text>
          <Text style={{ color: colors.primaryForeground, fontSize: 17 }}>›</Text>
        </Pressable>
      </Card>

      <TradeTimeline events={timeline} />

      <Section title="Trade documents" />
      {documents.length ? <Card>{documents.map((document, index) => <View key={first(document, ['id', 'document_id'], String(index))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1 }}>{first(document, ['name', 'title', 'file_name', 'category'], 'Trade document')}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{first(document, ['type', 'status'], 'Available')}</Text>
      </View>)}</Card> : <EmptyState title="No documents available" body="Authorized trade documents will appear here when provided." />}
    </> : null}
  </Screen>;
}