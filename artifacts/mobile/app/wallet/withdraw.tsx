import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvestorWithdrawal,
  getGetInvestorBankAccountsQueryKey,
  useGetInvestorBankAccounts,
  useGetInvestorDashboard,
  useGetInvestorWallet,
  useGetInvestorWithdrawals,
  useSendInvestorWithdrawalOtp,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status, SuccessMark } from '@/components/InvestorUI';
import { amount as readAmount, availableBalanceFromDashboard, first, list, messageOf, money, moneyInSourceCurrency, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { buildWithdrawalRequest, parseWithdrawalAmount } from '@/lib/withdrawal-flow';

const withdrawalStages = ['Requested', 'Processing', 'Approved', 'Completed'] as const;
const finishedStatuses = new Set(['approved', 'completed']);
const processingStatuses = new Set(['pending', 'requested', 'processing', 'review', 'in review']);
const withdrawalPurposes = ['Profit Withdrawal', 'Principal Return', 'Business Expense', 'Personal Use'] as const;

function verifiedBankAccount(account: Record<string, unknown>) {
  const status = first(account, ['verification_status']).toLowerCase();
  const hasDestination = Boolean(
    bankKey(account)
    &&
    first(account, ['bank_name'])
    && first(account, ['account_holder', 'account_title'])
    && first(account, ['masked_account_identifier']),
  );
  return status === 'verified' && hasDestination;
}

function bankKey(account: Record<string, unknown>) {
  return first(account, ['id', 'account_id']);
}

function maskAccount(account: Record<string, unknown>) {
  return first(account, ['masked_account_identifier'], '—');
}

function WithdrawalProgress({ withdrawal }: { withdrawal: Record<string, unknown> }) {
  const colors = useColors();
  const rawStatus = first(withdrawal, ['status', 'withdrawal_status'], '—');
  const status = rawStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const finished = finishedStatuses.has(status);
  const processing = processingStatuses.has(status);
  const stopped = ['rejected', 'cancelled', 'canceled'].includes(status);
  const completedCount = finished ? 4 : stopped ? (status === 'rejected' ? 2 : 1) : processing ? 1 : status === 'submitted' ? 0 : 0;
  const activeIndex = finished || stopped ? -1 : processing ? 1 : status === 'submitted' ? 0 : -1;
  const explanation = rawStatus === '—'
    ? 'Withdrawal status details will appear here when available.'
    : finished
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
    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1.1 }}>{value || '—'}</Text>
  </View>;
}

