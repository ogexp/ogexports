import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, Status } from '@/components/InvestorUI';
import { amount, first, money, record } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

type OpportunityCardProps = {
  item: Record<string, unknown>;
  categoryLabel: string;
  featured: boolean;
  progress: number | null;
  onPress?: () => void;
};

const countryAliases: Record<string, string> = {
  afghanistan: 'AF', af: 'AF', australia: 'AU', au: 'AU', bangladesh: 'BD', bd: 'BD',
  bahrain: 'BH', bh: 'BH', belgium: 'BE', be: 'BE', brazil: 'BR', br: 'BR',
  canada: 'CA', ca: 'CA', china: 'CN', cn: 'CN', egypt: 'EG', eg: 'EG',
  france: 'FR', fr: 'FR', germany: 'DE', de: 'DE', india: 'IN', in: 'IN',
  indonesia: 'ID', id: 'ID', iraq: 'IQ', iq: 'IQ', italy: 'IT', it: 'IT',
  japan: 'JP', jp: 'JP', kenya: 'KE', ke: 'KE', kuwait: 'KW', kw: 'KW',
  malaysia: 'MY', my: 'MY', mexico: 'MX', mx: 'MX', nepal: 'NP', np: 'NP',
  'new zealand': 'NZ', nz: 'NZ', netherlands: 'NL', holland: 'NL', nl: 'NL', nigeria: 'NG', ng: 'NG',
  oman: 'OM', om: 'OM', pakistan: 'PK', pk: 'PK', philippines: 'PH', ph: 'PH',
  poland: 'PL', pl: 'PL', qatar: 'QA', qa: 'QA', russia: 'RU', ru: 'RU',
  'saudi arabia': 'SA', saudi: 'SA', ksa: 'SA', sa: 'SA', singapore: 'SG', sg: 'SG',
  'south africa': 'ZA', za: 'ZA', 'south korea': 'KR', 'republic of korea': 'KR', kr: 'KR',
  spain: 'ES', es: 'ES', 'sri lanka': 'LK', lk: 'LK', thailand: 'TH', th: 'TH',
  turkey: 'TR', turkiye: 'TR', tr: 'TR', ukraine: 'UA', ua: 'UA',
  'united arab emirates': 'AE', uae: 'AE', emirates: 'AE', ae: 'AE',
  'united kingdom': 'GB', britain: 'GB', england: 'GB', uk: 'GB', gb: 'GB',
  'united states': 'US', usa: 'US', us: 'US', vietnam: 'VN', vn: 'VN',
  karachi: 'PK', lahore: 'PK', islamabad: 'PK', dubai: 'AE', 'abu dhabi': 'AE',
  'jebel ali': 'AE', doha: 'QA', mumbai: 'IN', chennai: 'IN',
  dhaka: 'BD', shanghai: 'CN', beijing: 'CN',
};

const countryNameByCode: Record<string, string> = {
  AE: 'UAE', AU: 'Australia', BD: 'Bangladesh', BR: 'Brazil', CA: 'Canada',
  CN: 'China', DE: 'Germany', EG: 'Egypt', ES: 'Spain', FR: 'France',
  GB: 'United Kingdom', ID: 'Indonesia', IN: 'India', IT: 'Italy', JP: 'Japan',
  KE: 'Kenya', KR: 'South Korea', KW: 'Kuwait', LK: 'Sri Lanka', MY: 'Malaysia',
  NG: 'Nigeria', NL: 'Netherlands', NZ: 'New Zealand', OM: 'Oman', PH: 'Philippines',
  PK: 'Pakistan', PL: 'Poland', QA: 'Qatar', RU: 'Russia', SA: 'Saudi Arabia',
  SG: 'Singapore', TH: 'Thailand', TR: 'Türkiye', UA: 'Ukraine', US: 'United States',
  VN: 'Vietnam', ZA: 'South Africa',
};

function dataSources(item: Record<string, unknown>) {
  return [
    item,
    record(item.trade ?? item.project ?? item.trade_details),
    record(item.cargo ?? item.cargo_details),
    record(item.container ?? item.container_details),
  ];
}

function opportunityValue(item: Record<string, unknown>, keys: string[], fallback = '') {
  for (const source of dataSources(item)) {
    const value = first(source, keys);
    if (value) return value;
  }
  return fallback;
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
  const aliases = Object.keys(countryAliases).filter(alias => alias.length > 2).sort((left, right) => right.length - left.length);
  const match = aliases.find(alias => ` ${normalized} `.includes(` ${alias} `));
  return match ? countryAliases[match] : '';
}

