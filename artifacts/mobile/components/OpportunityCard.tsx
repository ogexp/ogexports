import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/InvestorUI';
import { amount, first, moneyToCurrency, record } from '@/lib/data';
import { useColors } from '@/hooks/useColors';
import { opportunityStatusGroup } from '@/lib/opportunities';
import { MOTION, MotionProgress, useMotion } from '@/lib/motion';

type OpportunityCardProps = {
  item: Record<string, unknown>;
  featured: boolean;
  progress: number | null;
  apiOrigin: string;
  onPress?: () => void;
};

const countryAliases: Record<string, string> = {
  afghanistan: 'AF', af: 'AF', algeria: 'DZ', dz: 'DZ', australia: 'AU', au: 'AU',
  austria: 'AT', at: 'AT', bangladesh: 'BD', bd: 'BD', bahrain: 'BH', bh: 'BH', belgium: 'BE', be: 'BE',
  brazil: 'BR', br: 'BR', canada: 'CA', ca: 'CA', china: 'CN', cn: 'CN',
  egypt: 'EG', eg: 'EG', france: 'FR', fr: 'FR', germany: 'DE', de: 'DE',
  india: 'IN', in: 'IN', indonesia: 'ID', id: 'ID', iraq: 'IQ', iq: 'IQ',
  italy: 'IT', it: 'IT', japan: 'JP', jp: 'JP', kenya: 'KE', ke: 'KE',
  kuwait: 'KW', kw: 'KW', malaysia: 'MY', my: 'MY', mexico: 'MX', mx: 'MX',
  nepal: 'NP', np: 'NP', 'new zealand': 'NZ', nz: 'NZ', netherlands: 'NL',
  holland: 'NL', nl: 'NL', nigeria: 'NG', ng: 'NG', oman: 'OM', om: 'OM',
  pakistan: 'PK', pk: 'PK', philippines: 'PH', ph: 'PH', poland: 'PL', pl: 'PL',
  qatar: 'QA', qa: 'QA', russia: 'RU', ru: 'RU', 'saudi arabia': 'SA',
  saudi: 'SA', ksa: 'SA', sa: 'SA', singapore: 'SG', sg: 'SG',
  'south africa': 'ZA', za: 'ZA', 'south korea': 'KR', kr: 'KR',
  'republic of korea': 'KR', spain: 'ES', es: 'ES',
  'sri lanka': 'LK', lk: 'LK', thailand: 'TH', th: 'TH', turkey: 'TR',
  turkiye: 'TR', tr: 'TR', ukraine: 'UA', ua: 'UA',
  'united arab emirates': 'AE', uae: 'AE', emirates: 'AE', ae: 'AE',
  'united kingdom': 'GB', britain: 'GB', england: 'GB', uk: 'GB', gb: 'GB',
  'united states': 'US', usa: 'US', us: 'US', vietnam: 'VN', vn: 'VN',
  karachi: 'PK', lahore: 'PK', islamabad: 'PK', dubai: 'AE', 'abu dhabi': 'AE',
  'jebel ali': 'AE', doha: 'QA', mumbai: 'IN', chennai: 'IN', dhaka: 'BD',
  shanghai: 'CN', beijing: 'CN',
};

const countryNameByCode: Record<string, string> = {
  AE: 'UAE', AF: 'Afghanistan', AT: 'Austria', AU: 'Australia', BD: 'Bangladesh', BE: 'Belgium',
  BR: 'Brazil', CA: 'Canada', CN: 'China', DE: 'Germany', DZ: 'Algeria',
  EG: 'Egypt', ES: 'Spain', FR: 'France', GB: 'United Kingdom', ID: 'Indonesia', IN: 'India',
  IQ: 'Iraq', IT: 'Italy', JP: 'Japan', KE: 'Kenya', KR: 'South Korea',
  KW: 'Kuwait', LK: 'Sri Lanka', MY: 'Malaysia', NG: 'Nigeria',
  NL: 'Netherlands', NZ: 'New Zealand', OM: 'Oman', PH: 'Philippines',
  PK: 'Pakistan', PL: 'Poland', QA: 'Qatar', RU: 'Russia', SA: 'Saudi Arabia',
  SG: 'Singapore', TH: 'Thailand', TR: 'Türkiye', UA: 'Ukraine',
  US: 'United States', VN: 'Vietnam', ZA: 'South Africa',
};

