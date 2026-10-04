import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Card } from '@/components/InvestorUI';
import { amount, first, list, money } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

type Range = '1M' | '3M' | '6M' | '1Y' | 'All';
const ranges: Range[] = ['1M', '3M', '6M', '1Y', 'All'];
const chartWidth = 320;
const chartLeft = 12;
const chartRight = chartWidth - 12;
const chartTop = 10;

export function PortfolioHistoryCard({
  points,
  currency,
  loading = false,
  defaultRange = '1M',
  compact = false,
}: {
  points: unknown;
  currency: string;
  loading?: boolean;
  defaultRange?: Range;
  compact?: boolean;
}) {
  const colors = useColors();
  const [range, setRange] = useState<Range>(defaultRange);
  const chartHeight = compact ? 142 : 174;
  const chartBottom = chartHeight - 12;
  const chartPoints = useMemo(() => {
    const all = list(points).flatMap(point => {
      const date = first(point, ['date']);
      const value = amount(point, ['value']);
      return date && value != null ? [{ point, date, value }] : [];
    });
    if (range === 'All') return all;
    const days = range === '1M' ? 30 : range === '3M' ? 90 : range === '6M' ? 180 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const firstInRange = all.findIndex(item => new Date(item.date).getTime() >= cutoff.getTime());
    return firstInRange < 0 ? [] : all.slice(Math.max(0, firstInRange - 1));
  }, [points, range]);
  const maximum = chartPoints.reduce((max, item) => Math.max(max, item.value), 0);
  const coordinates = chartPoints.map((item, index) => ({
    x: chartPoints.length < 2
      ? (chartLeft + chartRight) / 2
      : chartLeft + index / (chartPoints.length - 1) * (chartRight - chartLeft),
    y: chartBottom - item.value / (maximum || 1) * (chartBottom - chartTop),
  }));
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${chartBottom} L ${coordinates[0].x.toFixed(2)} ${chartBottom} Z`
    : '';
  const startLabel = chartPoints.length ? first(chartPoints[0].point, ['date_label'], chartPoints[0].date) : '';
  const endLabel = chartPoints.length ? first(chartPoints[chartPoints.length - 1].point, ['date_label'], chartPoints[chartPoints.length - 1].date) : '';

  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Portfolio value</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>History reported by OG Exports</Text></View>
      {chartPoints.length ? <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{currency ? money(chartPoints[chartPoints.length - 1].value, currency) : '—'}</Text> : null}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15, marginBottom: 7 }}>
      {ranges.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: range === item }} onPress={() => setRange(item)} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, backgroundColor: range === item ? colors.primary : colors.secondary }}>
        <Text style={{ color: range === item ? colors.primaryForeground : colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>{item}</Text>
      </Pressable>)}
    </View>
    {loading ? <Text style={{ color: colors.mutedForeground, paddingVertical: 22 }}>Loading portfolio history…</Text> : chartPoints.length ? <>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} accessibilityLabel={`Portfolio value history for ${range}`}>
        <Path d={areaPath} fill={colors.primary} fillOpacity={0.12} />
        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coordinates.length ? <Circle cx={coordinates[coordinates.length - 1].x} cy={coordinates[coordinates.length - 1].y} r={4} fill={colors.accent} stroke={colors.card} strokeWidth={2} /> : null}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{startLabel}</Text><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{endLabel}</Text></View>
    </> : <Text style={{ color: colors.mutedForeground, lineHeight: 20, paddingVertical: compact ? 12 : 18 }}>Portfolio history for this period is not available.</Text>}
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Historical values only; this chart does not forecast returns.</Text>
  </Card>;
}