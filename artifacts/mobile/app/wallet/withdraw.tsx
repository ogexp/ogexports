import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvestorWithdrawal,
  useGetInvestorProfile,
  useGetInvestorWallet,
  useGetInvestorWithdrawals,
  useSendInvestorWithdrawalOtp,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { amount as readAmount, first, list, messageOf, money, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const withdrawalStages = ['Requested', 'Processing', 'Approved', 'Completed'] as const;
const finishedStatuses = new Set(['approved', 'completed']);
const processingStatuses = new Set(['pending', 'requested', 'processing', 'review', 'in review']);

function verifiedBankAccount(account: Record<string, unknown>) {
  const flag = first(account, ['is_verified', 'verified']).toLowerCase();
  const status = first(account, ['verification_status', 'bank_verification_status', 'status']).toLowerCase();
  const verified = flag === 'true' || flag === '1' || status === 'verified';
  const hasDestination = Boolean(
    first(account, ['bank_name'])
    && first(account, ['account_holder', 'account_title'])
    && (first(account, ['account_number']) || first(account, ['iban'])),
  );
  return verified && hasDestination;
}

function bankKey(account: Record<string, unknown>) {
  return first(account, ['id', 'account_id', 'iban', 'account_number']);
}

function maskAccount(account: Record<string, unknown>) {
  const value = first(account, ['account_number', 'iban']);
  return value ? `•••• ${value.slice(-4)}` : 'Destination account not provided';
}

function WithdrawalProgress({ withdrawal }: { withdrawal: Record<string, unknown> }) {
  const colors = useColors();
  const rawStatus = first(withdrawal, ['status', 'withdrawal_status'], 'Not provided');
  const status = rawStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const finished = finishedStatuses.has(status);
  const processing = processingStatuses.has(status);
  const stopped = ['rejected', 'cancelled', 'canceled'].includes(status);
  const completedCount = finished ? 4 : stopped ? (status === 'rejected' ? 2 : 1) : processing ? 1 : status === 'submitted' ? 0 : 0;
  const activeIndex = finished || stopped ? -1 : processing ? 1 : status === 'submitted' ? 0 : -1;
  const explanation = finished
    ? 'OG Exports records the withdrawal approval and its completed wallet transaction together.'
    : processing
      ? 'The withdrawal request is with OG Exports for processing. Follow the server status for updates.'
      : stopped
        ? `OG Exports reports this request as ${rawStatus}. Later steps are not shown as complete.`
        : `OG Exports reports ${rawStatus}. Later steps are not inferred.`;

  return <Card style={{ marginTop: 12 }}>
    <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Withdrawal progress</Text>
    <View style={{ marginTop: 13 }}>
      {withdrawalStages.map((label, index) => {
        const done = index < completedCount;
        const active = index === activeIndex;
        return <View key={label} style={{ flexDirection: 'row', gap: 11, minHeight: index === withdrawalStages.length - 1 ? 34 : 45 }}>
          <View style={{ width: 20, alignItems: 'center' }}>
            <View style={{ width: 19, height: 19, borderRadius: 10, borderWidth: done || active ? 0 : 1, borderColor: colors.border, backgroundColor: done ? colors.statusSuccess : active ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}>
              {done ? <Text style={{ color: colors.primaryForeground, fontSize: 11, fontWeight: '700' }}>✓</Text> : active ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primaryForeground }} /> : null}
            </View>
            {index < withdrawalStages.length - 1 ? <View style={{ width: 1, flex: 1, marginTop: 3, backgroundColor: done ? colors.statusSuccess : colors.border }} /> : null}
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
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 0.9 }}>{label}</Text>
    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1.1 }}>{value || 'Not provided by OG Exports'}</Text>
  </View>;
}

