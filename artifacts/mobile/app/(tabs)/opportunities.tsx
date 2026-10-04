import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetInvestorProjects } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { amount, first, list, money } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const categories = [
  { value: 'All', label: 'All' },
  { value: 'Rice', label: 'Rice' },
  { value: 'Maize', label: 'Maize' },
  { value: 'Sesame', label: 'Sesame' },
  { value: 'Potatoes', label: 'Potatoes' },
  { value: 'Other', label: 'Other Commodities' },
] as const;
type CommodityCategory = typeof categories[number]['value'];
const opportunityTabs = ['Featured', 'New', 'Nearly Funded', 'Closing Soon'] as const;
type OpportunityTab = typeof opportunityTabs[number];
type MarketplaceFilters = {
  maxMinimum: string;
  maxDurationDays: string;
  destination: string;
  risk: string;
  funding: string;
  status: string;
};
const emptyFilters: MarketplaceFilters = {
  maxMinimum: '',
  maxDurationDays: '',
  destination: '',
  risk: 'Any',
  funding: 'Any',
  status: '',
};

function categoryFor(item: Record<string, unknown>) {
  const text = [
    first(item, ['commodity', 'commodity_name']),
    first(item, ['title', 'name', 'project_name']),
    first(item, ['type', 'category']),
  ].join(' ').toLowerCase();
  if (/\brice|basmati\b/.test(text)) return 'Rice';
  if (/\bmaize|corn\b/.test(text)) return 'Maize';
  if (/\bsesame\b/.test(text)) return 'Sesame';
  if (/\bpotato|potatoes\b/.test(text)) return 'Potatoes';
  return text.trim() ? 'Other' : 'Unknown';
}

