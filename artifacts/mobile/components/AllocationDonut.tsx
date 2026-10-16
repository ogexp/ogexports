import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import Svg, { Circle, Path } from 'react-native-svg';
import { Card } from '@/components/InvestorUI';
import { money } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

export type AllocationSlice = {
  name: string;
  value: number | null;
  color?: string;
};

type Props = {
  title: string;
  subtitle: string;
  data: AllocationSlice[];
  currency: string;
  targetCurrency?: string;
  valueMode?: 'amount' | 'percentage';
  missingAmounts?: number;
  note?: string;
  displayMode?: 'standard' | 'financial';
};

const size = 184;
const center = size / 2;
const outerRadius = 78;
const innerRadius = 51;

function point(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

function arcPath(startAngle: number, endAngle: number) {
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;
  const outerStart = point(outerRadius, startAngle);
  const outerEnd = point(outerRadius, endAngle);
  const innerEnd = point(innerRadius, endAngle);
  const innerStart = point(innerRadius, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function AllocationDonut({
  title,
  subtitle,
  data,
  currency,
  targetCurrency,
  valueMode = 'amount',
  note,
  displayMode = 'standard',
}: Props) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const palette = [colors.primary, colors.accent, colors.statusPending, colors.secondaryForeground, colors.mutedForeground];
  const slices = data.flatMap((item, index) =>
    item.value != null && Number.isFinite(item.value) && item.value > 0
      ? [{ item, index }]
      : [],
  );
  const total = slices.reduce((sum, slice) => sum + (slice.item.value ?? 0), 0);
  const selected = data[Math.min(selectedIndex, Math.max(0, data.length - 1))];
  const chartSize = displayMode === 'financial' ? 132 : 154;
  let angle = 0;

  return <Card>
    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{subtitle}</Text>
    {data.length ? <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 }}>
        <View style={{ width: chartSize, height: chartSize, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={`${title}, interactive allocation chart`}>
            {!slices.length ? <Circle
              cx={center}
              cy={center}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke={colors.border}
              strokeWidth={outerRadius - innerRadius}
            /> : null}
            {slices.length === 1 ? <Circle
              cx={center}
              cy={center}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke={slices[0].item.color ?? palette[slices[0].index % palette.length]}
              strokeWidth={outerRadius - innerRadius}
              onPress={() => setSelectedIndex(slices[0].index)}
            /> : slices.map((slice, index) => {
              const start = angle;
              angle += (slice.item.value ?? 0) / total * 360;
              return <Path
                key={slice.item.name}
                d={arcPath(start, angle)}
                fill={slice.item.color ?? palette[slice.index % palette.length]}
                stroke={colors.card}
                strokeWidth={2}
                onPress={() => setSelectedIndex(slice.index)}
              />;
            })}
            <Circle cx={center} cy={center} r={innerRadius - 2} fill={colors.card} pointerEvents="none" />
          </Svg>
          <View pointerEvents="none" style={{ position: 'absolute', width: 82, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
              {selected?.value == null || total <= 0
                ? '—'
                : valueMode === 'percentage'
                  ? `${selected.value.toFixed(1)}%`
                  : `${(selected.value / total * 100).toFixed(1)}%`}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 10, textAlign: 'center', marginTop: 3 }}>
              {selected?.name ?? 'No allocation data'}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          {data.map((slice, index) => {
            const share = slice.value != null && total > 0 ? (slice.value / total) * 100 : null;
            const formattedValue = slice.value == null
              ? 'Not reported'
              : money(slice.value, currency, targetCurrency ? { targetCurrency } : {});
            const rawValueLabel = slice.value == null
              ? 'Not reported'
              : valueMode === 'percentage'
                ? `${slice.value.toFixed(1)}%`
                : formattedValue;
            const selectedSlice = selectedIndex === index;
            return <Pressable
              key={slice.name}
              accessibilityRole="button"
              accessibilityLabel={`${slice.name}, ${share == null ? 'percentage not reported' : `${share.toFixed(1)} percent`}, ${formattedValue}`}
              accessibilityState={{ selected: selectedSlice }}
              testID={`allocation-slice-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`}
              onPress={() => setSelectedIndex(index)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: displayMode === 'financial' ? 3 : 4, opacity: selectedSlice ? 1 : 0.74 }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: slice.color ?? palette[index % palette.length] }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 10, fontWeight: selectedSlice ? '700' : '500' }}>{slice.name}</Text>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 2 }}>
                  {displayMode === 'financial'
                    ? share == null ? '—' : `${share.toFixed(1)}%`
                    : rawValueLabel}
                </Text>
              </View>
              {displayMode === 'financial'
                ? <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 10, fontWeight: '700', textAlign: 'right' }}>{formattedValue}</Text>
                : <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '700' }}>{share == null ? '—' : `${share.toFixed(1)}%`}</Text>}
            </Pressable>;
          })}
        </View>
      </View>
      {note ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 7 }}>{note}</Text> : null}
    </> : <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 14 }}>
      {valueMode === 'amount' ? '0.00 USD' : '—'}
    </Text>}
  </Card>;
}