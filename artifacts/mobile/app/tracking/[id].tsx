import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  useGetInvestorInvestment,
  useGetInvestorProject,
  type ContainerTracking,
  type InvestorProjectDetail,
} from '@workspace/api-client-react';
import { Card, ErrorState, Screen, Section, Status } from '@/components/InvestorUI';
import { unwrap } from '@/lib/data';
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

const JOURNEY_KEYS: Record<JourneyLabel, keyof ContainerTracking['container_journey']> = {
  Origin: 'origin',
  Port: 'port',
  Vessel: 'vessel',
  Destination: 'destination',
  Buyer: 'buyer',
  Settlement: 'settlement',
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

function getJourney(container?: ContainerTracking): JourneyStep[] {
  return JOURNEY_LABELS.map(label => {
    const stage = container?.container_journey[JOURNEY_KEYS[label]];
    return {
      label,
      status: stage?.status ?? '',
      date: stage?.date ?? '',
      detail: stage?.details ?? '',
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
  const row = unwrap(query.data) as InvestorProjectDetail;
  const container = row.container;
  const read = (value?: string | null) => value?.trim() || 'Unavailable';

  const containerNumber = read(container?.container_number);
  const billOfLading = read(container?.bill_of_lading_number);
  const vessel = read(container?.vessel_name);
  const loadingPort = read(container?.port_of_loading);
  const destinationPort = read(container?.destination_port);
  const etd = read(container?.etd);
  const eta = read(container?.eta);
  const latestUpdate = read(container?.latest_tracking_update);
  const tradeStatus = read(container?.trade_status);
  const lastUpdated = read(container?.tracking_updated_at);
  const journey = getJourney(container);

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