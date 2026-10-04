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
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { amount as readAmount, first, list, messageOf, money, record, unwrap } from '@/lib/data';
import { uploadInvestorFile } from '@/lib/file-upload';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const depositStages = ['Submitted', 'Under Review', 'Verified', 'Credited'] as const;
const completedStatuses = new Set(['approved', 'verified', 'credited', 'completed']);
const reviewStatuses = new Set(['pending', 'submitted', 'under review', 'under_review', 'review', 'in review', 'in_review', 'pending verification', 'pending_verification']);

function isEnabled(value: string) {
  return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
}

function DepositProgress({ deposit }: { deposit: Record<string, unknown> }) {
  const colors = useColors();
  const rawStatus = first(deposit, ['review_status', 'status'], 'Not provided');
  const status = rawStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const approved = completedStatuses.has(status);
  const inReview = reviewStatuses.has(status);
  const stopped = ['rejected', 'cancelled', 'canceled'].includes(status);
  const completeCount = approved ? 4 : stopped ? 2 : 1;
  const activeIndex = approved || stopped ? -1 : inReview ? 1 : 0;
  const explanation = approved
    ? 'OG Exports approves the deposit and credits the wallet in the same server transaction.'
    : inReview
      ? 'The request is awaiting OG Exports review. The wallet is not credited yet.'
      : stopped
        ? `OG Exports reports this request as ${rawStatus}. Later steps are not shown as complete.`
        : `OG Exports reports ${rawStatus}. Later steps are not inferred.`;

  return <Card style={{ marginTop: 12 }}>
    <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Deposit progress</Text>
    <View style={{ marginTop: 13 }}>
      {depositStages.map((label, index) => {
        const done = index < completeCount;
        const active = index === activeIndex;
        return <View key={label} style={{ flexDirection: 'row', gap: 11, minHeight: index === depositStages.length - 1 ? 34 : 45 }}>
          <View style={{ width: 20, alignItems: 'center' }}>
            <View style={{ width: 19, height: 19, borderRadius: 10, borderWidth: done || active ? 0 : 1, borderColor: colors.border, backgroundColor: done ? colors.statusSuccess : active ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>
              {done ? <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '700' }}>✓</Text> : active ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primaryForeground }} /> : null}
            </View>
            {index < depositStages.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 3, backgroundColor: done ? colors.statusSuccess : colors.border }} /> : null}
          </View>
          <Text style={{ color: done || active ? colors.foreground : colors.mutedForeground, fontSize: 12, fontWeight: done || active ? '700' : '400', paddingTop: 2 }}>{label}{active ? ' · Current' : ''}</Text>
        </View>;
      })}
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }}>{explanation}</Text>
  </Card>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, flex: 0.8 }}>{label}</Text>
    <Text selectable style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', textAlign: 'right', flex: 1.2 }}>{value || 'Not provided by OG Exports'}</Text>
  </View>;
}

