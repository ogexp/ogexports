import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { useGetInvestorAutoInvestSettings, useGetInvestorProjects, useUpdateInvestorAutoInvestSettings } from '@workspace/api-client-react';
import { Action, Card, Field, Screen } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

function ChoiceChips({ label, values, value, onChange }: {
  label: string; values: string[]; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const colors = useColors();
  return <View style={{ gap: 8, marginBottom: 14 }}>
    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {values.map(option => {
        const selected = value.toLowerCase() === option.toLowerCase();
        return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option)}
          style={{ borderRadius: 18, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.lightGreen : colors.card, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 12, fontWeight: selected ? '700' : '500' }}>{option}</Text>
        </Pressable>;
      })}
      {!values.length ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No container opportunities are listed yet. Enter the exact commodity and container type below.</Text> : null}
    </View>
  </View>;
}

export default function AutoInvest() {
  const { token } = useAuth();
  const colors = useColors();
  const settingsQuery = useGetInvestorAutoInvestSettings({ query: { queryKey: ['investor-auto-invest-settings'], enabled: !!token, retry: 1 } });
  const projectsQuery = useGetInvestorProjects({ per_page: 100 }, { query: { queryKey: ['investor-projects', 100], enabled: !!token, staleTime: 60_000 } });
  const saveSettings = useUpdateInvestorAutoInvestSettings();
  const settings = record(unwrap(settingsQuery.data));
  const loadError = settingsQuery.isError ? messageOf(settingsQuery.error) : '';
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  const [commodity, setCommodity] = useState('');
  const [containerType, setContainerType] = useState('');
  const [error, setError] = useState('');

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
  const containerTypes = useMemo(() => Array.from(new Set(containerProjects.map(project => first(project, ['container_type']).trim()).filter(Boolean))).sort(), [containerProjects]);

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
      <Card style={{ gap: 9 }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Your investment rule</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>Choose the amount to invest in each matching container, plus the exact commodity and container type. Settings only apply to opportunities published after you enable the rule.</Text>
        <Field label="Amount per opportunity (USD)" value={amount} onChangeText={setAmount} placeholder="e.g. 500" keyboardType="decimal-pad" editable={!settingsQuery.isLoading && !settingsQuery.isError} />
        <ChoiceChips label="Commodity" values={commodities} value={commodity} onChange={setCommodity} disabled={settingsQuery.isLoading || settingsQuery.isError} />
        {!commodities.length ? <Field label="Exact commodity name" value={commodity} onChangeText={setCommodity} placeholder="Match the commodity shown in Opportunities" maxLength={120} editable={!settingsQuery.isLoading && !settingsQuery.isError} /> : null}
        <ChoiceChips label="Container type" values={containerTypes} value={containerType} onChange={setContainerType} disabled={settingsQuery.isLoading || settingsQuery.isError} />
        {!containerTypes.length ? <Field label="Exact container type" value={containerType} onChangeText={setContainerType} placeholder="e.g. 20FT" maxLength={80} editable={!settingsQuery.isLoading && !settingsQuery.isError} /> : null}
      </Card>
      <Card style={{ gap: 7 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>Automatic investment safeguards</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>When a new matching container enters funding, the server attempts one wallet investment for your saved amount. The investment is active and the wallet is debited immediately if successful.</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>The investment is skipped if KYC is not approved, your wallet is not USD-denominated or lacks funds, or the amount does not meet project minimums or available capacity. Existing opportunities are never auto-invested.</Text>
      </Card>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18 }}>{error}</Text> : null}
      <Pressable accessibilityRole="switch" accessibilityLabel="Auto-invest enabled" accessibilityState={{ checked: enabled, disabled: settingsQuery.isLoading || settingsQuery.isError }} disabled={settingsQuery.isLoading || settingsQuery.isError} onPress={() => setEnabled(current => !current)}
        style={{ minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: enabled ? colors.primary : colors.border, backgroundColor: enabled ? colors.lightGreen : colors.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{enabled ? 'Auto-invest is on' : 'Auto-invest is off'}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Save the rule below to apply this change.</Text>
        </View>
        <Text style={{ color: enabled ? colors.primary : colors.mutedForeground, fontWeight: '700' }}>{enabled ? 'ON' : 'OFF'}</Text>
      </Pressable>
      <Action title="Save rule" icon="save" loading={saveSettings.isPending} disabled={settingsQuery.isLoading || settingsQuery.isError} onPress={() => void save(enabled)} />
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