export default function Withdraw() {
  const { token } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: Boolean(token) } });
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: Boolean(token) } });
  const historyQuery = useGetInvestorWithdrawals({}, { query: { queryKey: ['investor-withdrawals'], enabled: Boolean(token) } });
  const create = useCreateInvestorWithdrawal();
  const sendOtp = useSendInvestorWithdrawalOtp();
  const wallet = unwrap(walletQuery.data);
  const profile = unwrap(profileQuery.data);
  const walletCurrency = first(wallet, ['currency', 'default_currency']).toUpperCase();
  const explicitWithdrawableBalance = readAmount(wallet, ['withdrawable_balance']);
  const availableBalance = explicitWithdrawableBalance ?? readAmount(wallet, ['available_balance']);
  const rawBankAccounts = list(profile.bank_accounts);
  const defaultBankAccount = record(profile.default_bank_account);
  const bankAccounts = [...rawBankAccounts, defaultBankAccount]
    .filter(account => Boolean(first(account, ['bank_name'])))
    .filter((account, index, all) => all.findIndex(candidate => bankKey(candidate) === bankKey(account)) === index);
  const verifiedAccounts = bankAccounts.filter(verifiedBankAccount);
  const defaultVerified = verifiedAccounts.find(account => first(account, ['is_default']).toLowerCase() === 'true')
    ?? verifiedAccounts[0];
  const [selectedBankKey, setSelectedBankKey] = useState('');
  const selectedBank = verifiedAccounts.find(account => bankKey(account) === selectedBankKey) ?? defaultVerified;
  const withdrawals = list(historyQuery.data);
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState<'form' | 'review' | 'submitted'>('form');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState('');
  const withdrawalCurrency = walletCurrency || first(selectedBank ?? {}, ['currency']).toUpperCase();
  const historySelection = withdrawals.find(item => first(item, ['id', 'reference', 'withdraw_id']) === selectedWithdrawalId);
  const progressWithdrawal = confirmation ?? (historySelection ? record(historySelection) : null);
  const fee = readAmount(selectedBank ?? {}, ['withdrawal_fee', 'transaction_fee', 'fee']);
  const processingTime = first(selectedBank ?? {}, ['estimated_processing_time', 'processing_time']);

  async function requestOtp() {
    setError('');
    setNotice('');
    try {
      const result = record(await sendOtp.mutateAsync());
      setNotice(first(result, ['message'], 'Verification code requested. Check the email registered to your account.'));
    } catch (err) { setError(messageOf(err)); }
  }

  function review() {
    setError('');
    setNotice('');
    const amountNumber = Number(amount);
    if (availableBalance == null || !withdrawalCurrency || !Number.isFinite(amountNumber) || amountNumber < 1 || amountNumber > availableBalance) {
      setError('Enter a valid amount within the withdrawable balance reported by OG Exports.');
      return;
    }
    if (!selectedBank) {
      setError('Select a bank account that OG Exports has marked as verified.');
      return;
    }
    if (!otp.trim() || !transactionPassword) {
      setError('Enter the emailed code and your transaction password.');
      return;
    }
    setStage('review');
  }

  async function submit() {
    setError('');
    setNotice('');
    const amountNumber = Number(amount);
    if (availableBalance == null || amountNumber < 1 || amountNumber > availableBalance || !selectedBank) {
      setError('The amount or verified destination account is no longer available. Review the withdrawal details.');
      setStage('form');
      return;
    }
    const bankDetails = {
      bank_name: first(selectedBank, ['bank_name']),
      account_holder: first(selectedBank, ['account_holder', 'account_title']),
      account_number: first(selectedBank, ['account_number']),
      iban: first(selectedBank, ['iban']),
      swift: first(selectedBank, ['swift']),
      branch: first(selectedBank, ['branch']),
      currency: withdrawalCurrency,
    };
    try {
      const response = record(await create.mutateAsync({
        data: {
          amount: amountNumber,
          otp: otp.trim(),
          transaction_password: transactionPassword,
          bank_details: bankDetails,
          save_bank_details: false,
        },
      }));
      const withdrawal = record(response.data);
      setConfirmation(withdrawal);
      setSelectedWithdrawalId(first(withdrawal, ['id', 'reference', 'withdraw_id']));
      setNotice(first(response, ['message'], 'Withdrawal request received from OG Exports.'));
      setStage('submitted');
      setAmount('');
      setOtp('');
      setTransactionPassword('');
      void historyQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] });
    } catch (err) { setError(messageOf(err)); }
  }

  return <Screen title="Withdraw" subtitle="Request a payout from your OG Exports wallet">
    {walletQuery.isError ? <ErrorState message="Withdrawable balance could not be loaded." onRetry={() => void walletQuery.refetch()} /> : null}
    {profileQuery.isError ? <ErrorState message="Bank account details could not be loaded." onRetry={() => void profileQuery.refetch()} /> : null}
    <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>WITHDRAWABLE BALANCE</Text>
      <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: '700', marginTop: 7 }}>
        {walletQuery.isLoading ? 'Loading…' : availableBalance != null && withdrawalCurrency ? money(availableBalance, withdrawalCurrency) : 'Unavailable'}
      </Text>
      {explicitWithdrawableBalance == null && availableBalance != null
        ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 6 }}>OG Exports does not return a separate withdrawable total; requests are reserved from the reported available balance.</Text>
        : null}
    </Card>

    {profileQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading saved bank accounts…</Text></Card> : null}
    {!profileQuery.isLoading && !profileQuery.isError && verifiedAccounts.length === 0
      ? <EmptyState title="No verified bank account available" body="OG Exports has not returned a verified payout account. Add and verify a bank account with OG Exports before requesting a withdrawal." />
      : null}

    {stage === 'form' ? <Card>
      <Section title="Withdrawal amount" />
      <Field label={`Amount (${withdrawalCurrency || 'currency unavailable'})`} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      <Section title="Verified destination account" />
      {verifiedAccounts.map((account, index) => {
        const key = bankKey(account);
        const selected = bankKey(selectedBank ?? {}) === key;
        return <Pressable key={key || String(index)} accessibilityRole="button" accessibilityState={{ selected }} testID={`withdraw-bank-${index}`} onPress={() => setSelectedBankKey(key)} style={{ paddingVertical: 11, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: '700' }}>{first(account, ['bank_name'])}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(account, ['account_holder', 'account_title'])} · {maskAccount(account)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>{selected ? 'SELECTED' : 'VERIFIED'}</Text>
          </View>
        </Pressable>;
      })}
      {selectedBank ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 9 }}>
        <DetailRow label="Destination" value={`${first(selectedBank, ['bank_name'])} · ${first(selectedBank, ['account_holder', 'account_title'])} · ${maskAccount(selectedBank)}`} />
      </View> : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
        <View style={{ flex: 1 }}><Field label="Email verification code" value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="numeric" autoCapitalize="none" /></View>
        <View style={{ marginBottom: 14 }}><Action title="Send code" secondary loading={sendOtp.isPending} disabled={!selectedBank} onPress={() => void requestOtp()} /></View>
      </View>
      <Field label="Transaction password" value={transactionPassword} onChangeText={setTransactionPassword} placeholder="Transaction password" secureTextEntry autoCapitalize="none" />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      {notice ? <Text style={{ color: colors.primary, lineHeight: 19, marginBottom: 12 }}>{notice}</Text> : null}
      <Action title="Review withdrawal" icon="arrow-right" disabled={!amount || !otp || !transactionPassword || !selectedBank || availableBalance == null} onPress={review} />
    </Card> : null}

    {stage === 'review' && selectedBank ? <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 17 }}>Confirm withdrawal</Text>
      <DetailRow label="Amount" value={withdrawalCurrency ? money(Number(amount), withdrawalCurrency) : 'Currency unavailable'} />
      <DetailRow label="Fees" value={fee != null && withdrawalCurrency ? money(fee, withdrawalCurrency) : 'Not provided by OG Exports'} />
      <DetailRow label="Estimated processing time" value={processingTime || 'Not provided by OG Exports'} />
      <DetailRow label="Destination account" value={`${first(selectedBank, ['bank_name'])} · ${first(selectedBank, ['account_holder', 'account_title'])} · ${maskAccount(selectedBank)}`} />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 9, marginBottom: 13 }}>The email code and transaction password will be verified by OG Exports when you submit. Fee and processing estimates are shown only when the server supplies them.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit withdrawal request" icon="lock" loading={create.isPending} onPress={() => void submit()} />
      <View style={{ marginTop: 10 }}><Action title="Edit withdrawal" secondary onPress={() => { setError(''); setStage('form'); }} /></View>
    </Card> : null}

    {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Withdrawal request submitted</Text>
      {notice ? <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>{notice}</Text> : null}
      <DetailRow label="Server status" value={first(confirmation, ['status'], 'Not provided')} />
      <DetailRow label="Reference" value={first(confirmation, ['reference', 'withdraw_id'])} />
      {readAmount(confirmation, ['amount']) != null && withdrawalCurrency ? <DetailRow label="Requested amount" value={money(readAmount(confirmation, ['amount']), withdrawalCurrency)} /> : null}
      {readAmount(confirmation, ['fee', 'fees', 'transaction_fee']) != null && withdrawalCurrency ? <DetailRow label="Fee" value={money(readAmount(confirmation, ['fee', 'fees', 'transaction_fee']), withdrawalCurrency)} /> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8 }}>A submitted withdrawal is not yet completed. Check the server status in your withdrawal history.</Text>
      <WithdrawalProgress withdrawal={confirmation} />
      <View style={{ marginTop: 14 }}><Action title="Request another withdrawal" secondary onPress={() => { setConfirmation(null); setSelectedWithdrawalId(''); setNotice(''); setError(''); setStage('form'); }} /></View>
    </Card> : null}

    <Section title="Recent withdrawals" right={<Pressable accessibilityRole="button" accessibilityLabel="Refresh withdrawal history" onPress={() => {
      void historyQuery.refetch();
      void walletQuery.refetch();
    }} style={{ width: 38, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 18 }}>↻</Text>
    </Pressable>} />
    {historyQuery.isError ? <ErrorState message="Withdrawal history could not be loaded." onRetry={() => void historyQuery.refetch()} /> : null}
    {historyQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading withdrawal history…</Text></Card> : null}
    {!historyQuery.isLoading && !historyQuery.isError && withdrawals.length === 0 ? <EmptyState title="No withdrawals yet" body="Your payout requests will appear here with their review status." /> : null}
    {withdrawals.map((item, index) => {
      const id = first(item, ['id', 'reference', 'withdraw_id'], String(index));
      const selected = id === selectedWithdrawalId;
      return <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => {
        setSelectedWithdrawalId(selected ? '' : id);
        if (!selected) {
          setConfirmation(null);
          setStage('form');
        }
      }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderColor: selected ? colors.primary : colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'withdraw_id'], 'Withdrawal request')}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{first(item, ['amount'], '—')} {first(item, ['currency'], withdrawalCurrency)} · {first(item, ['created_at', 'date'], 'Date not provided')}</Text>
          </View>
          <Status value={first(item, ['status'], 'Not provided')} />
        </Card>
      </Pressable>;
    })}
    {progressWithdrawal && stage !== 'submitted' ? <WithdrawalProgress withdrawal={progressWithdrawal} /> : null}
  </Screen>;
}