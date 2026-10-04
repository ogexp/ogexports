import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvestorDeposit,
  useGetInvestorDepositOptions,
  useGetInvestorDeposits,
  useGetInvestorPaymentBankAccounts,
  useGetInvestorWallet,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { first, list, messageOf, unwrap } from '@/lib/data';
import { uploadInvestorFile } from '@/lib/file-upload';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Deposit() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token } });
  const optionsQuery = useGetInvestorDepositOptions({ query: { queryKey: ['investor-deposit-options'], enabled: !!token } });
  const banksQuery = useGetInvestorPaymentBankAccounts({ query: { queryKey: ['investor-payment-bank-accounts'], enabled: !!token } });
  const depositsQuery = useGetInvestorDeposits({ per_page: 5 }, { query: { queryKey: ['investor-deposits'], enabled: !!token } });
  const create = useCreateInvestorDeposit();
  const wallet = unwrap(walletQuery.data);
  const banks = list(banksQuery.data);
  const projects = list(optionsQuery.data);
  const deposits = list(depositsQuery.data);
  const currency = first(wallet, ['currency', 'default_currency'], 'USD');
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState('');
  const [proofName, setProofName] = useState('');
  const [error, setError] = useState('');
  const selectedBank = banks.find(item => first(item, ['id']) === bankId);

  async function pickProof() {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      setError('Choose a receipt smaller than 10 MB.');
      return;
    }
    try {
      const path = await uploadInvestorFile(asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream', 'deposit-proofs', apiOrigin);
      setProof(path);
      setProofName(asset.name);
    } catch (err) { setError(messageOf(err)); }
  }

  async function submit() {
    setError('');
    const numericBankId = bankId && Number.isFinite(Number(bankId)) ? Number(bankId) : undefined;
    const numericProjectId = projectId && Number.isFinite(Number(projectId)) ? Number(projectId) : undefined;
    try {
      const response = await create.mutateAsync({
        data: {
          amount: Number(amount),
          currency,
          method: 'bank_transfer',
          bank_account_id: numericBankId,
          bank_account_name: selectedBank ? first(selectedBank, ['bank_name', 'name']) : undefined,
          bank_reference: reference.trim() || undefined,
          proof_path: proof || undefined,
          project_id: numericProjectId,
        },
      });
      const responseData = unwrap(response);
      const deposit = responseData.data && typeof responseData.data === 'object' ? responseData.data as Record<string, unknown> : responseData;
      Alert.alert('Deposit submitted', `Your transfer is awaiting confirmation.${typeof deposit.reference === 'string' ? ` Reference: ${deposit.reference}` : ''}`);
      setAmount('');
      setReference('');
      setProof('');
      setProofName('');
      setBankId('');
      setProjectId('');
      void depositsQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] });
    } catch (err) { setError(messageOf(err)); }
  }

  return <Screen title="Add funds" subtitle={`Record a bank transfer to your OG Exports wallet · ${currency}`}>
    {banksQuery.isError ? <ErrorState message="Company bank accounts could not be loaded." onRetry={() => void banksQuery.refetch()} /> : null}
    {optionsQuery.isError ? <ErrorState message="Available project options could not be loaded." onRetry={() => void optionsQuery.refetch()} /> : null}
    {projects.length ? <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 8 }}>Optional: associate this deposit with a project</Text>
      <Pressable onPress={() => setProjectId('')} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ color: projectId ? colors.mutedForeground : colors.primary, fontWeight: '700' }}>General wallet deposit {projectId ? '· Tap to select' : '· Selected'}</Text>
      </Pressable>
      {projects.map((item, index) => {
        const id = first(item, ['id']);
        const selected = id === projectId;
        return <Pressable key={id || String(index)} onPress={() => setProjectId(id)} style={{ paddingVertical: 10, borderBottomWidth: index === projects.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
          <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: '700' }}>{first(item, ['title', 'name'], 'Investment project')}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>{first(item, ['roi_label', 'type'], '')}{first(item, ['min_investment']) ? ` · Minimum ${first(item, ['min_investment'])} ${currency}` : ''}</Text>
        </Pressable>;
      })}
    </Card> : null}

    {banks.length ? <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 8 }}>Transfer to a company account</Text>
      {banks.map((item, index) => {
        const id = first(item, ['id']);
        const selected = id === bankId;
        return <Pressable key={id || String(index)} onPress={() => setBankId(selected ? '' : id)} style={{ paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}>
          <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: '700' }}>{first(item, ['bank_name', 'name'], 'Bank account')}{selected ? ' · Selected' : ''}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{first(item, ['account_title', 'account_holder', 'account_name'], '')}{first(item, ['account_number', 'iban']) ? ` · ${first(item, ['account_number', 'iban'])}` : ''}</Text>
        </Pressable>;
      })}
    </Card> : null}

    <Card>
      <Field label={`Deposit amount (${currency})`} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      <Field label="Transfer reference (optional)" value={reference} onChangeText={setReference} placeholder="Transaction or receipt reference" autoCapitalize="none" />
      <Pressable accessibilityRole="button" onPress={() => void pickProof()} style={{ paddingVertical: 12 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{proofName ? `Receipt attached · ${proofName}` : 'Attach receipt (PDF or image)'}</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit deposit" icon="arrow-down-left" loading={create.isPending} disabled={!amount || Number(amount) < 1} onPress={() => void submit()} />
    </Card>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Deposits are reviewed by OG Exports before funds are credited. Your wallet balance changes only after approval.</Text>

    <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginVertical: 8 }}>Recent deposits</Text>
    {depositsQuery.isError ? <ErrorState message="Deposit history could not be loaded." onRetry={() => void depositsQuery.refetch()} /> : null}
    {depositsQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading deposit history…</Text></Card> : null}
    {!depositsQuery.isLoading && !depositsQuery.isError && deposits.length === 0 ? <EmptyState title="No deposits yet" body="Submitted transfers will appear here with their review status." /> : null}
    {deposits.map((item, index) => <Card key={first(item, ['id', 'reference'], String(index))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'deposit_reference'], 'Deposit request')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{first(item, ['amount'], '—')} {first(item, ['currency'], currency)} · {first(item, ['created_at', 'date'], '')}</Text></View>
      <Status value={first(item, ['status'], 'Pending')} />
    </Card>)}
  </Screen>;
}