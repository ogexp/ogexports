import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, Section, Status } from '@/components/InvestorUI';
import { first, type Json } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

const stages = [
  { label: 'Trade Created', aliases: ['tradecreated', 'created'] },
  { label: 'Cargo Procurement', aliases: ['cargoprocurement', 'procurement'] },
  { label: 'Cargo Prepared', aliases: ['cargoprepared', 'prepared'] },
  { label: 'Container Stuffed', aliases: ['containerstuffed', 'stuffed'] },
  { label: 'Customs Clearance', aliases: ['customsclearance', 'customscleared'] },
  { label: 'Port Departure', aliases: ['portdeparture', 'departedport'] },
  { label: 'In Transit', aliases: ['intransit', 'transit'] },
  { label: 'Destination Arrival', aliases: ['destinationarrival', 'arrivedatdestination'] },
  { label: 'Buyer Delivery', aliases: ['buyerdelivery', 'deliveredtobuyer'] },
  { label: 'Trade Settlement', aliases: ['tradesettlement', 'settlement'] },
  { label: 'Distribution', aliases: ['distribution', 'distributed'] },
] as const;

const stageLabels = new Map<string, string>();
for (const stage of stages) {
  for (const alias of [stage.label, ...stage.aliases]) {
    stageLabels.set(normalize(alias), stage.label);
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function stageName(event: Json) {
  return first(event, ['stage', 'milestone', 'step', 'event_type', 'event', 'title', 'name', 'label']);
}

function eventStatus(event: Json) {
  return first(event, ['status', 'state', 'milestone_status', 'completion_status'], 'Status not provided');
}

function statusKind(status: string): 'completed' | 'in-progress' | 'other' {
  const value = normalize(status);
  if (/^(complete|completed|done|finished|delivered|settled|distributed|cleared|departed|arrived|success)$/.test(value)) return 'completed';
  if (/^(inprogress|intransit|underway|processing|active|started|ongoing)$/.test(value)) return 'in-progress';
  return 'other';
}

export function TradeTimeline({ events, title = 'Trade timeline' }: { events: Json[]; title?: string }) {
  const colors = useColors();
  const stageEvents = stages.map(stage => ({
    ...stage,
    event: events.find(item => stageLabels.get(normalize(stageName(item))) === stage.label),
  }));
  const unmatchedEvents = events.filter(event => !stageLabels.has(normalize(stageName(event))));

  return <>
    <Section title={title} />
    <Card>
      {stageEvents.map((stage, index) => {
        const event = stage.event;
        const status = event ? eventStatus(event) : 'Status not provided';
        const kind = event ? statusKind(status) : 'other';
        const markerColor = kind === 'completed' ? colors.statusSuccess : kind === 'in-progress' ? colors.primary : colors.border;
        const description = event ? first(event, ['description', 'message', 'note']) : '';
        const date = event ? first(event, ['updated_at', 'created_at', 'date', 'timestamp']) : '';
        return <View key={stage.label} style={{ flexDirection: 'row', gap: 12, minHeight: index < stageEvents.length - 1 ? 67 : 52 }}>
          <View style={{ width: 20, alignItems: 'center' }}>
            <View style={{ width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: kind === 'completed' ? colors.statusSuccess : kind === 'in-progress' ? colors.primary : colors.card, borderWidth: kind === 'other' ? 1.5 : 0, borderColor: markerColor }}>
              {kind === 'completed' ? <Feather name="check" size={11} color={colors.primaryForeground} /> : null}
              {kind === 'in-progress' ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primaryForeground }} /> : null}
            </View>
            {index < stageEvents.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 3, backgroundColor: colors.border }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', flex: 1 }}>{stage.label}</Text>
              {event ? <Status value={status} /> : <Text style={{ color: colors.mutedForeground, fontSize: 10, textAlign: 'right' }}>Status not provided</Text>}
            </View>
            {description ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{description}</Text> : null}
            {date ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{date}</Text> : null}
          </View>
        </View>;
      })}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 3 }}>
        Stage statuses and update dates are provided by OG Exports. No progress is inferred by the app.
      </Text>
      {unmatchedEvents.length ? <>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 13 }} />
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Other updates from OG Exports</Text>
        {unmatchedEvents.map((event, index) => <View key={first(event, ['id', 'event_id'], String(index))} style={{ paddingVertical: 9, borderBottomWidth: index < unmatchedEvents.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1 }}>{stageName(event) || 'Trade update'}</Text>
            <Status value={eventStatus(event)} />
          </View>
          {first(event, ['description', 'message', 'note']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{first(event, ['description', 'message', 'note'])}</Text> : null}
          {first(event, ['updated_at', 'created_at', 'date', 'timestamp']) ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{first(event, ['updated_at', 'created_at', 'date', 'timestamp'])}</Text> : null}
        </View>)}
      </> : null}
    </Card>
  </>;
}