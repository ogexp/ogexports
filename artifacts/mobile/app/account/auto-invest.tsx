import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { useGetInvestorAutoInvestSettings, useGetInvestorProjects, useUpdateInvestorAutoInvestSettings } from '@workspace/api-client-react';
import { Action, Card, Field, Screen } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

function ChoiceChips({ label, values, value, onChange, disabled = false }: {
  label: string; values: string[]; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const colors = useColors();
  return <View style={{ gap: 8, marginBottom: 14 }}>
    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {values.map(option => {
        const selected = value.toLowerCase() === option.toLowerCase();
        return <Pressable key={option} testID={`auto-invest-option-${label.toLowerCase().replace(/\s+/g, '-')}-${option}`} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => onChange(option)}
          style={{ opacity: disabled ? 0.55 : 1, borderRadius: 18, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.lightGreen : colors.card, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 12, fontWeight: selected ? '700' : '500' }}>{option}</Text>
        </Pressable>;
      })}
        {!values.length ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No listed matches. Search or enter the exact value for a future opportunity.</Text> : null}
    </View>
  </View>;
}

export default function AutoInvest() {
  const { token } = useAuth();
  const colors = useColors();
  const settingsQuery = useGetInvestorAutoInvestSettings({ query: { queryKey: ['investor-auto-invest-settings'], enabled: !!token, retry: 1 } });
  const projectsQuery = useGetInvestorProjects({ type: 'container', per_page: 100 }, { query: { queryKey: ['investor-projects', 'container', 100], enabled: !!token, staleTime: 60_000 } });
  const saveSettings = useUpdateInvestorAutoInvestSettings();
  const settings = record(unwrap(settingsQuery.data));
  const loadError = settingsQuery.isError ? messageOf(settingsQuery.error) : '';
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  const [commodity, setCommodity] = useState('');
  const [containerType, setContainerType] = useState('');
  const [commoditySearch, setCommoditySearch] = useState('');
  const [containerTypeSearch, setContainerTypeSearch] = useState('');
  const [error, setError] = useState('');
  const formLocked = settingsQuery.isLoading || settingsQuery.isError || saveSettings.isPending;

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabled(Boolean(settings.enabled));
    setAmount(settings.amount == null ? '' : String(settings.amount));
    setCommodity(first(settings, ['commodity']));
    setContainerType(first(settings, ['container_type']));
  }, [settingsQuery.data]);

  const containerProjects = useMemo(() => list(projectsQuery.data).filter(project =>
    first(project, ['type']).toLowerCase() === 'container'
  ), [projectsQuery.data]);
  const commodities = useMemo(() => Array.from(new Set(containerProjects.map(project => first(project, ['commodity', 'commodity_name']).trim()).filter(Boolean))).sort(), [containerProjects]);
  const compatibleProjects = useMemo(() => containerProjects.filter(project =>
    !commodity || first(project, ['commodity', 'commodity_name']).trim().toLowerCase() === commodity.trim().toLowerCase()
  ), [containerProjects, commodity]);
  const containerTypes = useMemo(() => Array.from(new Set(compatibleProjects.map(project => first(project, ['container_type']).trim()).filter(Boolean))).sort(), [compatibleProjects]);
  const filteredCommodities = useMemo(() => commodities.filter(option => option.toLowerCase().includes(commoditySearch.trim().toLowerCase())), [commodities, commoditySearch]);
  const filteredContainerTypes = useMemo(() => containerTypes.filter(option => option.toLowerCase().includes(containerTypeSearch.trim().toLowerCase())), [containerTypes, containerTypeSearch]);

  async function save(nextEnabled = enabled) {
    setError('');
    const parsedAmount = Number(amount.replace(/,/g, '').trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!commodity.trim() || !containerType.trim()) {
      setError('Choose a commodity and container type to match.');
      return;
    }
    try {
      await saveSettings.mutateAsync({ data: {
        enabled: nextEnabled,
        amount: parsedAmount,
        commodity: commodity.trim(),
        container_type: containerType.trim(),
      } });
      setEnabled(nextEnabled);
      await settingsQuery.refetch();
    } catch (saveError) {
      setError(messageOf(saveError));
    }
  }

  return <Screen title="Auto-invest" subtitle="Set one clear rule for new container opportunities" refreshable>
    {settingsQuery.isLoading ? <Card testID="auto-invest-loading" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
      <ActivityIndicator color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>Checking your saved rule</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 }}>The form and investment safeguards are shown below while settings load.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => void settingsQuery.refetch()} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Retry</Text>
      </Pressable>
    </Card> : null}
    {settingsQuery.isError ? <Card testID="auto-invest-load-error" style={{ gap: 8 }}>
      <Text style={{ color: colors.destructive, fontSize: 13, fontWeight: '700' }}>Saved settings could not be loaded</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>Your existing rule has not been changed. Retry before editing or saving so it is not accidentally overwritten.</Text>
      {loadError ? <Text accessibilityRole="alert" style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>{loadError}</Text> : null}
      <Action title="Retry loading rule" icon="refresh-cw" secondary onPress={() => void settingsQuery.refetch()} />
    </Card> : null}
      <Card testID="auto-invest-rule-form" style={{ gap: 9 }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Build your investment rule</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>Pick the exact commodity and container format. Suggestions come from container listings; search them or enter a custom value for future listings.</Text>
        <Field label="Amount per opportunity (USD)" value={amount} onChangeText={setAmount} placeholder="e.g. 500" keyboardType="decimal-pad" editable={!formLocked} />
        {projectsQuery.isError ? <Text accessibilityRole="alert" style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>Could not load listing suggestions. You can still enter exact commodity and container names.</Text> : null}
        <Field label="Search commodities" value={commoditySearch} onChangeText={setCommoditySearch} placeholder={commodities.length ? 'Search all listed container commodities' : 'Type an exact commodity name'} maxLength={120} editable={!formLocked} autoCapitalize="words" />
        {commoditySearch.trim() && !commodities.some(option => option.toLowerCase() === commoditySearch.trim().toLowerCase()) ? <Pressable testID="auto-invest-use-custom-commodity" accessibilityRole="button" accessibilityState={{ disabled: formLocked }} disabled={formLocked} onPress={() => { setCommodity(commoditySearch.trim()); setCommoditySearch(''); setContainerType(''); setContainerTypeSearch(''); }}
          style={{ alignSelf: 'flex-start', borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.lightGreen, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}><Text>Use custom:</Text> {commoditySearch.trim()}</Text>
        </Pressable> : null}
        <ChoiceChips label="Commodity suggestions" values={filteredCommodities} value={commodity} onChange={value => { setCommodity(value); setCommoditySearch(''); setContainerType(''); setContainerTypeSearch(''); }} disabled={formLocked} />
        {!commodities.length ? <Field label="Exact commodity name" value={commodity} onChangeText={value => { setCommodity(value); setContainerType(''); }} placeholder="e.g. Rice" maxLength={120} editable={!formLocked} autoCapitalize="words" /> : null}
        <Field label="Container types" value={containerTypeSearch} onChangeText={setContainerTypeSearch} placeholder={commodity ? 'Search formats for this commodity' : 'Choose a commodity first'} maxLength={80} editable={!formLocked} autoCapitalize="characters" />
        {containerTypeSearch.trim() && !containerTypes.some(option => option.toLowerCase() === containerTypeSearch.trim().toLowerCase()) ? <Pressable testID="auto-invest-use-custom-container-type" accessibilityRole="button" accessibilityState={{ disabled: formLocked }} disabled={formLocked} onPress={() => { setContainerType(containerTypeSearch.trim()); setContainerTypeSearch(''); }}
          style={{ alignSelf: 'flex-start', borderRadius: 16, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.lightGreen, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}><Text>Use custom:</Text> {containerTypeSearch.trim()}</Text>
        </Pressable> : null}
        <ChoiceChips label="Compatible container types" values={filteredContainerTypes} value={containerType} onChange={value => { setContainerType(value); setContainerTypeSearch(''); }} disabled={formLocked} />
        {!containerTypes.length ? <Field label="Exact container type" value={containerType} onChangeText={setContainerType} placeholder="e.g. 20FT" maxLength={80} editable={!formLocked} autoCapitalize="characters" /> : null}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 4 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>RULE PREVIEW</Text>
          <Text testID="auto-invest-rule-preview" style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>
            {amount.trim() ? `$${amount.trim()} USD` : 'Amount not set'} per new {containerType || 'container type'} of {commodity || 'commodity not selected'}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Suggestions include up to 100 currently listed container opportunities. Exact custom matches can target future listings too.</Text>
        </View>
      </Card>
      <Card style={{ gap: 7 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>Automatic investment safeguards</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>When a new matching container enters funding, the server attempts one wallet investment for your saved amount. The investment is active and the wallet is debited immediately if successful.</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>The investment is skipped if KYC is not approved, your wallet is not USD-denominated or lacks funds, or the amount does not meet project minimums or available capacity. Existing opportunities are never auto-invested.</Text>
      </Card>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18 }}>{error}</Text> : null}
      <Pressable testID="auto-invest-enabled-switch" accessibilityRole="switch" accessibilityLabel="Auto-invest enabled" accessibilityState={{ checked: enabled, disabled: formLocked || settingsQuery.isError }} disabled={formLocked || settingsQuery.isError} onPress={() => setEnabled(current => !current)}
        style={{ minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: enabled ? colors.primary : colors.border, backgroundColor: enabled ? colors.lightGreen : colors.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{enabled ? 'Auto-invest is on' : 'Auto-invest is off'}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Save the rule below to apply this change.</Text>
        </View>
        <Text style={{ color: enabled ? colors.primary : colors.mutedForeground, fontWeight: '700' }}>{enabled ? 'ON' : 'OFF'}</Text>
      </Pressable>
      <Action testID="auto-invest-save-rule" title="Save rule" icon="save" loading={saveSettings.isPending} disabled={settingsQuery.isLoading || settingsQuery.isError} onPress={() => void save(enabled)} />
      {list(settings.recent_activity).length ? <Card style={{ gap: 6 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Recent auto-invest activity</Text>
        {list(settings.recent_activity).map((entry, index) => {
          const item = record(entry);
          const status = first(item, ['status']);
          const invested = status === 'invested';
          return <View key={`${first(item, ['project_id'])}-${index}`} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border, paddingTop: index === 0 ? 0 : 10, paddingBottom: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600' }}>{first(item, ['project_title'], 'Container opportunity')}</Text>
            <Text style={{ color: invested ? colors.primary : colors.mutedForeground, fontSize: 12, marginTop: 3 }}>{status === 'processing' ? 'Processing' : invested ? 'Invested' : 'Skipped'} · {first(item, ['amount'])} USD</Text>
            {first(item, ['message']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 2 }}>{first(item, ['message'])}</Text> : null}
            {invested && first(item, ['investment_id']) ? <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/position/[id]', params: { id: first(item, ['investment_id']) } })} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View investment</Text>
            </Pressable> : null}
          </View>;
        })}
      </Card> : null}
  </Screen>;
}
