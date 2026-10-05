import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetInvestorProjects } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Field, LoadingCard, Screen } from '@/components/InvestorUI';
import { OpportunityCard } from '@/components/OpportunityCard';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { amount, first, list } from '@/lib/data';
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
const opportunityTabs = ['New', 'Nearly Funded', 'Closing Soon'] as const;
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
  const suppliedProgress = amount(item, ['funding_percentage', 'funding_progress_percent', 'funding_progress_pct', 'progress_percentage']);
  return suppliedProgress == null ? null : Math.max(0, Math.min(100, Math.round(suppliedProgress)));
}

function durationInDays(item: Record<string, unknown>) {
  const explicitDays = amount(item, ['investment_period_days', 'duration_days', 'trade_duration_days', 'cycle_days']);
  if (explicitDays != null) return explicitDays;
  const raw = first(item, ['trade_cycle', 'estimated_trade_cycle', 'duration', 'term', 'investment_duration']).toLowerCase();
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(days?|d|weeks?|wks?|months?|mos?|years?|yrs?)\b/);
  if (!match) {
    const unitlessValue = Number(raw);
    return raw.trim() && Number.isFinite(unitlessValue) ? unitlessValue : null;
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (/^d/.test(unit)) return value;
  if (/^w/.test(unit)) return value * 7;
  if (/^m/.test(unit)) return value * 30;
  return value * 365;
}

function numericLimit(value: string) {
  const normalized = value.replace(/[,\s]/g, '');
  if (!normalized) return null;
  return Number(normalized);
}

