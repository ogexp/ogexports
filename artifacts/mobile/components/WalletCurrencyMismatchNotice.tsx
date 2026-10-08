import React from 'react';
import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useColors } from '@/hooks/useColors';
import { translateUi, type AppLanguage } from '@/lib/strings';

type Props = {
  mismatchedCurrencies: string[];
  profileCurrency: string;
  language: AppLanguage;
  testID?: string;
};

export function WalletCurrencyMismatchNotice({
  mismatchedCurrencies,
  profileCurrency,
  language,
  testID = 'wallet-currency-mismatch',
}: Props) {
  const colors = useColors();
  if (!mismatchedCurrencies.length) return null;

  return <View testID={testID} style={{
    backgroundColor: colors.card,
    borderColor: colors.destructive,
    borderWidth: 1,
    borderRadius: colors.radius,
    padding: 14,
    marginBottom: 12,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
      <Feather name="alert-triangle" size={17} color={colors.destructive} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="alert" style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>
          {translateUi('Wallet currency follows your Profile currency.', language)}
        </Text>
        <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '700', marginTop: 5 }}>
          {mismatchedCurrencies.join(' / ')} → {profileCurrency}
        </Text>
      </View>
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 9, marginBottom: 11 }}>
      {translateUi('Deposit and withdrawal requests are paused until the wallet matches your Profile currency.', language)}
    </Text>
  </View>;
}
