import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Card, Section } from '@/components/InvestorUI';
import { amount, first, record, type Json } from '@/lib/data';
import { useColors } from '@/hooks/useColors';
import { resolveTradeProgress, TRADE_STAGES } from '@/lib/trade-progress';
import { MotionProgress, MotionReveal } from '@/lib/motion';

type Props = {
  stageUpdates: Json[];
  projectStatus?: string;
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
  projectStatus = '',
  periodProgress,
  showPeriod = true,
  title = 'Trade Progress',
}: Props) {
  const colors = useColors();
  const stageRecords = stageUpdates.map(rawUpdate => {
    const update = record(rawUpdate);
    return {
      stage: first(update, ['stage']),
      status: first(update, ['status']),
      description: first(update, ['description']),
      occurred_at: first(update, ['occurred_at']),
      created_at: first(update, ['created_at']),
    };
  });
  const { latestByStage, completedCount } = resolveTradeProgress(stageRecords, projectStatus);
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
            {completedCount} / {TRADE_STAGES.length}
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
          const statusLabel = update?.statusLabel ?? 'No admin update yet.';

          return <MotionReveal key={`${stage.key}-${statusLabel}`} style={{ flexDirection: 'row', gap: 12, minHeight: index === TRADE_STAGES.length - 1 ? 58 : 75 }}>
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
          </MotionReveal>;
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
          <MotionProgress value={barPercent} height={7} color={colors.primary} trackColor={colors.secondary} style={{ marginTop: 9 }} accessibilityLabel="Investment period progress" />
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 6 }}>
            Investment period progress is not available.
          </Text>
        )}
      </View> : null}
    </Card>
  </>;
}
