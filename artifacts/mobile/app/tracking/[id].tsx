import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useGetInvestorInvestment, useGetInvestorProject } from '@workspace/api-client-react';
import { Card, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, record, unwrap, type Json } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type JourneyStep = {
  label: string;
  status: string;
  date: string;
  detail: string;
};

const JOURNEY_LABELS = ['Origin', 'Port', 'Vessel', 'Destination', 'Buyer', 'Settlement'] as const;
type JourneyLabel = typeof JOURNEY_LABELS[number];

const JOURNEY_ALIASES: Record<JourneyLabel, string[]> = {
  Origin: ['origin', 'originpoint'],
  Port: ['port', 'loadingport', 'portofloading', 'portdeparture'],
  Vessel: ['vessel'],
  Destination: ['destination', 'destinationport', 'destinationarrival'],
  Buyer: ['buyer', 'buyerdelivery'],
  Settlement: ['settlement', 'tradesettlement'],
};

const JOURNEY_STATUS_KEYS: Record<JourneyLabel, string[]> = {
  Origin: ['origin_status', 'origin_stage_status'],
  Port: ['port_status', 'port_stage_status', 'loading_port_status'],
  Vessel: ['vessel_status', 'vessel_stage_status'],
  Destination: ['destination_status', 'destination_stage_status'],
  Buyer: ['buyer_status', 'buyer_stage_status'],
  Settlement: ['settlement_status', 'trade_settlement_status'],
};

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function statusKind(status: string): 'completed' | 'in-progress' | 'other' {
  const value = normalized(status);
  if (/^(complete|completed|done|finished|delivered|settled|distributed|cleared|departed|arrived|success)$/.test(value)) return 'completed';
  if (/^(inprogress|intransit|underway|processing|active|started|ongoing)$/.test(value)) return 'in-progress';
  return 'other';
}

function getJourney(row: Json, trade: Json, container: Json): JourneyStep[] {
  const supplied = list(
    row.container_journey ?? row.journey ?? row.tracking_stages ?? row.container_milestones ?? row.milestones
      ?? container.container_journey ?? container.journey ?? container.tracking_stages ?? container.container_milestones ?? container.milestones
      ?? trade.container_journey ?? trade.journey ?? trade.tracking_stages ?? trade.container_milestones ?? trade.milestones,
  );
  const read = (keys: string[], fallback = '') => first(row, keys, first(trade, keys, first(container, keys, fallback)));
  const routeDetails: Record<JourneyLabel, string> = {
    Origin: read(['origin', 'origin_country', 'from_country', 'country_of_origin']),
    Port: read(['port_of_loading', 'loading_port']),
    Vessel: read(['vessel_name', 'vessel']),
    Destination: read(['destination_port', 'port_of_discharge']),
    Buyer: read(['buyer_name', 'buyer']),
    Settlement: '',
  };

  return JOURNEY_LABELS.map(label => {
    const aliases = new Set(JOURNEY_ALIASES[label].map(normalized));
    const entry = supplied.find(item => aliases.has(normalized(first(item, ['stage', 'name', 'label', 'type']))));
    const directStatus = first(row, JOURNEY_STATUS_KEYS[label], first(trade, JOURNEY_STATUS_KEYS[label], first(container, JOURNEY_STATUS_KEYS[label])));
    if (!entry) return { label, status: directStatus, date: '', detail: routeDetails[label] };
    return {
      label,
      status: first(entry, ['status', 'stage_status'], directStatus),
      date: first(entry, ['date', 'occurred_at', 'completed_at', 'updated_at']),
      detail: first(entry, ['details', 'description', 'location', 'note'], routeDetails[label]),
    };
  });
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, flex: 0.9, fontSize: 12 }}>{label}</Text>
    <Text selectable style={{ color: value === 'Unavailable' ? colors.mutedForeground : colors.foreground, flex: 1.1, textAlign: 'right', fontSize: 12, lineHeight: 18, fontWeight: value === 'Unavailable' ? '400' : '600', fontVariant: mono ? ['tabular-nums'] : undefined }}>{value}</Text>
  </View>;
}