function fundingProgress(item: Record<string, unknown>) {
  const target = amount(item, ['target_amount', 'funding_target', 'total_trade_requirement', 'amount']);
  const funded = amount(item, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
  return target != null && target > 0 && funded != null
    ? Math.max(0, Math.min(100, Math.round(funded / target * 100)))
    : null;
}

function durationInDays(item: Record<string, unknown>) {
  const explicitDays = amount(item, ['duration_days', 'trade_duration_days', 'cycle_days']);
  if (explicitDays != null) return explicitDays;
  const raw = first(item, ['trade_cycle', 'estimated_trade_cycle', 'duration', 'term', 'investment_duration']).toLowerCase();
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(days?|d|weeks?|wks?|months?|mos?|years?|yrs?)\b/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (/^d/.test(unit)) return value;
  if (/^w/.test(unit)) return value * 7;
  if (/^m/.test(unit)) return value * 30;
  return value * 365;
}

function durationLabel(item: Record<string, unknown>) {
  const days = amount(item, ['duration_days', 'trade_duration_days', 'cycle_days']);
  if (days != null) return `${days} days`;
  return first(item, ['trade_cycle', 'estimated_trade_cycle', 'duration', 'term', 'investment_duration']);
}

function dateValue(item: Record<string, unknown>, keys: string[]) {
  const value = first(item, keys, '');
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function isFeatured(item: Record<string, unknown>) {
  return ['true', '1', 'yes'].includes(first(item, ['is_featured', 'featured'], '').toLowerCase());
}

export default function Opportunities() {
  const { token } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<CommodityCategory>('All');
  const [tab, setTab] = useState<OpportunityTab>('Featured');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<MarketplaceFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<MarketplaceFilters>(emptyFilters);
  const query = useGetInvestorProjects({ per_page: 50 }, { query: { queryKey: ['investor-projects', 50], enabled: !!token, staleTime: 60_000 } });
  const sourceRows = list(query.data);
  const serverStatuses = Array.from(new Set(sourceRows.map(item => first(item, ['status', 'state']).trim()).filter(Boolean)));
  const serverRiskLevels = Array.from(new Set(sourceRows.map(item => first(item, ['risk_level', 'risk_rating']).trim()).filter(Boolean)));
  const statusOptions = ['Any', ...serverStatuses.sort((a, b) => a.localeCompare(b))];
  const riskOptions = ['Any', ...Array.from(new Set(['Low', 'Medium', 'High', ...serverRiskLevels])).sort((a, b) => {
    if (a === 'Any') return -1;
    if (b === 'Any') return 1;
    return a.localeCompare(b);
  })];
  const matchingRows = sourceRows.filter(item => {
    const normalizedSearch = search.trim().toLowerCase();
    const searchable = [
      first(item, ['trade_id', 'trade_code', 'code', 'reference']),
      first(item, ['commodity', 'commodity_name']),
      first(item, ['title', 'name', 'project_name']),
      first(item, ['origin', 'origin_country', 'from_country']),
      first(item, ['destination', 'destination_country', 'to_country', 'destination_market']),
      first(item, ['description', 'summary']),
      first(item, ['risk_level', 'risk_rating']),
      first(item, ['status', 'state']),
      first(item, ['incoterm', 'trade_term']),
    ].join(' ').toLowerCase();
    if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
    if (category !== 'All' && categoryFor(item) !== category) return false;

    const minimum = amount(item, ['minimum_investment', 'min_investment', 'minimum_amount']);
    const maxMinimum = Number(appliedFilters.maxMinimum);
    if (Number.isFinite(maxMinimum) && maxMinimum > 0 && (minimum == null || minimum > maxMinimum)) return false;
    const tradeDurationDays = durationInDays(item);
    const maxDuration = Number(appliedFilters.maxDurationDays);
    if (Number.isFinite(maxDuration) && maxDuration > 0 && (tradeDurationDays == null || tradeDurationDays > maxDuration)) return false;
    if (appliedFilters.destination && !first(item, ['destination', 'destination_country', 'to_country', 'destination_market']).toLowerCase().includes(appliedFilters.destination.trim().toLowerCase())) return false;
    if (appliedFilters.risk !== 'Any' && !first(item, ['risk_level', 'risk_rating']).toLowerCase().includes(appliedFilters.risk.toLowerCase())) return false;
    if (appliedFilters.status && !first(item, ['status', 'state']).toLowerCase().includes(appliedFilters.status.trim().toLowerCase())) return false;

    const progress = fundingProgress(item);
    if (appliedFilters.funding === 'Under 50%' && (progress == null || progress >= 50)) return false;
    if (appliedFilters.funding === '50–79%' && (progress == null || progress < 50 || progress >= 80)) return false;
    if (appliedFilters.funding === '80–99%' && (progress == null || progress < 80 || progress >= 100)) return false;
    if (appliedFilters.funding === 'Fully funded' && (progress == null || progress < 100)) return false;

    if (tab === 'Featured' && !isFeatured(item)) return false;
    if (tab === 'Nearly Funded' && (progress == null || progress < 80 || progress >= 100)) return false;
    if (tab === 'Closing Soon') {
      const deadline = dateValue(item, ['funding_deadline', 'closing_date', 'closes_at', 'deadline']);
      if (deadline == null || deadline < Date.now() || deadline - Date.now() > 7 * 86_400_000) return false;
    }
    return true;
  });
  const rows = tab === 'New'
    ? [...matchingRows].sort((left, right) => (dateValue(right, ['created_at', 'published_at', 'date']) ?? 0) - (dateValue(left, ['created_at', 'published_at', 'date']) ?? 0))
    : matchingRows;
  const activeFilterCount = [
    appliedFilters.maxMinimum,
    appliedFilters.maxDurationDays,
    appliedFilters.destination,
    appliedFilters.status,
    appliedFilters.risk !== 'Any' ? appliedFilters.risk : '',
    appliedFilters.funding !== 'Any' ? appliedFilters.funding : '',
  ].filter(Boolean).length;
  const activeCriteriaCount = activeFilterCount + (category !== 'All' ? 1 : 0) + (search.trim() ? 1 : 0);
  const resetCriteria = () => {
    setCategory('All');
    setSearch('');
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };
  const moneyLabel = (value: number | null, currency: string) => value == null ? 'Not provided' : currency ? money(value, currency) : 'Currency not provided';

  return <Screen title="Explore Trade Opportunities" subtitle="Import and export opportunities reported by OG Exports">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}><Field label="Search" value={search} onChangeText={setSearch} placeholder="Trade ID, commodity or destination" /></View>
      <Pressable testID="marketplace-open-filters" accessibilityRole="button" accessibilityLabel="Open opportunity filters" onPress={() => setFiltersOpen(true)}
        style={{ minHeight: 46, marginTop: 5, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Feather name="sliders" size={15} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Filter{activeFilterCount ? ` · ${activeFilterCount}` : ''}</Text>
      </Pressable>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 13 }}>
      {categories.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)} style={{ borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: category === item ? colors.primary : colors.secondary }}>
        <Text style={{ color: category === item ? colors.primaryForeground : colors.foreground, fontWeight: '600', fontSize: 12 }}>{item === 'Other' ? 'Other Commodities' : item}</Text>
      </Pressable>)}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 14 }}>
      {opportunityTabs.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={{ borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13, backgroundColor: tab === item ? colors.lightGreen : 'transparent', borderWidth: 1, borderColor: tab === item ? colors.primary : colors.border }}>
        <Text style={{ color: tab === item ? colors.primary : colors.mutedForeground, fontWeight: '700', fontSize: 11 }}>{item}</Text>
      </Pressable>)}
    </ScrollView>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading trade opportunities…</Text></Card> : null}
    {query.isError ? <ErrorState message="Trade opportunities could not be loaded from OG Exports." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && rows.length === 0 ? <EmptyState title="No matching trade opportunities" body="Try another category or filter. This view only shows opportunities with matching information supplied by OG Exports." /> : null}
    {rows.map((item, index) => {
      const id = first(item, ['id', 'project_id'], '');
      const title = first(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade details not provided');
      const tradeId = first(item, ['trade_id', 'trade_code', 'code', 'reference'], 'Trade ID not provided');
      const origin = first(item, ['origin', 'origin_country', 'from_country']);
      const destination = first(item, ['destination', 'destination_country', 'to_country', 'destination_market']);
      const route = origin && destination ? `${origin} → ${destination}` : 'Route details not provided';
      const currency = first(item, ['currency']);
      const target = amount(item, ['target_amount', 'funding_target', 'total_trade_requirement', 'amount']);
      const minimum = amount(item, ['minimum_investment', 'min_investment', 'minimum_amount']);
      const funded = amount(item, ['funded_amount', 'raised_amount', 'current_amount', 'current_funding']);
      const progress = fundingProgress(item);
      const targetReturn = first(item, ['target_return', 'projected_return', 'expected_return', 'return_rate', 'roi'], '');
      const duration = first(item, ['trade_cycle', 'estimated_trade_cycle', 'duration', 'term', 'investment_duration'], '');
      const cardDetails = [
        ['Grade', first(item, ['grade', 'commodity_grade'], '')],
        ['Quantity', first(item, ['quantity', 'cargo_quantity', 'quantity_tons'], '')],
        ['Containers', first(item, ['container_count', 'containers_count'], '')],
        ['Container type', first(item, ['container_type'], '')],
        ['Incoterm', first(item, ['incoterm', 'trade_term'], '')],
        ['Destination', destination],
      ].filter(([, value]) => value);
      return <Pressable key={id || index} onPress={() => id && router.push({ pathname: '/project/[id]', params: { id } })} disabled={!id}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 }}>{tradeId}</Text><Status value={first(item, ['status', 'state'], 'Not provided')} /></View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 10 }}>{title}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>{route}</Text>
          {first(item, ['description', 'summary']) ? <Text numberOfLines={2} style={{ color: colors.mutedForeground, lineHeight: 20, marginTop: 6 }}>{first(item, ['description', 'summary'])}</Text> : null}
          {cardDetails.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            {cardDetails.map(([label, value]) => <View key={label} style={{ width: '46%' }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{label}</Text><Text numberOfLines={2} style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{value}</Text></View>)}
          </View> : null}
          {target != null || minimum != null || duration ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            {target != null ? <View style={{ flex: 1, minWidth: 130 }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Total trade requirement</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{moneyLabel(target, currency)}</Text></View> : null}
            {minimum != null ? <View style={{ flex: 1, minWidth: 130 }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Minimum investment</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{moneyLabel(minimum, currency)}</Text></View> : null}
            {duration ? <View style={{ flex: 1, minWidth: 130 }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Trade cycle</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 4 }}>{duration}</Text></View> : null}
          </View> : null}
          {target != null && funded != null && progress != null ? <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Funding progress</Text><Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '700' }}>{moneyLabel(funded, currency)} / {moneyLabel(target, currency)}</Text></View>
            <View style={{ height: 6, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}><View style={{ width: `${progress}%`, height: 6, backgroundColor: colors.primary }} /></View>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 5 }}>{progress}% funded</Text>
          </View> : <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 12 }}>Funding progress has not been provided.</Text>}
          {targetReturn ? <View style={{ marginTop: 13, padding: 11, borderRadius: 12, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Projected / target return · not guaranteed</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{targetReturn}</Text>
          </View> : null}
          {first(item, ['risk_level', 'risk_rating']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 11 }}>Risk information: {first(item, ['risk_level', 'risk_rating'])}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View Trade</Text>
            <Feather name="arrow-up-right" size={16} color={colors.primary} />
          </View>
        </Card>
      </Pressable>;
    })}

    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,16,0.38)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ maxHeight: '88%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.foreground, fontSize: 19, fontWeight: '700' }}>Filter opportunities</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Field label="Minimum investment up to" value={draftFilters.maxMinimum} onChangeText={value => setDraftFilters(current => ({ ...current, maxMinimum: value }))} placeholder="Amount in opportunity currency" keyboardType="decimal-pad" />
            <Field label="Maximum trade duration (days)" value={draftFilters.maxDurationDays} onChangeText={value => setDraftFilters(current => ({ ...current, maxDurationDays: value }))} placeholder="e.g. 120" keyboardType="numeric" />
            <Field label="Destination" value={draftFilters.destination} onChangeText={value => setDraftFilters(current => ({ ...current, destination: value }))} placeholder="Country or market" />
            <Field label="Trade status" value={draftFilters.status} onChangeText={value => setDraftFilters(current => ({ ...current, status: value }))} placeholder="Match status text" />
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 8 }}>Risk level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
              {['Any', 'Low', 'Medium', 'High'].map(item => <Pressable key={item} onPress={() => setDraftFilters(current => ({ ...current, risk: item }))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: draftFilters.risk === item ? colors.primary : colors.secondary }}>
                <Text style={{ color: draftFilters.risk === item ? colors.primaryForeground : colors.foreground, fontSize: 11, fontWeight: '600' }}>{item}</Text>
              </Pressable>)}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>Funding progress</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
              {['Any', 'Under 50%', '50–79%', '80–99%', 'Fully funded'].map(item => <Pressable key={item} onPress={() => setDraftFilters(current => ({ ...current, funding: item }))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: draftFilters.funding === item ? colors.primary : colors.secondary }}>
                <Text style={{ color: draftFilters.funding === item ? colors.primaryForeground : colors.foreground, fontSize: 11, fontWeight: '600' }}>{item}</Text>
              </Pressable>)}
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable accessibilityRole="button" onPress={() => { setDraftFilters(emptyFilters); setAppliedFilters(emptyFilters); setFiltersOpen(false); }} style={{ flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Clear all</Text>
            </Pressable>
            <Pressable testID="marketplace-apply-filters" accessibilityRole="button" onPress={() => { setAppliedFilters(draftFilters); setFiltersOpen(false); }} style={{ flex: 1.4, minHeight: 46, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.primaryForeground, fontSize: 12, fontWeight: '700' }}>Apply filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </Screen>;
}