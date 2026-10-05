import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import Svg, { Circle, Path } from 'react-native-svg';
import { Card } from '@/components/InvestorUI';
import { money } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

export type AllocationSlice = {
  name: string;
  value: number;
};

type Props = {
  title: string;
  subtitle: string;
  data: AllocationSlice[];
  currency: string;
  valueMode?: 'amount' | 'percentage';
  missingAmounts?: number;
  note?: string;
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

export function AllocationDonut({ title, subtitle, data, currency, valueMode = 'amount', note }: Props) {
  const colors = useColors();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const palette = [colors.primary, colors.accent, colors.statusPending, colors.secondaryForeground, colors.mutedForeground];
  const slices = data.filter(item => Number.isFinite(item.value) && item.value > 0);
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  const selected = slices[Math.min(selectedIndex, Math.max(0, slices.length - 1))];
  let angle = 0;

  return <Card>
    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{subtitle}</Text>
    {slices.length ? <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 }}>
        <View style={{ width: 154, height: 154, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={154} height={154} viewBox={`0 0 ${size} ${size}`} accessibilityLabel={`${title}, interactive allocation chart`}>
            {slices.length === 1 ? <Circle
              cx={center}
              cy={center}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke={palette[0]}
              strokeWidth={outerRadius - innerRadius}
              onPress={() => setSelectedIndex(0)}
            /> : slices.map((slice, index) => {
              const start = angle;
              angle += slice.value / total * 360;
              return <Path
                key={slice.name}
                d={arcPath(start, angle)}
                fill={palette[index % palette.length]}
                stroke={colors.card}
                strokeWidth={2}
                onPress={() => setSelectedIndex(index)}
              />;
            })}
            <Circle cx={center} cy={center} r={innerRadius - 2} fill={colors.card} pointerEvents="none" />
          </Svg>
          <View pointerEvents="none" style={{ position: 'absolute', width: 82, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
              {selected ? valueMode === 'percentage' ? `${selected.value.toFixed(1)}%` : `${(selected.value / total * 100).toFixed(1)}%` : '—'}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 10, textAlign: 'center', marginTop: 3 }}>
              {selected?.name ?? 'No allocation data'}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          {slices.map((slice, index) => {
            const share = slice.value / total * 100;
            const rawValueLabel = valueMode === 'percentage' ? `${slice.value.toFixed(1)}%` : money(slice.value, currency);
            const selectedSlice = selectedIndex === index;
            return <Pressable
              key={slice.name}
              accessibilityRole="button"
              accessibilityLabel={valueMode === 'percentage'
                ? `${slice.name}, ${slice.value.toFixed(1)} percent`
                : `${slice.name}, ${share.toFixed(1)} percent, ${money(slice.value, currency)}`}
              accessibilityState={{ selected: selectedSlice }}
              testID={`allocation-slice-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`}
              onPress={() => setSelectedIndex(index)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, opacity: selectedSlice ? 1 : 0.74 }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette[index % palette.length] }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 10, fontWeight: selectedSlice ? '700' : '500' }}>{slice.name}</Text>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 2 }}>{rawValueLabel}</Text>
              </View>
              <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '700' }}>{share.toFixed(1)}%</Text>
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