export default function Deposit() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: Boolean(token) } });
  const optionsQuery = useGetInvestorDepositOptions({ query: { queryKey: ['investor-deposit-options'], enabled: Boolean(token) } });
  const banksQuery = useGetInvestorPaymentBankAccounts({ query: { queryKey: ['investor-payment-bank-accounts'], enabled: Boolean(token) } });
  const depositsQuery = useGetInvestorDeposits({ per_page: 5 }, { query: { queryKey: ['investor-deposits'], enabled: Boolean(token) } });
  const create = useCreateInvestorDeposit();
  const wallet = unwrap(walletQuery.data);
  const banks = list(banksQuery.data);
  const projects = list(optionsQuery.data);
  const deposits = list(depositsQuery.data);
  const walletCurrency = first(wallet, ['currency', 'default_currency']).toUpperCase();
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
  const [selectedDepositId, setSelectedDepositId] = useState('');
  const defaultBank = banks.find(item => isEnabled(first(item, ['is_default'])));
  const selectedBank = banks.find(item => first(item, ['id']) === bankId) ?? defaultBank;
  const selectedProject = projects.find(item => first(item, ['id']) === projectId);
  const paymentCurrency = first(selectedBank ?? {}, ['currency']).toUpperCase() || walletCurrency;
  const proofRequired = isEnabled(first(selectedBank ?? {}, ['proof_required', 'requires_proof']));
  const timelineDeposit = confirmation ?? deposits.find(item => first(item, ['id', 'reference', 'deposit_reference']) === selectedDepositId);

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

  function validateDeposit() {
    const numericAmount = Number(amount);
    if (!paymentCurrency || !Number.isFinite(numericAmount) || numericAmount < 1) {
      setError('Enter a valid amount after the payment currency has loaded.');
      return false;
    }
    if (!selectedBank || !first(selectedBank, ['id'])) {
      setError('Choose an active OG Exports payment account before continuing.');
      return false;
    }
    if (!reference.trim()) {
      setError('Enter the transaction reference from your bank transfer.');
      return false;
    }
    if (proofRequired && !proof) {
      setError('This payment account requires proof of transfer. Attach a receipt to continue.');
      return false;
    }
    return true;
  }

  async function submit() {
    setError('');
    setNotice('');
    if (!validateDeposit()) {
      setStage('form');
      return;
    }
    const selectedBankId = Number(first(selectedBank ?? {}, ['id']));
    const numericProjectId = projectId && Number.isFinite(Number(projectId)) ? Number(projectId) : undefined;
    try {
      const response = record(await create.mutateAsync({
        data: {
          amount: Number(amount),
          currency: paymentCurrency,
          method: 'bank_transfer',
          bank_account_id: Number.isFinite(selectedBankId) ? selectedBankId : undefined,
          bank_account_name: first(selectedBank ?? {}, ['bank_name', 'name']) || undefined,
          bank_reference: reference.trim(),
          proof_path: proof || undefined,
          project_id: numericProjectId,
        },
      }));
      const deposit = record(response.data);
      setConfirmation(deposit);
      setSelectedDepositId(first(deposit, ['id', 'reference', 'deposit_reference']));
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

  return <Screen title="Add funds" subtitle={`Bank transfer to your OG Exports wallet · ${paymentCurrency || 'Currency unavailable'}`}>
    {stage === 'form' ? <>
      <Section title="1 · Amount" />
      <Card>
        <Field label={`Deposit amount (${paymentCurrency || 'currency unavailable'})`} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      </Card>

      <Section title="2 · Payment Method" />
      <Card style={{ borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>Bank transfer</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>The current deposit service supports bank transfers.</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>SELECTED</Text>
        </View>
      </Card>

      <Section title="3 · Bank / Payment Instructions" />
      {banksQuery.isError ? <ErrorState message="OG Exports payment accounts could not be loaded." onRetry={() => void banksQuery.refetch()} /> : null}
      {banksQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading payment instructions…</Text></Card> : null}
      {!banksQuery.isLoading && !banksQuery.isError && banks.length === 0
        ? <EmptyState title="Payment instructions unavailable" body="OG Exports has not provided an active receiving account. You cannot submit a transfer request until instructions are available." />
        : null}
      {banks.length ? <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 7 }}>Select a receiving account</Text>
        {banks.map((item, index) => {
          const id = first(item, ['id']);
          const selected = first(selectedBank ?? {}, ['id']) === id;
          return <Pressable key={id || String(index)} accessibilityRole="button" accessibilityState={{ selected }} testID={`deposit-bank-${id || index}`} onPress={() => setBankId(id)} style={{ paddingVertical: 11, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: '700', flex: 1 }}>{first(item, ['bank_name', 'name'], 'Bank account')}</Text>
              {selected ? <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>SELECTED</Text> : null}
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{first(item, ['account_title', 'account_holder', 'account_name'], 'Account title not provided')}{first(item, ['currency']) ? ` · ${first(item, ['currency']).toUpperCase()}` : ''}</Text>
          </Pressable>;
        })}
        {selectedBank ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 2 }}>
          <DetailRow label="Account number" value={first(selectedBank, ['account_number'])} />
          <DetailRow label="IBAN" value={first(selectedBank, ['iban'])} />
          <DetailRow label="SWIFT / BIC" value={first(selectedBank, ['swift'])} />
          <DetailRow label="Payment currency" value={first(selectedBank, ['currency']).toUpperCase() || walletCurrency || 'Not provided by OG Exports'} />
          {first(selectedBank, ['instructions']) ? <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 19, marginTop: 7 }}>{first(selectedBank, ['instructions'])}</Text> : null}
          {first(selectedBank, ['notes']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{first(selectedBank, ['notes'])}</Text> : null}
          {!first(selectedBank, ['instructions', 'notes']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 6 }}>Additional payment instructions were not provided by OG Exports.</Text> : null}
        </View> : null}
      </Card> : null}

      {optionsQuery.isError ? <ErrorState message="Project association options could not be loaded." onRetry={() => void optionsQuery.refetch()} /> : null}
      {projects.length ? <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 8 }}>Optional project association</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: !projectId }} onPress={() => setProjectId('')} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: !projectId ? colors.primary : colors.foreground, fontWeight: '600' }}>General wallet deposit</Text>
        </Pressable>
        {projects.map((item, index) => {
          const id = first(item, ['id']);
          const selected = id === projectId;
          return <Pressable key={id || String(index)} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setProjectId(id)} style={{ paddingVertical: 9, borderBottomWidth: index === projects.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
            <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: '600' }}>{first(item, ['title', 'name'], 'Investment project')}</Text>
          </Pressable>;
        })}
      </Card> : null}

      <Section title="4 · Transaction Reference" />
      <Card>
        <Field label="Bank transaction reference · Required" value={reference} onChangeText={setReference} placeholder="Reference from your transfer receipt" autoCapitalize="none" />
        <Pressable accessibilityRole="button" testID="attach-deposit-proof" onPress={() => void pickProof()} style={{ paddingVertical: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{proofName ? `Receipt attached · ${proofName}` : proofRequired ? 'Attach proof of transfer · Required' : 'Attach proof of transfer · Optional'}</Text>
        </Pressable>
        {proofRequired ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>The selected payment account requires proof before submission.</Text> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 5, marginBottom: 10 }}>{error}</Text> : null}
        <Action title="Review deposit" icon="arrow-right" disabled={!paymentCurrency || !amount || Number(amount) < 1 || !selectedBank || !reference.trim() || (proofRequired && !proof)} onPress={() => {
          setError('');
          if (validateDeposit()) setStage('review');
        }} />
      </Card>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>Use the selected OG Exports payment instructions and submit the transfer reference. Wallet funds are credited only after server approval.</Text>
    </> : null}

    {stage === 'review' ? <Card>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Review deposit</Text>
      <DetailRow label="Amount" value={paymentCurrency ? money(Number(amount), paymentCurrency) : 'Currency unavailable'} />
      <DetailRow label="Payment method" value="Bank transfer" />
      <DetailRow label="Receiving bank" value={first(selectedBank ?? {}, ['bank_name', 'name'])} />
      <DetailRow label="Account number / IBAN" value={first(selectedBank ?? {}, ['account_number', 'iban'])} />
      <DetailRow label="Transaction reference" value={reference.trim()} />
      <DetailRow label="Proof of transfer" value={proofName || (proofRequired ? 'Required, but not attached' : 'Not attached')} />
      {selectedProject ? <DetailRow label="Project association" value={first(selectedProject, ['title', 'name'], 'Investment project')} /> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8, marginBottom: 12 }}>OG Exports will review this request. The wallet balance will change only after the server confirms approval.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit deposit request" icon="lock" loading={create.isPending} onPress={() => void submit()} />
      <View style={{ marginTop: 10 }}><Action title="Edit deposit" secondary onPress={() => { setError(''); setStage('form'); }} /></View>
    </Card> : null}

    {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
      {(() => {
        const confirmationCurrency = first(confirmation, ['currency', 'wallet_currency'], paymentCurrency);
        return <>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Deposit request submitted</Text>
      {notice ? <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, marginTop: 6 }}>
        <Text style={{ color: colors.mutedForeground }}>Server status</Text>
        <Status value={first(confirmation, ['review_status_label', 'status'], 'Not provided')} />
      </View>
      <DetailRow label="Deposit reference" value={first(confirmation, ['reference', 'deposit_reference'])} />
      {readAmount(confirmation, ['amount']) != null && confirmationCurrency ? <DetailRow label="Amount" value={money(readAmount(confirmation, ['amount']), confirmationCurrency)} /> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8 }}>A submitted request is not yet a wallet credit. Follow the server status below.</Text>
      <DepositProgress deposit={confirmation} />
      <View style={{ marginTop: 14 }}><Action title="Record another deposit" secondary onPress={() => { setConfirmation(null); setSelectedDepositId(''); setNotice(''); setError(''); setStage('form'); }} /></View>
        </>;
      })()}
    </Card> : null}

    <Section title="Recent deposits" right={<Pressable accessibilityRole="button" accessibilityLabel="Refresh deposit history" onPress={() => {
      void depositsQuery.refetch();
      void walletQuery.refetch();
    }} style={{ width: 38, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 18 }}>↻</Text>
    </Pressable>} />
    {depositsQuery.isError ? <ErrorState message="Deposit history could not be loaded." onRetry={() => void depositsQuery.refetch()} /> : null}
    {depositsQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading deposit history…</Text></Card> : null}
    {!depositsQuery.isLoading && !depositsQuery.isError && deposits.length === 0 ? <EmptyState title="No deposits yet" body="Submitted transfers will appear here with their review status." /> : null}
    {deposits.map((item, index) => {
      const id = first(item, ['id', 'reference', 'deposit_reference'], String(index));
      const selected = selectedDepositId === id;
      return <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => {
        setSelectedDepositId(selected ? '' : id);
        if (!selected) {
          setConfirmation(null);
          setStage('form');
        }
      }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderColor: selected ? colors.primary : colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'deposit_reference'], 'Deposit request')}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(item, ['amount'], '—')} {first(item, ['currency'], walletCurrency)} · {first(item, ['created_at', 'date'], 'Date not provided')}</Text>
          </View>
          <Status value={first(item, ['review_status_label', 'status'], 'Not provided')} />
        </Card>
      </Pressable>;
    })}
    {timelineDeposit && stage !== 'submitted' ? <DepositProgress deposit={record(timelineDeposit)} /> : null}
  </Screen>;
}