function dataSources(item: Record<string, unknown>) {
  const trade = record(item.trade ?? item.project ?? item.trade_details);
  return [
    item,
    trade,
    record(item.meta),
    record(trade.meta),
    record(item.cargo ?? item.cargo_details),
    record(item.container ?? item.container_details ?? trade.container ?? trade.container_details),
  ];
}

function opportunityValue(item: Record<string, unknown>, keys: string[]) {
  for (const source of dataSources(item)) {
    const value = first(source, keys);
    if (value) return value;
  }
  return '';
}

function opportunityAmount(item: Record<string, unknown>, keys: string[]) {
  for (const source of dataSources(item)) {
    const value = amount(source, keys);
    if (value != null) return value;
  }
  return null;
}

function countryCode(location: string) {
  const normalized = location.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (countryAliases[normalized]) return countryAliases[normalized];
  const aliases = Object.keys(countryAliases).filter(alias => alias.length > 2).sort((a, b) => b.length - a.length);
  const match = aliases.find(alias => ` ${normalized} `.includes(` ${alias} `));
  return match ? countryAliases[match] : '';
}

function flagForCode(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...Array.from(code, letter => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

function countryBadgeLabel(location: string) {
  const text = location.trim();
  if (!text) return '';
  const hasFlag = Array.from(text).some(character => {
    const point = character.codePointAt(0) ?? 0;
    return point >= 0x1f1e6 && point <= 0x1f1ff;
  });
  if (hasFlag) return text;
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const code = countryCode(text);
  if (!code) return text;
  const name = /^[a-z]{2}$/.test(normalized) ? countryNameByCode[code] ?? code : text;
  return `${flagForCode(code)} ${name}`;
}

function countryDestinationLabel(destination: string) {
  return destination ? countryBadgeLabel(destination) : '';
}

function imageUri(item: Record<string, unknown>, apiOrigin: string) {
  const raw = opportunityValue(item, ['image_url', 'imageUrl', 'image_path', 'imagePath']);
  if (/^(https?:|data:)/i.test(raw)) return raw;
  if (!raw || !apiOrigin) return '';
  return `${apiOrigin.replace(/\/+$/, '')}/${raw.replace(/^\/+/, '')}`;
}

function durationLabel(item: Record<string, unknown>) {
  const days = opportunityAmount(item, ['investment_period_days', 'duration_days', 'trade_duration_days', 'cycle_days']);
  if (days != null) return `${days}d`;
  const label = opportunityValue(item, ['trade_cycle', 'estimated_trade_cycle', 'duration', 'term', 'investment_duration']);
  const match = label.match(/^(\d+(?:\.\d+)?)\s*days?$/i);
  return match ? `${match[1]}d` : label;
}

function statusPresentation(status: string) {
  const normalized = status.toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const group = opportunityStatusGroup({ trade_status: status });
  return {
    label: group ?? (status ? normalized.replace(/\b\w/g, letter => letter.toUpperCase()) : '—'),
    group,
  };
}

export function OpportunityCard({ item, featured, progress, apiOrigin, onPress }: OpportunityCardProps) {
  const colors = useColors();
  const { reduceMotion } = useMotion();
  const [imageFailed, setImageFailed] = useState(false);
  const title = opportunityValue(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name']) || '—';
  const status = statusPresentation(opportunityValue(item, ['trade_status', 'project_status', 'status', 'state']));
  const destination = opportunityValue(item, ['destination', 'destination_country', 'to_country', 'destination_market', 'destinationCountry', 'toCountry']);
  const countryLabel = countryDestinationLabel(destination);
  const image = imageUri(item, apiOrigin);
  const currency = opportunityValue(item, ['currency', 'investment_currency']);
  const target = opportunityAmount(item, ['target_amount', 'funding_target', 'total_trade_requirement', 'investment_requirement', 'total_investment_required', 'amount']);
  const funded = opportunityAmount(item, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
  const remaining = opportunityAmount(item, ['remaining_amount', 'remaining_capacity', 'remaining_funding']);
  const minimum = opportunityAmount(item, ['minimum_investment', 'min_investment', 'minimum_amount', 'minimum_investment_amount']);
  const reference = opportunityValue(item, ['container_number', 'container_no', 'containerNumber', 'trade_id', 'trade_code', 'code', 'reference']);
  const containerType = opportunityValue(item, ['container_type', 'container_size_type']);
  const referenceLabel = reference
    ? `${reference}${containerType ? ` (${containerType})` : ''}`
    : 'Trade ID unavailable';
  const direction = opportunityValue(item, ['trade_direction', 'tradeDirection', 'direction']);
  const directionLabel = direction.toLowerCase() === 'import' ? 'Import'
    : direction.toLowerCase() === 'export' ? 'Export' : '';
  const returnRate = opportunityValue(item, ['roi_label', 'target_return', 'projected_return', 'expected_return', 'return_rate', 'roi'])
    || (opportunityAmount(item, ['expected_return_pct']) != null ? `${opportunityAmount(item, ['expected_return_pct'])}%` : '—');
  const currencyLabel = currency || 'USD';
  const formatMoney = (value: number | null) => moneyToCurrency(value, currencyLabel, 'USD');
  const fundingProgress = progress == null
    ? opportunityAmount(item, ['funding_percentage', 'funding_progress_percent', 'funding_progress_pct', 'progress_percentage'])
    : progress;
  const boundedProgress = fundingProgress == null ? null : Math.max(0, Math.min(100, Math.round(fundingProgress)));
  const statusColor = status.group === 'Completed'
    ? { foreground: colors.statusSuccess, background: colors.statusSuccessBackground }
    : status.group === 'Shipping'
      ? { foreground: colors.statusPending, background: colors.statusPendingBackground }
      : status.group === 'Open'
        ? { foreground: colors.primary, background: colors.lightGreen }
        : { foreground: colors.mutedForeground, background: colors.secondary };
  const accessibilityTitle = reference === '' ? title : reference;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View opportunity ${accessibilityTitle}: ${title}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1, transform: [{ scale: pressed && !reduceMotion ? MOTION.pressScale : 1 }] })}
    >
      <Card style={{
        padding: 0,
        overflow: 'hidden',
        borderWidth: featured ? 1.5 : 1,
        borderColor: featured ? colors.accent : colors.border,
      }}>
        <View style={{ height: 174, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}>
          {image && !imageFailed ? (
            <Image
              source={{ uri: image }}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
              accessible={false}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            />
          ) : (
            <Feather name="package" size={34} color={colors.mutedForeground} />
          )}
          <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            {countryLabel ? <View style={{ maxWidth: '80%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primary }}>
              <Text numberOfLines={2} style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '600', lineHeight: 15 }}>{countryLabel}</Text>
            </View> : <View />}
            <View style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: statusColor.background }}>
              <Text style={{ color: statusColor.foreground, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 15, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Feather name="box" size={19} color={colors.mutedForeground} />
              <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontSize: 12 }}>{referenceLabel}</Text>
            </View>
            {directionLabel ? <View style={{ borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: colors.lightGreen }}>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                {directionLabel}
              </Text>
            </View> : null}
          </View>

          <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 20, fontWeight: '700', marginTop: 8 }}>{title}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 24 }}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              {boundedProgress == null ? 'Funding progress not reported' : `${boundedProgress}% funded`}
            </Text>
            <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.mutedForeground, fontSize: 14, textAlign: 'right' }}>
              {formatMoney(funded)} / {formatMoney(target)}
            </Text>
          </View>

          {boundedProgress != null ? <MotionProgress value={boundedProgress} height={7} color={colors.primary} trackColor={colors.border} style={{ marginTop: 10 }} /> : null}

          <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 10 }}>
            <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '700' }}>{formatMoney(remaining)}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, marginLeft: 4 }}>remaining</Text>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            {[
              ['Return', returnRate],
              ['Term', durationLabel(item) || '—'],
              ['Min. investment', formatMoney(minimum)],
            ].map(([label, value]) => <View key={label} style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
              <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '500' }}>{label}</Text>
              <Text numberOfLines={1} style={{ color: label === 'Return' ? colors.primary : colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 5 }}>{value}</Text>
            </View>)}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