function flagForCode(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...Array.from(code, letter => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

function locationWithFlag(location: string) {
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
  const label = /^[a-z]{2}$/.test(normalized) ? countryNameByCode[code] ?? code : text;
  return `${label} ${flagForCode(code)}`;
}

function tradeReferenceLabel(value: string) {
  const reference = value.trim();
  if (!reference || /^(trade id|trade reference) not provided$/i.test(reference)) return 'Trade ID not provided';
  if (/^trade\s*#/i.test(reference)) return reference;
  return `Trade #${reference.replace(/^trade\s*/i, '')}`;
}

function durationLabel(item: Record<string, unknown>) {
  const days = opportunityAmount(item, ['duration_days', 'trade_duration_days', 'cycle_days']);
  if (days != null) return `${days} days`;
  const label = opportunityValue(item, ['trade_cycle', 'estimated_trade_cycle', 'duration', 'term', 'investment_duration']);
  return label && Number.isFinite(Number(label)) ? `${label} days` : label;
}

function moneyLabel(value: number | null, currency: string) {
  if (value == null) return 'Not provided';
  return currency ? money(value, currency) : `${value.toLocaleString('en-US')} · currency not provided`;
}

export function OpportunityCard({ item, categoryLabel, featured, progress, onPress }: OpportunityCardProps) {
  const colors = useColors();
  const tradeId = tradeReferenceLabel(opportunityValue(item, ['trade_id', 'trade_code', 'code', 'reference']));
  const title = opportunityValue(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade details not provided');
  const status = opportunityValue(item, ['trade_status', 'project_status', 'status', 'state'], 'Not provided');
  const origin = opportunityValue(item, ['origin', 'origin_country', 'from_country']);
  const destination = opportunityValue(item, ['destination', 'destination_country', 'to_country', 'destination_market']);
  const route = origin || destination
    ? `${locationWithFlag(origin) || 'Origin not provided'} → ${locationWithFlag(destination) || 'Destination not provided'}`
    : 'Route details not provided';
  const currency = opportunityValue(item, ['currency']);
  const target = opportunityAmount(item, ['target_amount', 'funding_target', 'total_trade_requirement', 'investment_requirement', 'total_investment_required', 'amount']);
  const minimum = opportunityAmount(item, ['minimum_investment', 'min_investment', 'minimum_amount', 'minimum_investment_amount']);
  const funded = opportunityAmount(item, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
  const targetReturn = opportunityValue(item, ['target_return', 'projected_return', 'expected_return', 'return_rate', 'roi']);
  const risk = opportunityValue(item, ['risk_level', 'risk_rating']);
  const details: [string, string][] = [
    ['Grade', opportunityValue(item, ['grade', 'commodity_grade', 'grade_name', 'commodity_grade_name'], 'Not provided')],
    ['Quantity', opportunityValue(item, ['quantity', 'cargo_quantity', 'quantity_tons', 'quantity_tonnes'], 'Not provided')],
    ['Container count', opportunityValue(item, ['container_count', 'containers_count', 'number_of_containers'], 'Not provided')],
    ['Container type', opportunityValue(item, ['container_type', 'container_size_type'], 'Not provided')],
    ['Destination', locationWithFlag(destination) || 'Not provided'],
    ['Incoterm', opportunityValue(item, ['incoterm', 'trade_term'], 'Not provided')],
  ];
  const cycle = durationLabel(item) || 'Not provided';
  const progressValue = progress == null
    ? opportunityAmount(item, ['funding_progress_percent', 'funding_progress_pct', 'progress_percentage'])
    : progress;
  const boundedProgress = progressValue == null ? null : Math.max(0, Math.min(100, Math.round(progressValue)));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View trade ${tradeId}: ${title}`}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card style={featured ? { borderColor: colors.accent, borderWidth: 1.5 } : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>{tradeId}</Text>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 }}>TRADE STATUS</Text>
            <Status value={status} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
          <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '700' }}>{categoryLabel}</Text>
          </View>
          {featured ? <View style={{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.lightGreen }}>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>Featured</Text>
          </View> : null}
        </View>
        <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 11 }}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Feather name="map-pin" size={12} color={colors.accent} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 1 }}>{route}</Text>
        </View>
        {opportunityValue(item, ['description', 'summary']) ? <Text numberOfLines={2} style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>
          {opportunityValue(item, ['description', 'summary'])}
        </Text> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          {details.map(([label, value]) => <View key={label} style={{ width: '47%', minHeight: 39 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{label}</Text>
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{value}</Text>
          </View>)}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          {[
            ['Investment requirement', moneyLabel(target, currency)],
            ['Minimum investment', moneyLabel(minimum, currency)],
            ['Trade cycle', cycle],
          ].map(([label, value]) => <View key={label} style={{ flex: 1, minWidth: 100 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{label}</Text>
            <Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{value}</Text>
          </View>)}
        </View>

        <View style={{ marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.secondary }}>
          {boundedProgress != null ? <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '600' }}>Funding Progress</Text>
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700', textAlign: 'right' }}>
                {funded != null && target != null ? `${moneyLabel(funded, currency)} / ${moneyLabel(target, currency)}` : `${boundedProgress}% funded`}
              </Text>
            </View>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: boundedProgress }} style={{ height: 7, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: `${boundedProgress}%`, height: 7, borderRadius: 5, backgroundColor: colors.primary }} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 6 }}>{boundedProgress}% funded</Text>
          </> : <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Funding progress not provided by OG Exports.</Text>}
        </View>

        {targetReturn ? <View style={{ marginTop: 11, padding: 11, borderRadius: 12, backgroundColor: colors.lightGreen }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Target / projected return · not guaranteed</Text>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{targetReturn}</Text>
        </View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 }}>
          <Feather name="shield" size={13} color={colors.accent} />
          <Text style={{ color: colors.mutedForeground, fontSize: 11, flex: 1 }}>
            {risk ? `Risk information: ${risk}` : 'Risk information not provided by OG Exports.'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View Trade</Text>
          <Feather name="arrow-up-right" size={16} color={colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}