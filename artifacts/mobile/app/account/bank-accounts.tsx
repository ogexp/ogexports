import React, { useState } from 'react';
import { View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useQueryClient } from '@tanstack/react-query';
import { useGetInvestorProfile, useUpdateInvestorProfile } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, messageOf, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const profileQueryKey = ['investor-profile'] as const;

export default function BankAccounts() {
  const { token } = useAuth();
  const colors = useColors();
  const client = useQueryClient();
  const query = useGetInvestorProfile({ query: { queryKey: profileQueryKey, enabled: Boolean(token) } });
  const updateProfile = useUpdateInvestorProfile();
  const profile = unwrap(query.data);
  const accounts = list(profile.bank_accounts);
  const [bank, setBank] = useState('');
  const [holder, setHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [swift, setSwift] = useState('');
  const [branch, setBranch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function saveBankDetails() {
    setError('');
    setNotice('');
    const currencyCode = currency.trim().toUpperCase();
    if (!bank.trim() || !holder.trim() || !(accountNumber.trim() || iban.trim())) {
      setError('Enter the bank name, account holder, and an account number or IBAN.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      setError('Enter a valid three-letter account currency, such as USD or PKR.');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        data: {
          withdraw_bank: {
            bank_name: bank.trim(),
            account_holder: holder.trim(),
            account_number: accountNumber.trim(),
            iban: iban.trim(),
            swift: swift.trim(),
            branch: branch.trim(),
            currency: currencyCode,
          },
        },
      });
      await client.invalidateQueries({ queryKey: profileQueryKey });
      setBank('');
      setHolder('');
      setAccountNumber('');
      setIban('');
      setCurrency('USD');
      setSwift('');
      setBranch('');
      setNotice('Bank details saved to your investor profile.');
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  return <Screen title="Bank Accounts" subtitle="Bank details are saved securely in your investor profile">
    {query.isError ? <ErrorState message="Saved bank details could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {error ? <Card><Text accessibilityRole="alert" style={{ color: colors.destructive }}>{error}</Text></Card> : null}
    {notice ? <Card><Text accessibilityLiveRegion="polite" style={{ color: colors.primary }}>{notice}</Text></Card> : null}
    <Card>
      <Section title="Saved accounts" />
      {query.isLoading ? <Text style={{ color: colors.mutedForeground }}>Loading accounts…</Text> : null}
      {!query.isLoading && !query.isError && accounts.length === 0
        ? <EmptyState title="No bank accounts saved" body="Enter your bank details below to add them to your profile." />
        : null}
      {accounts.map((account, index) => {
        const id = first(account, ['id']);
        const verificationStatus = first(account, ['verification_status'], 'not_submitted');
        const statusLabel = verificationStatus === 'not_submitted' ? 'Saved' : verificationStatus;
        const isDefault = account.is_default === true || first(account, ['is_default']).toLowerCase() === 'true';
        return <View key={id || String(index)} style={{ paddingVertical: 12, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>{first(account, ['bank_name'])}</Text>
            <Status value={statusLabel} />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>
            {first(account, ['account_holder'])} · {first(account, ['masked_account_identifier'], 'Identifier unavailable')}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
            {first(account, ['currency'], 'Currency unavailable')}{isDefault ? ' · Default for withdrawals' : ''}
          </Text>
        </View>;
      })}
    </Card>
    <Card>
      <Section title="Add bank details" />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        Enter your account information and save it to your profile. No bank statement or cheque upload is needed.
      </Text>
      <Field label="Bank name" value={bank} onChangeText={setBank} placeholder="Bank name" />
      <Field label="Account holder" value={holder} onChangeText={setHolder} placeholder="Name shown on the account" />
      <Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} placeholder="If applicable" autoCapitalize="none" />
      <Field label="IBAN" value={iban} onChangeText={setIban} placeholder="If applicable" autoCapitalize="characters" />
      <Field label="Currency" value={currency} onChangeText={setCurrency} placeholder="e.g. USD or PKR" autoCapitalize="characters" maxLength={3} />
      <Field label="SWIFT / BIC (optional)" value={swift} onChangeText={setSwift} placeholder="SWIFT / BIC" autoCapitalize="characters" />
      <Field label="Branch (optional)" value={branch} onChangeText={setBranch} placeholder="Branch" />
      <Action
        title="Save bank details"
        icon="save"
        loading={updateProfile.isPending}
        disabled={updateProfile.isPending || !bank.trim() || !holder.trim() || !(accountNumber.trim() || iban.trim()) || !/^[A-Za-z]{3}$/.test(currency.trim())}
        onPress={() => void saveBankDetails()}
        testID="save-bank-details"
      />
    </Card>
  </Screen>;
}
