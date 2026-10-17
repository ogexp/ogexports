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
import { getUiLanguage, translateUi } from '@/lib/strings';

export default function AutoInvest() {
  const { token } = useAuth();
  const colors = useColors();
  const settingsQuery = useGetInvestorAutoInvestSettings({ query: { queryKey: ['investor-auto-invest-settings'], enabled: !!token, retry: 1 } });
  const commoditiesQuery = useGetInvestorAutoInvestCommodities({ query: { queryKey: ['investor-auto-invest-commodities'], enabled: !!token, staleTime: 60_000 } });
  const saveSettings = useUpdateInvestorAutoInvestSettings();
  const settings = record(unwrap(settingsQuery.data));
  const savedAmount = settings.amount == null ? '' : String(settings.amount);
  const savedCommodity = first(settings, ['commodity']);
  const loadError = settingsQuery.isError ? messageOf(settingsQuery.error) : '';
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('');
  const [commodity, setCommodity] = useState('');
  const [error, setError] = useState('');
  const formLocked = settingsQuery.isLoading || settingsQuery.isError || commoditiesQuery.isLoading || commoditiesQuery.isError || saveSettings.isPending;

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabled(Boolean(settings.enabled));
    setAmount(settings.amount == null ? '' : String(settings.amount));
    setCommodity(first(settings, ['commodity']));
  }, [settingsQuery.data]);

  const commodities = useMemo(() => Array.from(new Set(list(commoditiesQuery.data)
    .map(item => first(item, ['name']).trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [commoditiesQuery.data]);

  const parsedAmount = Number(amount.replace(/,/g, '').trim());
  const hasValidRule = Number.isFinite(parsedAmount) && parsedAmount > 0
    && !!commodity.trim()
    && !commoditiesQuery.isLoading
    && !commoditiesQuery.isError
    && commodities.some(name => name.toLowerCase() === commodity.trim().toLowerCase());
  const statusUnavailable = settingsQuery.isLoading || settingsQuery.isError;
  const statusLabel = settingsQuery.isLoading
    ? 'Checking auto-invest status…'
    : settingsQuery.isError
      ? 'Auto-invest status unavailable'
      : enabled ? 'Auto-invest is on' : 'Auto-invest is off';
  const switchDisabled = statusUnavailable || saveSettings.isPending || (!enabled && !hasValidRule);

  async function save(nextCommodity = commodity, nextEnabled = true, nextAmount = amount) {
    setError('');
    const amountToSave = Number(nextAmount.replace(/,/g, '').trim());
    if (!Number.isFinite(amountToSave) || amountToSave <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!nextCommodity.trim()) {
      setError('Choose an approved product name.');
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

  function toggleAutoInvest() {
    if (enabled) {
      if (!savedCommodity || !savedAmount) {
        setError('Your saved rule could not be loaded. Refresh before changing auto-invest.');
        return;
      }
      void save(savedCommodity, false, savedAmount);
      return;
    }
    if (!hasValidRule) {
      setError('Enter an amount and select an approved product before enabling auto-invest.');
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
    {settingsQuery.isError ? <Card testID="auto-invest-load-error" style={{ gap: 8 }}>
      <Text style={{ color: colors.destructive, fontSize: 13, fontWeight: '700' }}>Saved settings could not be loaded</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>Your existing rule has not been changed. Retry before editing or saving so it is not accidentally overwritten.</Text>
      {loadError ? <Text accessibilityRole="alert" style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>{loadError}</Text> : null}
      <Action title="Retry loading rule" icon="refresh-cw" secondary onPress={() => void settingsQuery.refetch()} />
    </Card> : null}
    <Card testID="auto-invest-status-card" style={{ gap: 13, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: enabled ? colors.lightGreen : colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Feather
            name={statusUnavailable ? 'activity' : enabled ? 'zap' : 'pause'}
            size={18}
            color={enabled ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Auto-invest status</Text>
          <Text style={{ color: enabled ? colors.primary : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>{statusLabel}</Text>
        </View>
        <Pressable
          testID="auto-invest-enable-toggle"
          accessibilityRole="switch"
          accessibilityLabel={translateUi(enabled ? 'Pause auto-invest' : 'Enable auto-invest', getUiLanguage())}
          accessibilityState={{ checked: enabled, disabled: switchDisabled, busy: saveSettings.isPending }}
          disabled={switchDisabled}
          onPress={toggleAutoInvest}
          style={{
            width: 50,
            height: 30,
            borderRadius: 16,
            padding: 3,
            justifyContent: 'center',
            backgroundColor: enabled ? colors.primary : colors.border,
            opacity: switchDisabled ? 0.5 : 1,
          }}
        >
          {saveSettings.isPending
            ? <ActivityIndicator size="small" color={colors.card} />
            : <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.card,
              alignSelf: enabled ? 'flex-end' : 'flex-start',
            }} />}
        </Pressable>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
        {statusUnavailable
          ? 'Refresh to confirm your saved rule before changing its status.'
          : enabled
            ? 'Your saved amount may be invested from your USD wallet when a new matching opportunity opens.'
            : savedAmount && savedCommodity
              ? 'Your rule is saved. Turn it on to invest in future matching opportunities.'
              : 'Add an amount and choose an approved product below to enable auto-invest.'}
      </Text>
    </Card>
      <Card testID="auto-invest-rule-form" style={{ gap: 9 }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Set your amount, then tap a product</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>Only product names approved for the public website are listed. Tapping a name saves and activates your rule immediately. It matches new container opportunities with that commodity, any container size.</Text>
        <Field label="Amount per opportunity (USD)" value={amount} onChangeText={setAmount} placeholder="e.g. 500" keyboardType="decimal-pad" editable={!settingsQuery.isLoading && !settingsQuery.isError && !saveSettings.isPending} />
        {commoditiesQuery.isLoading ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Loading public products…</Text>
        </View> : null}
        {commoditiesQuery.isError ? <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12 }}>Public product names could not be loaded.</Text>
          <Action title="Retry products" icon="refresh-cw" secondary onPress={() => void commoditiesQuery.refetch()} />
        </View> : null}
        {!commoditiesQuery.isLoading && !commoditiesQuery.isError && !commodities.length ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>No approved public products are available. Ask an admin to publish a product first.</Text> : null}
        {commodities.map((name, index) => {
          const selected = commodity.toLowerCase() === name.toLowerCase();
          return <Pressable key={`${name}-${index}`} testID={`auto-invest-product-${index}`} accessibilityRole="button" accessibilityLabel={`Save auto-invest rule for ${name}`} accessibilityState={{ selected, disabled: formLocked || !amount.trim() }}
            disabled={formLocked || !amount.trim()} onPress={() => void save(name, true)}
            style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.lightGreen : colors.card, opacity: formLocked || !amount.trim() ? 0.55 : 1 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: selected ? '700' : '600' }}>{name}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{selected && enabled ? 'Current active rule' : 'Tap to save and activate'}</Text>
            </View>
            {saveSettings.isPending && selected ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{selected && enabled ? 'ACTIVE' : 'SELECT'}</Text>}
          </Pressable>;
        })}
        <Text testID="auto-invest-rule-preview" style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
          {amount.trim() ? `$${amount.trim()} USD` : 'Enter an amount'} · {commodity || 'No product selected'} · any container size
        </Text>
      </Card>
      <Card style={{ gap: 7 }}>
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>Automatic investment safeguards</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>When a new matching container enters funding, the server attempts one wallet investment for your saved amount. The investment is active and the wallet is debited immediately if successful.</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>The investment is skipped if KYC is not approved, your wallet is not USD-denominated or lacks funds, or the amount does not meet project minimums or available capacity. Existing opportunities are never auto-invested.</Text>
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
