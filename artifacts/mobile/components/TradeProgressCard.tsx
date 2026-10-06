import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, Section } from '@/components/InvestorUI';
import { amount, first, record, type Json } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

const TRADE_STAGES = [
  { key: 'funding', label: 'Funding' },
  { key: 'investment_confirmed', label: 'Investment Confirmed' },
  { key: 'cargo_loaded', label: 'Cargo Loaded' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'custom_clearance', label: 'Custom Clearance' },
  { key: 'settled', label: 'Settled' },
] as const;

type StageKey = typeof TRADE_STAGES[number]['key'];
type StageEntry = { status: string; description: string; occurredAt: string };

type Props = {
  stageUpdates: Json[];
  periodProgress?: Json | null;
  showPeriod?: boolean;
  title?: string;
};

function eventDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function TradeProgressCard({
  stageUpdates,
  periodProgress,
  showPeriod = true,
  title = 'Trade Progress',
}: Props) {
  const colors = useColors();
  const latestByStage = new Map<StageKey, StageEntry>();

  // The API returns records in server-created order; a newer explicit record
  // replaces only the displayed state for its own stage.
  for (const rawUpdate of stageUpdates) {
    const update = record(rawUpdate);
    const stage = first(update, ['stage']) as StageKey;
    if (!TRADE_STAGES.some(item => item.key === stage)) continue;
    latestByStage.set(stage, {
      status: first(update, ['status']),
      description: first(update, ['description']),
      occurredAt: first(update, ['occurred_at']),
    });
  }

  const clearedCount = TRADE_STAGES.slice(0, 5)
    .filter(stage => latestByStage.get(stage.key)?.status === 'completed').length;
  const progress = record(periodProgress);
  const elapsedDays = amount(progress, ['days_elapsed']);
  const totalDays = amount(progress, ['total_days']);
  const progressPercent = amount(progress, ['progress_percent']);
  const hasPeriodProgress = elapsedDays !== null && totalDays !== null && totalDays > 0 && progressPercent !== null;
  const barPercent = hasPeriodProgress ? Math.max(0, Math.min(100, progressPercent)) : 0;

  return <>
    <Section title={title} />
    <Card style={{ paddingHorizontal: 16, paddingVertical: 17 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 17 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
            Stage updates reported by OG Exports.
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text testID="stage-progress-count" style={{ color: colors.primary, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {clearedCount} / 5
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>cleared</Text>
        </View>
      </View>

      <View>
        {TRADE_STAGES.map((stage, index) => {
          const update = latestByStage.get(stage.key);
          const completed = update?.status === 'completed';
          const inProgress = update?.status === 'in_progress';
          const notStarted = update?.status === 'not_started';
          const markerColor = completed ? colors.statusSuccess : inProgress ? colors.primary : colors.border;
          const statusLabel = completed
            ? 'Completed'
            : inProgress
              ? 'In progress'
              : notStarted
                ? 'Not started'
                : 'No admin update yet.';

          return <View key={stage.key} style={{ flexDirection: 'row', gap: 12, minHeight: index === TRADE_STAGES.length - 1 ? 58 : 75 }}>
            <View style={{ width: 25, alignItems: 'center' }}>
              <View style={{
                width: 23,
                height: 23,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: completed || inProgress ? 0 : 1.5,
                borderColor: markerColor,
                backgroundColor: completed ? colors.statusSuccess : inProgress ? colors.primary : colors.secondary,
              }}>
                {completed ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
                {inProgress ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryForeground }} /> : null}
              </View>
              {index < TRADE_STAGES.length - 1
                ? <View style={{ width: 1, flex: 1, marginTop: 4, backgroundColor: colors.border }} />
                : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, color: colors.foreground, fontSize: 12, fontWeight: '700' }}>
                  {stage.label}
                </Text>
                <Text testID={`stage-status-${stage.key}`} style={{
                  flexShrink: 1,
                  color: completed ? colors.statusSuccess : inProgress ? colors.primary : colors.mutedForeground,
                  fontSize: 10,
                  fontWeight: completed || inProgress || notStarted ? '700' : '400',
                  textAlign: 'right',
                }}>
                  {statusLabel}
                </Text>
              </View>
              {update?.occurredAt
                ? <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>
                    {eventDate(update.occurredAt)}
                  </Text>
                : null}
              {update?.description
                ? <Text testID={`stage-description-${stage.key}`} style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
                    {update.description}
                  </Text>
                : null}
            </View>
          </View>;
        })}
      </View>

      {showPeriod ? <View testID="investment-period-progress" style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4, paddingTop: 15 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Investment period</Text>
          {hasPeriodProgress ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 3 }}>
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>{elapsedDays}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>of</Text>
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>{totalDays}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>days</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>·</Text>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{Math.round(progressPercent!)}%</Text>
            </View>
          ) : null}
        </View>
        {hasPeriodProgress ? (
          <View style={{ height: 7, overflow: 'hidden', borderRadius: 5, backgroundColor: colors.secondary, marginTop: 9 }}>
            <View style={{ width: `${barPercent}%`, height: '100%', borderRadius: 5, backgroundColor: colors.primary }} />
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
            Investment period progress is not available.
          </Text>
        )}
      </View> : null}
    </Card>
  </>;
}
