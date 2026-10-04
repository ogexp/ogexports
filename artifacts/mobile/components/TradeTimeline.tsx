import React from 'react';
import { Text, View } from 'react-native';
import { Card, Section, Status } from '@/components/InvestorUI';
import { first, type Json } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

const stages = [
  { label: 'Investment Confirmation', aliases: ['investmentconfirmation', 'investmentconfirmed', 'investmentapproved'] },
  { label: 'Trade Execution', aliases: ['tradeexecution', 'tradeexecuted', 'cargoprocurement', 'procurement', 'cargoprepared', 'prepared'] },
  { label: 'Shipment', aliases: ['shipment', 'shipped', 'shipping', 'origin', 'port', 'vessel', 'containerstuffed', 'stuffed', 'customsclearance', 'customscleared', 'portdeparture', 'departedport', 'intransit', 'transit'] },
  { label: 'Delivery', aliases: ['delivery', 'delivered', 'destination', 'destinationarrival', 'arrivedatdestination', 'buyer', 'buyerdelivery', 'deliveredtobuyer'] },
  { label: 'Settlement', aliases: ['settlement', 'settled'] },
  { label: 'Distribution', aliases: ['distribution', 'distributed'] },
] as const;

const stageLabels = new Map<string, string>();
for (const stage of stages) {
  for (const alias of [stage.label, ...stage.aliases]) stageLabels.set(normalize(alias), stage.label);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function stageName(event: Json) {
  return first(event, ['stage', 'milestone', 'step', 'event_type', 'event', 'title', 'name', 'label']);
}

function eventStatus(event: Json) {
  return first(event, ['status', 'state', 'milestone_status', 'completion_status'], 'Status not provided by OG Exports');
}

export function TradeTimeline({ events, title = 'Timeline' }: { events: Json[]; title?: string }) {
  const colors = useColors();
  const stageEvents = stages.map(stage => ({
    ...stage,
    events: events.filter(item => stageLabels.get(normalize(stageName(item))) === stage.label),
  }));
  const unmatchedEvents = events.filter(event => !stageLabels.has(normalize(stageName(event))));

  return <>
    <Section title={title} />
    <Card>
      {stageEvents.map((stage, index) => {
        return <View key={stage.label} style={{ flexDirection: 'row', gap: 12, minHeight: index < stageEvents.length - 1 ? 67 : 52 }}>
          <View style={{ width: 20, alignItems: 'center' }}>
            <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }} />
            {index < stageEvents.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 3, backgroundColor: colors.border }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 14 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>{stage.label}</Text>
            {stage.events.length ? stage.events.map((event, eventIndex) => {
              const label = stageName(event);
              const description = first(event, ['description', 'details', 'message', 'note']);
              const date = first(event, ['date', 'updated_at', 'created_at', 'timestamp']);
              return <View key={`${stage.label}-${first(event, ['id', 'event_id'], String(eventIndex))}`} style={{ marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: colors.secondary }}>
                {label && normalize(label) !== normalize(stage.label) ? <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', marginBottom: 5 }}>{label}</Text> : null}
                <Status value={eventStatus(event)} />
                {description ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 5 }}>{description}</Text> : null}
                {date ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{date}</Text> : null}
              </View>;
            }) : <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 5 }}>Status not provided by OG Exports</Text>}
          </View>
        </View>;
      })}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 3 }}>
        Stage statuses, descriptions, and dates are reported by OG Exports. No progress is inferred by the app.
      </Text>
      {unmatchedEvents.length ? <>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 13 }} />
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>Other updates</Text>
        {unmatchedEvents.map((event, index) => <View key={first(event, ['id', 'event_id'], String(index))} style={{ paddingVertical: 9, borderBottomWidth: index < unmatchedEvents.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1 }}>{stageName(event) || 'Trade update'}</Text>
            <Status value={eventStatus(event)} />
          </View>
          {first(event, ['description', 'details', 'message', 'note']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{first(event, ['description', 'details', 'message', 'note'])}</Text> : null}
          {first(event, ['date', 'updated_at', 'created_at', 'timestamp']) ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{first(event, ['date', 'updated_at', 'created_at', 'timestamp'])}</Text> : null}
        </View>)}
      </> : null}
    </Card>
  </>;
}