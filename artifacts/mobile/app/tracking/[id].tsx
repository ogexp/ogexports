import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useGetInvestorInvestment, useGetInvestorProject } from '@workspace/api-client-react';
import { Card, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type JourneyStep = {
  label: string;
  status: string;
  date: string;
  detail: string;
};

const JOURNEY_LABELS = ['Origin', 'Port', 'Vessel', 'Destination', 'Buyer', 'Settlement'] as const;

function hasTimestamp(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value) && Number.isFinite(Date.parse(value));
}

function getJourney(row: Record<string, unknown>, container: Record<string, unknown>): JourneyStep[] {
  const supplied = list(
    row.container_journey ?? row.journey ?? row.tracking_stages ?? row.container_milestones ?? row.milestones
      ?? container.container_journey ?? container.journey ?? container.tracking_stages ?? container.container_milestones ?? container.milestones,
  );

  return JOURNEY_LABELS.map(label => {
    const entry = supplied.find(item => first(item, ['stage', 'name', 'label', 'type']).toLowerCase() === label.toLowerCase());
    if (!entry) return { label, status: '', date: '', detail: '' };
    return {
      label,
      status: first(entry, ['status', 'stage_status']),
      date: first(entry, ['date', 'occurred_at', 'completed_at', 'updated_at']),
      detail: first(entry, ['details', 'description', 'location', 'note']),
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

  const read = (rowKeys: string[], containerKeys: string[], fallback = 'Unavailable') =>
    first(row, rowKeys, first(container, containerKeys, fallback));

  const containerNumber = read(['container_number'], ['container_number', 'number']);
  const billOfLading = read(['bill_of_lading_number', 'bill_of_lading', 'bl_number'], ['bill_of_lading_number', 'bill_of_lading', 'bl_number']);
  const vessel = read(['vessel_name', 'vessel'], ['vessel_name', 'vessel']);
  const loadingPort = read(['port_of_loading', 'loading_port'], ['port_of_loading', 'loading_port']);
  const destinationPort = read(['destination_port', 'port_of_discharge'], ['destination_port', 'port_of_discharge']);
  const etd = read(['etd', 'departure_date'], ['etd', 'departure_date']);
  const eta = read(['eta', 'estimated_arrival'], ['eta', 'estimated_arrival']);
  const latestUpdate = read(['latest_update', 'last_updated', 'updated_at'], ['latest_update', 'last_updated', 'updated_at']);
  const tradeStatus = first(row, ['trade_status', 'shipment_status'], first(container, ['status', 'current_status'], 'Unavailable'));
  const timestampCandidates = [
    first(row, ['updated_at', 'last_updated']),
    first(container, ['updated_at', 'last_updated']),
  ];
  const lastUpdated = timestampCandidates.find(hasTimestamp) ?? 'Unavailable';
  const journey = getJourney(row, container);

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
          <DetailRow label="Bill of lading" value={billOfLading} mono />
          <DetailRow label="Vessel name" value={vessel} />
          <DetailRow label="Port of loading" value={loadingPort} />
          <DetailRow label="Destination port" value={destinationPort} />
          <DetailRow label="ETD" value={etd} />
          <DetailRow label="ETA" value={eta} />
          <DetailRow label="Latest update" value={latestUpdate} />
          <DetailRow label="Last updated" value={lastUpdated} />
        </View>
      </Card>

      <Section title="Container journey" />
      <Card style={{ paddingHorizontal: 15, paddingVertical: 16 }}>
        {journey.map((step, index) => {
          const supplied = Boolean(step.status || step.date || step.detail);
          return <View key={step.label} style={{ flexDirection: 'row', gap: 12, minHeight: index === journey.length - 1 ? 57 : 77 }}>
            <View style={{ width: 26, alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: supplied ? colors.primary : colors.border, backgroundColor: supplied ? colors.lightGreen : colors.secondary }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: supplied ? colors.primary : colors.mutedForeground }} />
              </View>
              {index < journey.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 4, backgroundColor: colors.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{step.label}</Text>
                {step.status ? <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', textAlign: 'right', flexShrink: 1 }}>{step.status}</Text> : null}
              </View>
              {step.date ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{step.date}</Text> : null}
              {step.detail ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{step.detail}</Text> : null}
              {!supplied ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>No stage update provided</Text> : null}
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