function dateValue(item: Record<string, unknown>, keys: string[]) {
  const value = first(item, keys, '');
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function isFeatured(item: Record<string, unknown>) {
  return ['true', '1', 'yes'].includes(first(item, ['is_featured', 'featured'], '').toLowerCase());
}

function tradeStatus(item: Record<string, unknown>) {
  return first(item, ['trade_status', 'project_status', 'status', 'state']);
}

function riskLevel(item: Record<string, unknown>) {
  return first(item, ['risk_level', 'risk_rating']);
}

export default function Opportunities() {
  const { token } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<CommodityCategory>('All');
  const [tab, setTab] = useState<OpportunityTab>('New');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<MarketplaceFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<MarketplaceFilters>(emptyFilters);
  const query = useGetInvestorProjects({ per_page: 50 }, { query: { queryKey: ['investor-projects', 50], enabled: !!token, staleTime: 60_000 } });
  const sourceRows = list(query.data);
  const serverStatuses = Array.from(new Set(sourceRows.map(item => tradeStatus(item).trim()).filter(Boolean)));
  const serverRiskLevels = Array.from(new Set(sourceRows.map(item => riskLevel(item).trim()).filter(Boolean)));
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
      riskLevel(item),
      tradeStatus(item),
      first(item, ['incoterm', 'trade_term']),
    ].join(' ').toLowerCase();
    if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
    if (category !== 'All' && categoryFor(item) !== category) return false;

    const minimum = amount(item, ['minimum_investment', 'min_investment', 'minimum_amount']);
    const maxMinimum = numericLimit(appliedFilters.maxMinimum);
    if (maxMinimum != null && (!Number.isFinite(maxMinimum) || maxMinimum < 0 || minimum == null || minimum > maxMinimum)) return false;
    const tradeDurationDays = durationInDays(item);
    const maxDuration = numericLimit(appliedFilters.maxDurationDays);
    if (maxDuration != null && (!Number.isFinite(maxDuration) || maxDuration < 0 || tradeDurationDays == null || tradeDurationDays > maxDuration)) return false;
    if (appliedFilters.destination && !first(item, ['destination', 'destination_country', 'to_country', 'destination_market']).toLowerCase().includes(appliedFilters.destination.trim().toLowerCase())) return false;
    if (appliedFilters.risk !== 'Any' && !riskLevel(item).toLowerCase().includes(appliedFilters.risk.toLowerCase())) return false;
    if (appliedFilters.status && tradeStatus(item).trim().toLowerCase() !== appliedFilters.status.trim().toLowerCase()) return false;

    const progress = fundingProgress(item);
    if (appliedFilters.funding === 'Under 50%' && (progress == null || progress >= 50)) return false;
    if (appliedFilters.funding === '50–79%' && (progress == null || progress < 50 || progress >= 80)) return false;
    if (appliedFilters.funding === '80–99%' && (progress == null || progress < 80 || progress >= 100)) return false;
    if (appliedFilters.funding === 'Fully funded' && (progress == null || progress < 100)) return false;

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
  return <Screen title="Explore Trade Opportunities" subtitle="Import and export opportunities reported by OG Exports" refreshable>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}><Field label="Search" value={search} onChangeText={setSearch} placeholder="Trade ID, commodity or destination" /></View>
      <Pressable testID="marketplace-open-filters" accessibilityRole="button" accessibilityLabel="Open opportunity filters" onPress={() => setFiltersOpen(true)}
        style={{ minHeight: 46, marginTop: 5, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Feather name="sliders" size={15} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Filter{activeCriteriaCount ? ` · ${activeCriteriaCount}` : ''}</Text>
      </Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 10, marginBottom: 15 }}>
      {categories.map(item => <Pressable key={item.value} testID={`marketplace-category-${item.value.toLowerCase()}`} accessibilityRole="button" accessibilityState={{ selected: category === item.value }} onPress={() => setCategory(item.value)} style={{ borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: category === item.value ? colors.primary : colors.secondary }}>
        <Text style={{ color: category === item.value ? colors.primaryForeground : colors.foreground, fontWeight: '600', fontSize: 12 }}>{item.label}</Text>
      </Pressable>)}
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginBottom: 11 }}>
      {opportunityTabs.map(item => <Pressable key={item} testID={`marketplace-tab-${item.toLowerCase().replace(/\s+/g, '-')}`} accessibilityRole="button" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={{ borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: tab === item ? colors.lightGreen : 'transparent', borderWidth: 1, borderColor: tab === item ? colors.primary : colors.border }}>
        <Text style={{ color: tab === item ? colors.primary : colors.mutedForeground, fontWeight: '700', fontSize: 11 }}>{item}</Text>
      </Pressable>)}
    </ScrollView>
    {!query.isLoading && !query.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '600' }}>{rows.length} {rows.length === 1 ? 'trade opportunity' : 'trade opportunities'}</Text>
      {activeCriteriaCount > 0 ? <Pressable accessibilityRole="button" onPress={resetCriteria} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingLeft: 8 }}>
        <Feather name="x-circle" size={13} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Clear selection</Text>
      </Pressable> : null}
    </View> : null}
    {query.isLoading ? <LoadingCard label="Loading trade opportunities…" /> : null}
    {query.isError ? <ErrorState message="Trade opportunities could not be loaded from OG Exports." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && rows.length === 0 ? <EmptyState title="No matching trade opportunities" body="Try another category, tab, or filter. This view only shows opportunities and details supplied by OG Exports." /> : null}
    {rows.map((item, index) => {
      const id = first(item, ['id', 'project_id'], '');
      const commodityCategory = categoryFor(item);
      const categoryLabel = commodityCategory === 'Other' ? 'Other Commodities' : commodityCategory === 'Unknown' ? '—' : commodityCategory;
      return <OpportunityCard
        key={id || index}
        item={item}
        categoryLabel={categoryLabel}
        featured={isFeatured(item)}
        progress={fundingProgress(item)}
        onPress={id ? () => router.push({ pathname: '/project/[id]', params: { id } }) : undefined}
      />;
    })}

    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,16,0.38)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ maxHeight: '90%', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 18), backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.foreground, fontSize: 19, fontWeight: '700' }}>Filter opportunities</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable>
          </View>
          <KeyboardAwareScrollViewCompat style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }} bottomOffset={26} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Field label="Minimum investment cap" value={draftFilters.maxMinimum} onChangeText={value => setDraftFilters(current => ({ ...current, maxMinimum: value.replace(/[^\d.,]/g, '') }))} placeholder="e.g. 5000" keyboardType="decimal-pad" />
            <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: -8, marginBottom: 13 }}>Shows trades at or below this entry amount. Values use each trade’s listed currency; no conversion is applied.</Text>
            <Field label="Maximum trade duration (days)" value={draftFilters.maxDurationDays} onChangeText={value => setDraftFilters(current => ({ ...current, maxDurationDays: value.replace(/[^\d.,]/g, '') }))} placeholder="e.g. 120" keyboardType="numeric" />
            <Field label="Destination" value={draftFilters.destination} onChangeText={value => setDraftFilters(current => ({ ...current, destination: value }))} placeholder="Country or market" />
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginTop: 4, marginBottom: 8 }}>Risk level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
              {riskOptions.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: draftFilters.risk === item }} onPress={() => setDraftFilters(current => ({ ...current, risk: item }))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: draftFilters.risk === item ? colors.primary : colors.secondary }}>
                <Text style={{ color: draftFilters.risk === item ? colors.primaryForeground : colors.foreground, fontSize: 11, fontWeight: '600' }}>{item}</Text>
              </Pressable>)}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>Trade status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
              {statusOptions.map(item => {
                const selected = item === 'Any' ? !draftFilters.status : draftFilters.status === item;
                return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setDraftFilters(current => ({ ...current, status: item === 'Any' ? '' : item }))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: selected ? colors.primary : colors.secondary }}>
                  <Text style={{ color: selected ? colors.primaryForeground : colors.foreground, fontSize: 11, fontWeight: '600' }}>{item === 'Any' ? 'Any status' : item}</Text>
                </Pressable>;
              })}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>Funding progress</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
              {['Any', 'Under 50%', '50–79%', '80–99%', 'Fully funded'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: draftFilters.funding === item }} onPress={() => setDraftFilters(current => ({ ...current, funding: item }))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: draftFilters.funding === item ? colors.primary : colors.secondary }}>
                <Text style={{ color: draftFilters.funding === item ? colors.primaryForeground : colors.foreground, fontSize: 11, fontWeight: '600' }}>{item}</Text>
              </Pressable>)}
            </View>
          </KeyboardAwareScrollViewCompat>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable accessibilityRole="button" onPress={() => { resetCriteria(); setFiltersOpen(false); }} style={{ flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
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
