import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorAutoInvestCommodities, useGetInvestorAutoInvestSettings, useUpdateInvestorAutoInvestSettings } from '@workspace/api-client-react';
import { Action, Card, Field, Screen } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

export default function AutoInvest() {
  const { token } = useAuth();
  const colors = useColors();
  const settingsQuery = useGetInvestorAutoInvestSettings({ query: { queryKey: ['investor-auto-invest-settings'], enabled: !!token, retry: 1 } });
  const commoditiesQuery = useGetInvestorAutoInvestCommodities({ query: { queryKey: ['investor-auto-invest-commodities'], enabled: !!token, staleTime: 60_000 } });
  const saveSettings = useUpdateInvestorAutoInvestSettings();
  const settings = record(unwrap(settingsQuery.data));
  const savedCommodity = first(settings, ['commodity']);
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  const [commodity, setCommodity] = useState('');
  const [error, setError] = useState('');
  const formLocked = settingsQuery.isLoading || commoditiesQuery.isLoading || commoditiesQuery.isError || saveSettings.isPending;

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabled(Boolean(settings.enabled));
    setAmount(settings.amount == null ? '' : String(settings.amount));
    setCommodity(first(settings, ['commodity']));
  }, [settingsQuery.data]);

  const commodities = useMemo(() => Array.from(new Set(list(commoditiesQuery.data)
    .map(item => first(item, ['name']).trim()).filter(Boolean))), [commoditiesQuery.data]);

  const parsedAmount = Number(amount.replace(/,/g, '').trim());
  const hasValidRule = Number.isFinite(parsedAmount) && parsedAmount > 0
    && !!commodity.trim()
    && !commoditiesQuery.isLoading
    && !commoditiesQuery.isError
    && commodities.some(name => name.toLowerCase() === commodity.trim().toLowerCase());

  async function save(nextCommodity = commodity, nextEnabled = true, nextAmount = amount) {
    setError('');
    const amountToSave = Number(nextAmount.replace(/,/g, '').trim());
    if (!Number.isFinite(amountToSave) || amountToSave <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!nextCommodity.trim()) {
      setError('Choose an Auto-invest product.');
      return;
    }
    try {
      await saveSettings.mutateAsync({ data: {
        enabled: nextEnabled,
        amount: amountToSave,
        commodity: nextCommodity.trim(),
      } });
      setEnabled(nextEnabled);
      setCommodity(nextCommodity.trim());
      await settingsQuery.refetch();
    } catch (saveError) {
      setError(messageOf(saveError));
    }
  }

  function enableAutoInvest() {
    if (!hasValidRule) {
      setError('Enter a valid amount and select an Auto-invest product first.');
      return;
    }
    void save(commodity, true, amount);
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
      {settingsQuery.isError ? <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2 }}>
        <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>Your saved rule could not be verified. Retry before enabling changes.</Text>
        <Pressable accessibilityRole="button" onPress={() => void settingsQuery.refetch()} style={{ paddingVertical: 8, paddingHorizontal: 6 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </View> : null}
      <Card testID="auto-invest-rule-form" style={{ gap: 9 }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Enter an amount, choose a product, then enable Auto-invest</Text>
        <Field label="Amount per opportunity (USD)" value={amount} onChangeText={setAmount} placeholder="e.g. 500" keyboardType="decimal-pad" editable={!settingsQuery.isLoading && !saveSettings.isPending} />
        <View style={{ gap: 3, marginTop: 2, marginBottom: 2 }}>
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>Auto-invest products</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>Choose one product. It will apply to future opportunities of any container size.</Text>
        </View>
        {commoditiesQuery.isLoading ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading products…</Text>
        </View> : null}
        {commoditiesQuery.isError ? <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12 }}>Auto-invest products could not be loaded.</Text>
          <Action title="Retry products" icon="refresh-cw" secondary onPress={() => void commoditiesQuery.refetch()} />
        </View> : null}
        {!commoditiesQuery.isLoading && !commoditiesQuery.isError && !commodities.length ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>No Auto-invest products are available. Ask an admin to add one to the mobile list.</Text> : null}
        {commodities.map((name, index) => {
          const selected = commodity.toLowerCase() === name.toLowerCase();
          return <Pressable key={`${name}-${index}`} testID={`auto-invest-product-${index}`} accessibilityRole="button" accessibilityLabel={`Select ${name}`} accessibilityState={{ selected, disabled: formLocked }}
            disabled={formLocked} onPress={() => { setCommodity(name); setError(''); }}
            style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.lightGreen : colors.card, opacity: formLocked ? 0.55 : 1 }}>
            <Text style={{ flex: 1, color: colors.foreground, fontSize: 14, fontWeight: selected ? '700' : '600' }}>{name}</Text>
            {selected ? <Feather name="check-circle" size={19} color={colors.primary} /> : <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border }} />}
          </Pressable>;
        })}
        <Action
          title={enabled ? 'Update Auto-invest' : 'Enable auto-invest'}
          icon="zap"
          disabled={formLocked || settingsQuery.isError || !settingsQuery.data || !hasValidRule}
          loading={saveSettings.isPending}
          testID="auto-invest-enable-button"
          onPress={enableAutoInvest}
        />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, textAlign: 'center' }}>
           Auto-invest only applies to opportunities published after it is enabled. Wallet, KYC, and project limits still apply.
        </Text>
      </Card>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18 }}>{error}</Text> : null}
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