export default function Withdraw() {
  const { token, appPinEnabled, biometricEnabled } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: Boolean(token), refetchOnMount: 'always' } });
  const dashboardQuery = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: Boolean(token), staleTime: 30_000, refetchOnMount: 'always' } });
  const bankAccountsQuery = useGetInvestorBankAccounts({
    query: { queryKey: getGetInvestorBankAccountsQueryKey(), enabled: Boolean(token), refetchOnMount: 'always' },
  });
  const historyQuery = useGetInvestorWithdrawals({}, { query: { queryKey: ['investor-withdrawals'], enabled: Boolean(token), refetchOnMount: 'always' } });
  const create = useCreateInvestorWithdrawal();
  const sendOtp = useSendInvestorWithdrawalOtp();
  const wallet = unwrap(walletQuery.data);
  const dashboard = unwrap(dashboardQuery.data);
  const dashboardWallet = record(dashboard.wallet);
  const explicitWithdrawableBalance = readAmount(record(wallet), ['withdrawable_balance']);
  const walletCurrency = first(
    dashboard,
    ['currency', 'wallet_currency'],
    first(dashboardWallet, ['currency', 'default_currency'], first(wallet, ['currency', 'default_currency'])),
  ).toUpperCase();
  const availableBalance = availableBalanceFromDashboard(dashboardQuery.data);
  const pendingBalance = readAmount(wallet, ['pending_balance']);
  const bankAccountData = unwrap(bankAccountsQuery.data);
  const bankAccounts = list(bankAccountData.bank_accounts);
  const verifiedAccounts = bankAccounts.filter(verifiedBankAccount);
  const defaultVerified = verifiedAccounts.find(account => first(account, ['is_default']).toLowerCase() === 'true')
    ?? verifiedAccounts[0];
  const [selectedBankKey, setSelectedBankKey] = useState('');
  const selectedBank = verifiedAccounts.find(account => bankKey(account) === selectedBankKey) ?? defaultVerified;
  const withdrawals = list(historyQuery.data);
  const fee = readAmount(selectedBank ?? {}, ['withdrawal_fee', 'transaction_fee', 'fee']);
  const processingTime = first(selectedBank ?? {}, ['estimated_processing_time', 'processing_time']);
  const deviceSecurityConfigured = appPinEnabled || biometricEnabled;
  const firstWithdrawalSecurityRequired = !deviceSecurityConfigured && withdrawals.length === 0;
  const firstWithdrawalHistoryPending = firstWithdrawalSecurityRequired && (historyQuery.isLoading || historyQuery.isFetching);
  const firstWithdrawalHistoryError = firstWithdrawalSecurityRequired && historyQuery.isError;
  const needsFirstWithdrawalSecuritySetup = firstWithdrawalSecurityRequired
    && !historyQuery.isLoading && !historyQuery.isFetching && !historyQuery.isError;
  const withdrawalFlowBlocked = firstWithdrawalSecurityRequired;
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [transactionPassword, setTransactionPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState<'overview' | 'form' | 'security' | 'review' | 'submitted'>('overview');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState('');
  const withdrawalCurrency = walletCurrency;
  const amountNumber = parseWithdrawalAmount(amount, availableBalance);
  const historySelection = withdrawals.find(item => first(item, ['id', 'reference', 'withdraw_id']) === selectedWithdrawalId);
  const progressWithdrawal = confirmation ?? (historySelection ? record(historySelection) : null);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  function canContinueWithdrawal() {
    if (!withdrawalFlowBlocked) return true;
    if (historyQuery.isLoading || historyQuery.isFetching) {
      setError('Checking withdrawal history. Wait before continuing.');
    } else if (historyQuery.isError) {
      setError('Withdrawal history could not be confirmed. Retry before continuing.');
    } else {
      setError('Set up device security before your first withdrawal.');
    }
    return false;
  }

  async function requestOtp() {
    setError('');
    setNotice('');
    try {
      const result = record(await sendOtp.mutateAsync());
      const data = record(result.data);
      setOtpEmail(first(data, ['email']));
      setOtpCooldown(60);
      setOtp('');
      setNotice(first(result, ['message'], 'Verification code requested. Check the email registered to your account.'));
      setStage('security');
    } catch (err) { setError(messageOf(err)); }
  }

  async function continueToSecurity() {
    setError('');
    setNotice('');
    if (!canContinueWithdrawal()) return;
    if (dashboardQuery.isError || dashboardQuery.isFetching) {
      setError(dashboardQuery.isError
        ? 'Available balance could not be loaded. Retry before continuing.'
        : 'Please wait while the available balance is refreshed.');
      return;
    }
    if (amountNumber == null || !withdrawalCurrency) {
      setError('Enter a valid amount within the withdrawable balance reported by OG Exports.');
      return;
    }
    if (!selectedBank || !bankKey(selectedBank)) {
      setError('Select a bank account that OG Exports has marked as verified.');
      return;
    }
    if (otpCooldown > 0) {
      setStage('security');
      return;
    }
    await requestOtp();
  }

  function review() {
    setError('');
    setNotice('');
    if (!canContinueWithdrawal()) return;
    if (dashboardQuery.isError || dashboardQuery.isFetching) {
      setError(dashboardQuery.isError
        ? 'Available balance could not be loaded. Retry before continuing.'
        : 'Please wait while the available balance is refreshed.');
      return;
    }
    if (amountNumber == null || !withdrawalCurrency) {
      setError('Enter a valid amount within the withdrawable balance reported by OG Exports.');
      return;
    }
    if (!selectedBank || !bankKey(selectedBank)) {
      setError('Select a bank account that OG Exports has marked as verified.');
      return;
    }
    if (otp.trim().length !== 6 || !transactionPassword) {
      setError('Enter the emailed code and your transaction password.');
      return;
    }
    setStage('review');
  }

  async function submit() {
    setError('');
    setNotice('');
    if (!canContinueWithdrawal()) {
      setStage('form');
      return;
    }
    const validAmount = parseWithdrawalAmount(amount, availableBalance);
    if (validAmount == null || !selectedBank || !bankKey(selectedBank)) {
      setError('The amount or verified destination account is no longer available. Review the withdrawal details.');
      setStage('form');
      return;
    }
    try {
      const response = record(await create.mutateAsync({
        data: buildWithdrawalRequest(validAmount, otp, transactionPassword, bankKey(selectedBank), purpose),
      }));
      const withdrawal = record(response.data);
      setConfirmation(withdrawal);
      setSelectedWithdrawalId(first(withdrawal, ['id', 'reference', 'withdraw_id']));
      setNotice(first(response, ['message'], 'Withdrawal request received from OG Exports.'));
      setStage('submitted');
      setAmount('');
      setPurpose('');
      setOtp('');
      setOtpEmail('');
      setOtpCooldown(0);
      setTransactionPassword('');
      void historyQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] });
    } catch (err) { setError(messageOf(err)); }
  }

  return <Screen title="Withdraw" subtitle="Request a payout from your OG Exports wallet">
    {dashboardQuery.isError && availableBalance == null
      ? <ErrorState message="Withdrawable balance could not be loaded." error={dashboardQuery.error} onRetry={() => { void walletQuery.refetch(); void dashboardQuery.refetch(); }} />
      : null}
    {!dashboardQuery.isLoading && !dashboardQuery.isError && availableBalance == null
      ? <ErrorState message="Available balance was not returned by OG Exports." onRetry={() => void dashboardQuery.refetch()} />
      : null}
    {bankAccountsQuery.isError ? <ErrorState message="Bank account details could not be loaded." error={bankAccountsQuery.error} onRetry={() => void bankAccountsQuery.refetch()} /> : null}
    <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>WITHDRAWABLE BALANCE</Text>
      <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: '700', marginTop: 7 }}>
        {availableBalance == null
          ? walletQuery.isLoading || dashboardQuery.isLoading ? 'Loading…' : 'Unavailable'
          : money(availableBalance, withdrawalCurrency || 'USD')}
      </Text>
      {explicitWithdrawableBalance == null && availableBalance != null
        ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 6 }}>OG Exports does not return a separate withdrawable total; requests are reserved from the reported available balance.</Text>
        : null}
    </Card>

    {bankAccountsQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading saved bank accounts…</Text></Card> : null}
    {!bankAccountsQuery.isLoading && !bankAccountsQuery.isError && verifiedAccounts.length === 0
      ? <EmptyState title="No verified bank account available" body="OG Exports has not returned a verified payout account. Add and verify a bank account with OG Exports before requesting a withdrawal." />
      : null}

    {firstWithdrawalHistoryPending ? <Card>
      <View testID="withdraw-security-history-loading">
      <Text style={{ color: colors.mutedForeground, lineHeight: 19 }}>Checking withdrawal history to confirm whether device security setup is needed…</Text>
      </View>
    </Card> : null}
    {firstWithdrawalHistoryError ? <ErrorState message="Your withdrawal history could not be checked. Retry before continuing." onRetry={() => void historyQuery.refetch()} error={historyQuery.error} /> : null}
    {needsFirstWithdrawalSecuritySetup ? <Card>
      <View testID="withdraw-first-time-security-setup">
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 17 }}>Set up device security before your first withdrawal</Text>
      <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7, marginBottom: 13 }}>
        Set an app PIN or enable device biometrics in Account security. This setup is only required before your first withdrawal.
      </Text>
      <Action title="Set up device security" icon="shield" onPress={() => router.push('/account/security')} testID="withdraw-first-time-security-action" />
      </View>
    </Card> : null}

    {stage === 'overview' && !withdrawalFlowBlocked ? <>
      {dashboardQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading available balance…</Text></Card> : null}
      <Card>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>Available balance</Text>
        <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: '700', marginTop: 7 }}>
          {availableBalance == null ? 'Unavailable' : money(availableBalance, withdrawalCurrency || 'USD')}
        </Text>
        <View style={{ marginTop: 10 }}>
          <DetailRow label="Minimum withdrawal" value={moneyInSourceCurrency(1, withdrawalCurrency || 'USD')} />
          <DetailRow label="Maximum withdrawal" value={availableBalance == null ? 'Unavailable' : moneyInSourceCurrency(availableBalance, withdrawalCurrency || 'USD')} />
          <DetailRow label="Wallet currency" value={withdrawalCurrency || 'Not returned by OG Exports'} />
        </View>
      </Card>
      <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 4 }}>Processing information</Text>
        <DetailRow label="Processing time" value={processingTime || 'Not returned by OG Exports'} />
        <DetailRow label="Withdrawal fees" value={fee == null ? 'Not returned by OG Exports' : moneyInSourceCurrency(fee, withdrawalCurrency || 'USD')} />
        <DetailRow label="Tax treatment" value="Not returned by OG Exports" />
      </Card>
      {pendingBalance != null && pendingBalance > 0 ? <Card>
        <DetailRow label="Pending withdrawals reserved" value={money(pendingBalance, withdrawalCurrency || 'USD')} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 6 }}>
          Pending requests are reserved funds, not completed wallet movements.
        </Text>
      </Card> : null}
      {verifiedAccounts.length === 0 && !bankAccountsQuery.isLoading && !bankAccountsQuery.isError ? <Card>
        <EmptyState title="No verified bank account available" body="OG Exports has not returned a verified payout account. Add and verify a bank account with OG Exports before requesting a withdrawal." />
        <View style={{ marginTop: 12 }}>
          <Action title="Manage bank accounts & verification" icon="credit-card" secondary onPress={() => router.push('/account/bank-accounts' as never)} />
        </View>
      </Card> : null}
      <Card>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>
          Only the available balance returned by OG Exports can be requested. Locked and pending amounts are not included.
        </Text>
        <Action
          title="Proceed to Withdraw"
          icon="arrow-right"
          disabled={dashboardQuery.isLoading || dashboardQuery.isFetching || dashboardQuery.isError || availableBalance == null || availableBalance < 1 || !withdrawalCurrency || bankAccountsQuery.isLoading || bankAccountsQuery.isError || verifiedAccounts.length === 0}
          onPress={() => { setError(''); setNotice(''); setStage('form'); }}
        />
      </Card>
    </> : null}

    {stage === 'form' && !withdrawalFlowBlocked ? <Card>
      <Section title="Withdrawal amount" />
      <Field label="Withdrawal amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      <DetailRow label="Wallet currency" value={withdrawalCurrency || 'Not returned by OG Exports'} />
      {amount.trim() && amountNumber == null ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
        Enter a valid amount within the withdrawable balance reported by OG Exports.
      </Text> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4, marginBottom: 12 }}>
        <Text>Maximum request:</Text>
        <Text> {availableBalance == null ? 'Unavailable' : moneyInSourceCurrency(availableBalance, withdrawalCurrency || 'USD')}</Text>
      </Text>
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
      <Section title="Withdrawal purpose (optional)" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {withdrawalPurposes.map(option => {
          const selected = purpose === option;
          return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected }} testID={`withdraw-purpose-${option.toLowerCase().replaceAll(' ', '-')}`} onPress={() => setPurpose(selected ? '' : option)} style={{
            paddingVertical: 8,
            paddingHorizontal: 11,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.lightGreen : colors.card,
          }}>
            <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 11, fontWeight: selected ? '700' : '500' }}>{option}</Text>
          </Pressable>;
        })}
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      {notice ? <Text style={{ color: colors.primary, lineHeight: 19, marginBottom: 12 }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 0.8 }}><Action title="Back" secondary onPress={() => { setError(''); setStage('overview'); }} /></View>
        <View style={{ flex: 1.4 }}>
          <Action
            title="Continue to Security"
            icon="arrow-right"
            loading={sendOtp.isPending}
            disabled={amountNumber == null || !selectedBank || dashboardQuery.isFetching || dashboardQuery.isError}
            onPress={() => void continueToSecurity()}
          />
        </View>
      </View>
    </Card> : null}

    {stage === 'security' && !withdrawalFlowBlocked ? <Card>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: 5 }}>Security verification</Text>
      <Text style={{ color: colors.mutedForeground, lineHeight: 18, marginBottom: 12 }}>
        {otpEmail ? <><Text>Code sent to</Text><Text> {otpEmail}</Text></> : 'Enter the six-digit code sent to your registered email.'}
      </Text>
      <Field label="Six-digit email code" value={otp} onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="numeric" autoCapitalize="none" />
      <Action
        title="Resend verification code"
        secondary
        loading={sendOtp.isPending}
        disabled={otpCooldown > 0}
        onPress={() => void requestOtp()}
      />
      {otpCooldown > 0 ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 7, marginBottom: 12 }}>
        <Text>Resend available in</Text>
        <Text> {otpCooldown}s</Text>
      </Text> : <View style={{ height: 12 }} />}
      <Field label="Transaction password" value={transactionPassword} onChangeText={setTransactionPassword} placeholder="Transaction password" secureTextEntry autoCapitalize="none" />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>
        Forgot or need to set your transaction password? Manage it in account settings.
      </Text>
      <Action title="Manage transaction password" icon="key" secondary onPress={() => router.push('/account/settings' as never)} />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 12 }}>{error}</Text> : null}
      {notice ? <Text style={{ color: colors.primary, lineHeight: 19, marginTop: 10 }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 0.8 }}><Action title="Back" secondary onPress={() => { setError(''); setStage('form'); }} /></View>
        <View style={{ flex: 1.4 }}>
          <Action title="Review withdrawal" icon="arrow-right" disabled={otp.length !== 6 || !transactionPassword} onPress={review} />
        </View>
      </View>
    </Card> : null}

    {stage === 'review' && selectedBank && !withdrawalFlowBlocked ? <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 17 }}>Confirm withdrawal</Text>
      <DetailRow label="Amount" value={amountNumber == null ? 'Unavailable' : moneyInSourceCurrency(amountNumber, withdrawalCurrency || 'USD')} />
      <DetailRow label="Fees" value={fee == null ? 'Not returned by OG Exports' : moneyInSourceCurrency(fee, withdrawalCurrency || 'USD')} />
      <DetailRow label="Estimated processing time" value={processingTime || 'Not returned by OG Exports'} />
      <DetailRow label="Destination account" value={`${first(selectedBank, ['bank_name'])} · ${first(selectedBank, ['account_holder', 'account_title'])} · ${maskAccount(selectedBank)}`} />
      {purpose ? <DetailRow label="Purpose" value={purpose} /> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 9, marginBottom: 13 }}>The email code and transaction password will be verified by OG Exports when you submit. Fee and processing estimates are shown only when the server supplies them.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit withdrawal request" icon="lock" loading={create.isPending} onPress={() => void submit()} />
      <View style={{ marginTop: 10 }}><Action title="Edit withdrawal" secondary onPress={() => { setError(''); setStage('form'); }} /></View>
      <View style={{ marginTop: 10 }}><Action title="Back to verification" secondary onPress={() => { setError(''); setStage('security'); }} /></View>
    </Card> : null}

    {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
      <SuccessMark />
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Withdrawal request submitted</Text>
      {notice ? <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>{notice}</Text> : null}
      <DetailRow label="Server status" value={first(confirmation, ['status'], '—')} />
      <DetailRow label="Reference" value={first(confirmation, ['reference', 'withdraw_id'])} />
      <DetailRow label="Requested amount" value={moneyInSourceCurrency(readAmount(confirmation, ['amount']), withdrawalCurrency || 'USD')} />
      <DetailRow
        label="Fee"
        value={readAmount(confirmation, ['fee', 'fees', 'transaction_fee']) == null
          ? 'Not returned by OG Exports'
          : moneyInSourceCurrency(readAmount(confirmation, ['fee', 'fees', 'transaction_fee']), withdrawalCurrency || 'USD')}
      />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8 }}>A submitted withdrawal is not yet completed. Check the server status in your withdrawal history.</Text>
      <WithdrawalProgress withdrawal={confirmation} />
      <View style={{ marginTop: 14 }}><Action title="Request another withdrawal" secondary onPress={() => {
        setConfirmation(null);
        setSelectedWithdrawalId('');
        setNotice('');
        setError('');
        setAmount('');
        setPurpose('');
        setOtp('');
        setOtpEmail('');
        setTransactionPassword('');
        setStage('overview');
      }} /></View>
    </Card> : null}

    <Section title="Recent withdrawals" right={<Pressable accessibilityRole="button" accessibilityLabel="Refresh withdrawal history" onPress={() => {
      void historyQuery.refetch();
      void walletQuery.refetch();
      void dashboardQuery.refetch();
    }} style={{ width: 38, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 18 }}>↻</Text>
    </Pressable>} />
    {historyQuery.isError && !firstWithdrawalHistoryError ? <ErrorState message="Withdrawal history could not be loaded." error={historyQuery.error} onRetry={() => void historyQuery.refetch()} /> : null}
    {historyQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading withdrawal history…</Text></Card> : null}
    {!historyQuery.isLoading && !historyQuery.isError && withdrawals.length === 0 ? <EmptyState title="No withdrawals yet" body="Your payout requests will appear here with their review status." /> : null}
    {withdrawals.map((item, index) => {
      const id = first(item, ['id', 'reference', 'withdraw_id'], String(index));
      const selected = id === selectedWithdrawalId;
      return <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => {
        setSelectedWithdrawalId(selected ? '' : id);
        if (!selected) {
          setConfirmation(null);
          setStage('overview');
        }
      }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderColor: selected ? colors.primary : colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'withdraw_id'], 'Withdrawal request')}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{moneyInSourceCurrency(readAmount(item, ['amount']), first(item, ['currency'], withdrawalCurrency || 'USD'))} · {first(item, ['created_at', 'date'], '—')}</Text>
          </View>
          <Status value={first(item, ['status'], '—')} />
        </Card>
      </Pressable>;
    })}
    {progressWithdrawal && stage !== 'submitted' ? <WithdrawalProgress withdrawal={progressWithdrawal} /> : null}
  </Screen>;
}