export default function ContainerTracking() {
  const { id: raw, source: rawSource } = useLocalSearchParams<{ id: string; source?: string }>();
  const id = String(raw ?? '');
  const source = String(rawSource ?? 'position');
  const isProject = source === 'project';
  const { token } = useAuth();
  const colors = useColors();
  const projectQuery = useGetInvestorProject(id, { query: { queryKey: ['investor-project', id], enabled: Boolean(id && token && isProject) } });
  const positionQuery = useGetInvestorInvestment(id, { query: { queryKey: ['investor-position', id], enabled: Boolean(id && token && !isProject) } });
  const query = isProject ? projectQuery : positionQuery;
  const row = unwrap(query.data);
  const trade = record(row.trade ?? row.project ?? row.trade_details);
  const container = record(row.container ?? row.container_details ?? trade.container ?? trade.container_details);

  const read = (keys: string[], fallback = 'Unavailable') =>
    first(row, keys, first(trade, keys, first(container, keys, fallback)));

  const containerNumber = read(['container_number', 'number']);
  const billOfLading = read(['bill_of_lading_number', 'bill_of_lading', 'bl_number']);
  const vessel = read(['vessel_name', 'vessel']);
  const loadingPort = read(['port_of_loading', 'loading_port']);
  const destinationPort = read(['destination_port', 'port_of_discharge']);
  const etd = read(['etd', 'estimated_departure', 'estimated_departure_date', 'departure_date']);
  const eta = read(['eta', 'estimated_arrival', 'estimated_arrival_date']);
  const latestUpdate = read(['latest_tracking_update', 'tracking_update_message', 'latest_update', 'tracking_update']);
  const tradeStatus = first(row, ['current_trade_status', 'trade_status', 'shipment_status'], first(trade, ['current_trade_status', 'trade_status', 'shipment_status', 'status'], first(container, ['trade_status', 'shipment_status', 'current_status', 'status'], 'Unavailable')));
  const timestampCandidates = [
    first(row, ['tracking_updated_at', 'last_tracking_update_at', 'last_updated']),
    first(trade, ['tracking_updated_at', 'last_tracking_update_at', 'last_updated']),
    first(container, ['tracking_updated_at', 'last_tracking_update_at', 'last_updated', 'updated_at']),
  ];
  const lastUpdated = timestampCandidates.find(Boolean) ?? 'Unavailable';
  const journey = getJourney(row, trade, container);

  return <Screen title="Container tracking" subtitle="Reported shipment record">
    {query.isLoading ? <Card>
      <View style={{ gap: 11 }}>
        <View style={{ width: '45%', height: 12, borderRadius: 6, backgroundColor: colors.secondary }} />
        <View style={{ width: '72%', height: 22, borderRadius: 7, backgroundColor: colors.secondary }} />
        <View style={{ width: '100%', height: 1, backgroundColor: colors.border, marginTop: 6 }} />
        <View style={{ width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.secondary }} />
        <View style={{ width: '66%', height: 12, borderRadius: 6, backgroundColor: colors.secondary }} />
      </View>
    </Card> : null}
    {query.isError ? <ErrorState message="Container information could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError ? <>
      <Card style={{ padding: 0, overflow: 'hidden', borderColor: colors.border }}>
        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 19 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryForeground, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="package" size={16} color={colors.primary} />
              </View>
              <Text style={{ color: colors.primaryForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>SHIPMENT RECORD</Text>
            </View>
            <View style={{ backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ color: colors.foreground, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>REPORTED</Text>
            </View>
          </View>
          <Text style={{ color: colors.primaryForeground, fontSize: 23, lineHeight: 29, fontWeight: '700', marginTop: 19 }}>{containerNumber}</Text>
          <Text style={{ color: colors.primaryForeground, opacity: 0.78, fontSize: 12, marginTop: 4 }}>Container number</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 17, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.accent }}>
            <Text style={{ color: colors.primaryForeground, opacity: 0.8, fontSize: 12 }}>Current trade status</Text>
            <Status value={tradeStatus} />
          </View>
        </View>
        <View style={{ paddingHorizontal: 17, paddingVertical: 5 }}>
          <DetailRow label="Bill of Lading Number" value={billOfLading} mono />
          <DetailRow label="Vessel name" value={vessel} />
          <DetailRow label="Port of loading" value={loadingPort} />
          <DetailRow label="Destination port" value={destinationPort} />
          <DetailRow label="ETD" value={etd} />
          <DetailRow label="ETA" value={eta} />
          <DetailRow label="Latest update" value={latestUpdate} />
          <DetailRow label="Last Updated" value={lastUpdated} />
        </View>
      </Card>

      <Section title="Container journey" />
      <Card style={{ paddingHorizontal: 15, paddingVertical: 16 }}>
        {journey.map((step, index) => {
          const kind = statusKind(step.status);
          const markerColor = kind === 'completed' ? colors.statusSuccess : kind === 'in-progress' ? colors.primary : colors.border;
          return <View key={step.label} style={{ flexDirection: 'row', gap: 12, minHeight: index === journey.length - 1 ? 57 : 77 }}>
            <View style={{ width: 26, alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: kind === 'other' ? 1.5 : 0, borderColor: markerColor, backgroundColor: kind === 'completed' ? colors.statusSuccess : kind === 'in-progress' ? colors.primary : colors.secondary }}>
                {kind === 'completed' ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
                {kind === 'in-progress' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryForeground }} /> : null}
              </View>
              {index < journey.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 4, backgroundColor: colors.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{step.label}</Text>
                <Text style={{ color: step.status ? colors.primary : colors.mutedForeground, fontSize: 11, fontWeight: step.status ? '700' : '400', textAlign: 'right', flexShrink: 1 }}>{step.status || 'Stage status not provided'}</Text>
              </View>
              {step.date ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{step.date}</Text> : null}
              {step.detail ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{step.detail}</Text> : null}
            </View>
          </View>;
        })}
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
          Stage labels are a reference sequence. Only stage details supplied by OG Exports are shown; missing stages are not inferred.
        </Text>
      </Card>

      <Card style={{ backgroundColor: colors.lightGreen, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
          <Feather name="info" size={17} color={colors.primary} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>Reported information only</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 5 }}>
              Live carrier tracking is not connected. This record reflects information provided by OG Exports and does not show a live vessel or container position.
            </Text>
          </View>
        </View>
      </Card>
    </> : null}
  </Screen>;
}