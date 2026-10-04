import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
import { amount as readAmount, first, list, messageOf, money, record, unwrap } from '@/lib/data';
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
  const currency = first(wallet, ['currency', 'default_currency']);
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState('');
  const [proofName, setProofName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState<'form' | 'review' | 'submitted'>('form');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const selectedBank = banks.find(item => first(item, ['id']) === bankId);
  const selectedProject = projects.find(item => first(item, ['id']) === projectId);

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
    setNotice('');
    const numericAmount = Number(amount);
    if (!currency || !Number.isFinite(numericAmount) || numericAmount < 1) {
      setError('Enter a valid deposit amount and wait for the wallet currency to load.');
      setStage('form');
      return;
    }
    const numericBankId = bankId && Number.isFinite(Number(bankId)) ? Number(bankId) : undefined;
    const numericProjectId = projectId && Number.isFinite(Number(projectId)) ? Number(projectId) : undefined;
    try {
      const response = record(await create.mutateAsync({
        data: {
          amount: numericAmount,
          currency,
          method: 'bank_transfer',
          bank_account_id: numericBankId,
          bank_account_name: selectedBank ? first(selectedBank, ['bank_name', 'name']) : undefined,
          bank_reference: reference.trim() || undefined,
          proof_path: proof || undefined,
          project_id: numericProjectId,
        },
      }));
      const deposit = record(response.data);
      setConfirmation(deposit);
      setNotice(first(response, ['message'], 'Deposit request received from OG Exports.'));
      setStage('submitted');
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
    {stage === 'form' ? <>
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
      <Action title="Review deposit" icon="arrow-right" disabled={!currency || !amount || Number(amount) < 1} onPress={() => {
        setError('');
        if (!currency || !Number.isFinite(Number(amount)) || Number(amount) < 1) {
          setError('Enter a valid amount after your wallet currency has loaded.');
          return;
        }
        setStage('review');
      }} />
    </Card>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Deposits are reviewed by OG Exports before funds are credited. Your wallet balance changes only after approval.</Text>
    </> : null}

    {stage === 'review' ? <Card>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Review deposit</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, marginTop: 7, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ color: colors.mutedForeground }}>Transfer amount</Text>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>{currency ? money(Number(amount), currency) : '—'}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, gap: 12 }}>
        <Text style={{ color: colors.mutedForeground }}>Receiving account</Text>
        <Text style={{ color: colors.foreground, textAlign: 'right', flex: 1 }}>{selectedBank ? first(selectedBank, ['bank_name', 'name'], 'Bank account') : 'Choose from company accounts after returning to the form'}</Text>
      </View>
      {reference.trim() ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 }}><Text style={{ color: colors.mutedForeground }}>Transfer reference</Text><Text style={{ color: colors.foreground, textAlign: 'right', flex: 1 }}>{reference.trim()}</Text></View> : null}
      {proofName ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 }}><Text style={{ color: colors.mutedForeground }}>Receipt</Text><Text numberOfLines={1} style={{ color: colors.foreground, textAlign: 'right', flex: 1 }}>{proofName}</Text></View> : null}
      {selectedProject ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 }}><Text style={{ color: colors.mutedForeground }}>Associated project</Text><Text style={{ color: colors.foreground, textAlign: 'right', flex: 1 }}>{first(selectedProject, ['title', 'name'], 'Investment project')}</Text></View> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19, marginTop: 9, marginBottom: 14 }}>The server records this as a bank-transfer request for review. Wallet funds are credited only after OG Exports approves it.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit deposit request" icon="lock" loading={create.isPending} onPress={() => void submit()} />
      <View style={{ marginTop: 10 }}><Action title="Edit deposit" secondary onPress={() => setStage('form')} /></View>
    </Card> : null}

    {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Server confirmation</Text>
      {notice ? <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, marginTop: 6 }}><Text style={{ color: colors.mutedForeground }}>Status</Text><Status value={first(confirmation, ['status'], 'Not provided')} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}><Text style={{ color: colors.mutedForeground }}>Reference</Text><Text style={{ color: colors.foreground, fontWeight: '600' }}>{first(confirmation, ['reference', 'deposit_reference'], 'Not provided')}</Text></View>
      {readAmount(confirmation, ['amount']) != null && currency ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}><Text style={{ color: colors.mutedForeground }}>Amount</Text><Text style={{ color: colors.foreground, fontWeight: '600' }}>{money(readAmount(confirmation, ['amount']), currency)}</Text></View> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8 }}>This request does not mean funds have been credited. Check the status in recent deposits.</Text>
      <View style={{ marginTop: 14 }}><Action title="Record another deposit" secondary onPress={() => { setConfirmation(null); setNotice(''); setError(''); setStage('form'); }} /></View>
    </Card> : null}

    <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginVertical: 8 }}>Recent deposits</Text>
    {depositsQuery.isError ? <ErrorState message="Deposit history could not be loaded." onRetry={() => void depositsQuery.refetch()} /> : null}
    {depositsQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading deposit history…</Text></Card> : null}
    {!depositsQuery.isLoading && !depositsQuery.isError && deposits.length === 0 ? <EmptyState title="No deposits yet" body="Submitted transfers will appear here with their review status." /> : null}
    {deposits.map((item, index) => <Card key={first(item, ['id', 'reference'], String(index))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'deposit_reference'], 'Deposit request')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{first(item, ['amount'], '—')} {first(item, ['currency'], currency)} · {first(item, ['created_at', 'date'], '')}</Text></View>
      <Status value={first(item, ['status'], 'Not provided')} />
    </Card>)}
  </Screen>;
}