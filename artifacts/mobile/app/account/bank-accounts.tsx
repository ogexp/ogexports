import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetInvestorBankAccountsQueryKey,
  useGetInvestorBankAccounts,
  useSetInvestorDefaultBankAccount,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, messageOf, unwrap } from '@/lib/data';
import { getInvestorUploadFileSize, submitInvestorBankAccountProof } from '@/lib/file-upload';
import { INVESTOR_DOCUMENT_MIME_TYPES } from '@/lib/upload-rules';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function BankAccounts() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const client = useQueryClient();
  const queryKey = getGetInvestorBankAccountsQueryKey();
  const query = useGetInvestorBankAccounts({ query: { queryKey, enabled: Boolean(token) } });
  const setDefault = useSetInvestorDefaultBankAccount();
  const accounts = list(unwrap(query.data).bank_accounts);
  const [bank, setBank] = useState('');
  const [holder, setHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [currency, setCurrency] = useState('');
  const [swift, setSwift] = useState('');
  const [branch, setBranch] = useState('');
  const [proof, setProof] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [proofPicking, setProofPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function chooseProof() {
    setError('');
    setProofPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...INVESTOR_DOCUMENT_MIME_TYPES],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) throw new Error('No file was selected. Try again.');
      const size = getInvestorUploadFileSize(file.uri);
      setProof({ uri: file.uri, name: file.name, size });
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setProofPicking(false);
    }
  }

  async function submit() {
    setError('');
    setNotice('');
    if (!bank.trim() || !holder.trim() || !(accountNumber.trim() || iban.trim()) || !currency.trim() || !proof) {
      setError('Enter the bank, holder, account number or IBAN, and currency; then attach a bank statement or cancelled cheque.');
      return;
    }
    setBusy(true);
    try {
      await submitInvestorBankAccountProof(proof.uri, proof.name, apiOrigin, {
        bank_name: bank, account_holder: holder, account_number: accountNumber,
        iban, swift, branch, currency,
      });
      setBank(''); setHolder(''); setAccountNumber(''); setIban('');
      setCurrency(''); setSwift(''); setBranch(''); setProof(null);
      setNotice('Submitted to OG Exports for administrator review.');
      await client.invalidateQueries({ queryKey });
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setError('');
    try {
      await setDefault.mutateAsync({ id });
      await client.invalidateQueries({ queryKey });
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  return <Screen title="Bank Accounts" subtitle="Submit an account and proof for OG Exports review">
    {query.isError ? <ErrorState message="Bank accounts could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    {error ? <Card><Text accessibilityRole="alert" style={{ color: colors.destructive }}>{error}</Text></Card> : null}
    {notice ? <Card><Text accessibilityLiveRegion="polite" style={{ color: colors.primary }}>{notice}</Text></Card> : null}
    <Card>
      <Section title="Saved accounts" />
      {query.isLoading ? <Text style={{ color: colors.mutedForeground }}>Loading accounts…</Text> : null}
      {!query.isLoading && !query.isError && accounts.length === 0
        ? <EmptyState title="No bank accounts submitted" body="Add an account below. It cannot be used for withdrawals until OG Exports verifies it." />
        : null}
      {accounts.map((account, index) => {
        const id = first(account, ['id']);
        const status = first(account, ['verification_status'], 'unavailable');
        const isDefault = first(account, ['is_default']).toLowerCase() === 'true';
        return <View key={id || String(index)} style={{ paddingVertical: 12, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>{first(account, ['bank_name'])}</Text>
            <Status value={status} />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 5 }}>
            {first(account, ['account_holder'])} · {first(account, ['masked_account_identifier'], 'Identifier unavailable')}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
            {first(account, ['currency'], 'Currency unavailable')}{isDefault ? ' · Default for withdrawals' : ''}
          </Text>
          {status === 'rejected' && first(account, ['verification_notes'])
            ? <Text style={{ color: colors.destructive, fontSize: 11, marginTop: 6 }}>Review note: {first(account, ['verification_notes'])}</Text>
            : null}
          {status === 'verified' && !isDefault
            ? <View style={{ alignSelf: 'flex-start', marginTop: 8 }}><Action title="Set as withdrawal default" secondary loading={setDefault.isPending} onPress={() => void makeDefault(id)} /></View>
            : null}
        </View>;
      })}
    </Card>
    <Card>
      <Section title="Submit an account for review" />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        Upload a bank statement or cancelled cheque showing the account holder and identifier. Proof is stored privately and only administrators can open it.
      </Text>
      <Field label="Bank name" value={bank} onChangeText={setBank} placeholder="Bank name" />
      <Field label="Account holder" value={holder} onChangeText={setHolder} placeholder="Name shown on the account" />
      <Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} placeholder="If applicable" autoCapitalize="none" />
      <Field label="IBAN" value={iban} onChangeText={setIban} placeholder="If applicable" autoCapitalize="characters" />
      <Field label="Currency" value={currency} onChangeText={setCurrency} placeholder="e.g. USD or PKR" autoCapitalize="characters" />
      <Field label="SWIFT / BIC (optional)" value={swift} onChangeText={setSwift} placeholder="SWIFT / BIC" autoCapitalize="characters" />
      <Field label="Branch (optional)" value={branch} onChangeText={setBranch} placeholder="Branch" />
      <View style={{ gap: 12 }}>
        <Action title={proofPicking ? 'Selecting file…' : proof ? 'Change bank proof' : 'Select bank proof to upload'}
          icon={proof ? 'refresh-cw' : 'upload'} secondary loading={proofPicking} testID="choose-bank-proof" onPress={() => void chooseProof()} />
        {proof ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.lightGreen }}>
          <Feather name="file-text" size={17} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{proof.name}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>
              {proof.size ? `${(proof.size / 1024 / 1024).toFixed(1)} MB · maximum 10 MB` : 'Ready to submit'}
            </Text>
          </View>
          <Feather name="check-circle" size={17} color={colors.primary} />
        </View> : null}
        <Action title="Submit for review" icon="shield" loading={busy}
          disabled={busy || proofPicking || !bank.trim() || !holder.trim() || !(accountNumber.trim() || iban.trim()) || !currency.trim() || !proof}
          onPress={() => void submit()} />
      </View>
    </Card>
  </Screen>;
}
