import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvestorWithdrawal,
  useGetInvestorDashboard,
  useGetInvestorProfile,
  useGetInvestorWallet,
  useGetInvestorWithdrawals,
  useSendInvestorWithdrawalOtp,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status, SuccessFeedback, SuccessMark } from '@/components/InvestorUI';
import { formatUiStatus } from '@/lib/strings';
import { TransactionPasswordResetModal } from '@/components/TransactionPasswordResetModal';
import { amount as readAmount, availableBalanceFromDashboard, first, list, messageOf, money, moneyInSourceCurrency, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { buildWithdrawalRequest, maximumWithdrawalPayout, parseWithdrawalAmount, resolveWithdrawalDisplayTerms } from '@/lib/withdrawal-flow';
import { motionHaptic } from '@/lib/motion';

const withdrawalPurposes = ['Profit Withdrawal', 'Principal Return', 'Business Expense', 'Personal Use'] as const;

type WithdrawalBankDetails = {
  bank_name: string;
  account_holder: string;
  account_number: string;
  iban: string;
  swift: string;
  branch: string;
};

function normalizeWithdrawalBank(value: Record<string, unknown>): WithdrawalBankDetails {
  return {
    bank_name: first(value, ['bank_name', 'bank']),
    account_holder: first(value, ['account_holder', 'account_title']),
    account_number: first(value, ['account_number']),
    iban: first(value, ['iban']),
    swift: first(value, ['swift', 'swift_code', 'bic']),
    branch: first(value, ['branch', 'branch_name']),
  };
}

function hasUsableWithdrawalBank(value: WithdrawalBankDetails) {
  return Boolean(value.bank_name && value.account_holder && value.account_number);
}

function savedWithdrawalBank(profile: Record<string, unknown>): WithdrawalBankDetails | null {
  const accounts = list(profile.bank_accounts).map(account => record(account));
  const isDefault = (account: Record<string, unknown>) => {
    const flag = first(account, ['is_default', 'default']).toLowerCase();
    return flag === 'true' || flag === '1';
  };
  const candidates = [
    record(profile.default_bank_account),
    accounts.find(isDefault) ?? {},
    record(profile.withdraw_bank),
    ...accounts,
  ];
  for (const candidate of candidates) {
    const bank = normalizeWithdrawalBank(candidate);
    if (hasUsableWithdrawalBank(bank)) return bank;
  }
  return null;
}

function WithdrawalProgress({ withdrawal }: { withdrawal: Record<string, unknown> }) {
  const colors = useColors();
  const rawStatus = first(withdrawal, ['status', 'withdrawal_status'], 'Not provided');
  const explanation = first(withdrawal, ['status_message', 'status_description', 'progress_note']);

  return <Card style={{ marginTop: 12 }}>
    <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Withdrawal tracking</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 13 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Current status</Text>
      <Status value={rawStatus} />
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 12 }}>
      {explanation || 'Withdrawal history shows updates returned by OG Exports.'}
    </Text>
  </Card>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 0.9 }}>{label}</Text>
    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1.1 }}>{value || '—'}</Text>
  </View>;
}

function CheckRow({ checked, disabled, title, detail, onPress, testID }: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  detail?: string;
  onPress: () => void;
  testID?: string;
}) {
  const colors = useColors();
  return <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked, disabled }}
    testID={testID}
    disabled={disabled}
    onPress={onPress}
    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11, opacity: disabled ? 0.55 : 1 }}
  >
    <View style={{
      width: 21,
      height: 21,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: checked ? colors.primary : colors.border,
      backgroundColor: checked ? colors.primary : colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    }}>
      {checked ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600' }}>{title}</Text>
      {detail ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{detail}</Text> : null}
    </View>
  </Pressable>;
}

function TransactionPasswordEntryField({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <Field
    label="Transaction password"
    value={value}
    onChangeText={next => {
      setValue(next);
      onValueChange(next);
    }}
    placeholder="Transaction password"
    secureTextEntry
    autoCapitalize="none"
  />;
}

export default function Withdraw() {
  const { token } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: Boolean(token), refetchOnMount: 'always' } });
  const dashboardQuery = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: Boolean(token), staleTime: 30_000, refetchOnMount: 'always' } });
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: Boolean(token), refetchOnMount: 'always' } });
  const historyQuery = useGetInvestorWithdrawals({}, { query: { queryKey: ['investor-withdrawals'], enabled: Boolean(token), refetchOnMount: 'always' } });
  const create = useCreateInvestorWithdrawal();
  const sendOtp = useSendInvestorWithdrawalOtp();
  const wallet = unwrap(walletQuery.data);
  const dashboard = unwrap(dashboardQuery.data);
  const profile = unwrap(profileQuery.data);
  const dashboardWallet = record(dashboard.wallet);
  const walletCurrency = first(
    dashboard,
    ['currency', 'wallet_currency'],
    first(dashboardWallet, ['currency', 'default_currency'], first(wallet, ['currency', 'default_currency'])),
  ).toUpperCase();
  const availableBalance = availableBalanceFromDashboard(dashboardQuery.data);
  const pendingBalance = readAmount(wallet, ['pending_balance']);
  const savedBankDetails = useMemo(() => savedWithdrawalBank(profile), [profile]);
  const withdrawals = list(historyQuery.data);
  const withdrawalTerms = resolveWithdrawalDisplayTerms({
    apiFee: readAmount(dashboard, ['withdrawal_fee', 'transaction_fee', 'fee'])
      ?? readAmount(wallet, ['withdrawal_fee', 'transaction_fee', 'fee']),
    apiFeeUsd: readAmount(dashboard, ['withdrawal_fee_usd'])
      ?? readAmount(wallet, ['withdrawal_fee_usd']),
    apiFeeCurrency: first(dashboard, ['withdrawal_fee_currency'],
      first(wallet, ['withdrawal_fee_currency'])),
    apiProcessingTime: first(dashboard, ['estimated_processing_time', 'processing_time'],
      first(wallet, ['estimated_processing_time', 'processing_time'])),
    apiMinimumWithdrawal: readAmount(dashboard, ['minimum_withdrawal_amount'])
      ?? readAmount(wallet, ['minimum_withdrawal_amount']),
    apiMinimumWithdrawalUsd: readAmount(dashboard, ['minimum_withdrawal_usd'])
      ?? readAmount(wallet, ['minimum_withdrawal_usd']),
    apiMinimumWithdrawalCurrency: first(dashboard, ['minimum_withdrawal_currency'],
      first(wallet, ['minimum_withdrawal_currency'])),
    walletCurrency,
  });
  const {
    fee,
    feeUsd,
    feeCurrency,
    processingTime,
    minimumWithdrawalUsd,
    minimumWithdrawalAmount,
    minimumWithdrawalCurrency,
  } = withdrawalTerms;
  const taxTreatment = first(dashboard, ['tax_treatment', 'tax_status'],
    first(wallet, ['tax_treatment', 'tax_status']));
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [branch, setBranch] = useState('');
  const [autoFillBank, setAutoFillBank] = useState(false);
  const [saveBankDetails, setSaveBankDetails] = useState(true);
  const [bankDetailsTouched, setBankDetailsTouched] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const transactionPasswordRef = useRef('');
  const [hasTransactionPasswordInput, setHasTransactionPasswordInput] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState<'overview' | 'form' | 'security' | 'submitted'>('overview');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const [successFeedbackVisible, setSuccessFeedbackVisible] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState('');
  const withdrawalCurrency = walletCurrency;
  const maxPayout = maximumWithdrawalPayout(availableBalance, fee);
  const minimumPayoutForValidation = minimumWithdrawalAmount
    ?? (withdrawalCurrency === 'USD' ? minimumWithdrawalUsd : 0.01);
  const amountNumber = parseWithdrawalAmount(
    amount,
    availableBalance,
    fee ?? 0,
    minimumPayoutForValidation,
  );
  const enteredAmount = Number(amount);
  const amountBelowMinimum = amount.trim() !== ''
    && Number.isFinite(enteredAmount)
    && minimumWithdrawalAmount != null
    && Math.round(enteredAmount * 100) < Math.round(minimumWithdrawalAmount * 100);
  const historySelection = withdrawals.find(item => first(item, ['id', 'reference', 'withdraw_id']) === selectedWithdrawalId);
  const progressWithdrawal = confirmation ?? (historySelection ? record(historySelection) : null);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (stage !== 'form' || profileQuery.isLoading || bankDetailsTouched || !savedBankDetails) return;
    setAutoFillBank(true);
    setBankName(savedBankDetails.bank_name);
    setAccountHolder(savedBankDetails.account_holder);
    setAccountNumber(savedBankDetails.account_number);
    setIban(savedBankDetails.iban);
    setSwift(savedBankDetails.swift);
    setBranch(savedBankDetails.branch);
  }, [stage, profileQuery.isLoading, savedBankDetails, bankDetailsTouched]);

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
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function continueToSecurity() {
    setError('');
    setNotice('');
    if (dashboardQuery.isError || dashboardQuery.isFetching) {
      setError(dashboardQuery.isError
        ? 'Available balance could not be loaded. Retry before continuing.'
        : 'Please wait while the available balance is refreshed.');
      return;
    }
    if (amountNumber == null || !withdrawalCurrency) {
      setError('Enter a payout that meets the minimum shown above and fits the available balance after the fee.');
      return;
    }
    if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      setError('Complete the required bank name, account holder, and account number fields.');
      return;
    }
    if (otpCooldown > 0) {
      setStage('security');
      return;
    }
    await requestOtp();
  }

  function updateTransactionPassword(value: string) {
    transactionPasswordRef.current = value;
    setHasTransactionPasswordInput(value.length > 0);
    setError('');
  }

  async function submit() {
    setError('');
    setNotice('');
    if (dashboardQuery.isError || dashboardQuery.isFetching) {
      setError(dashboardQuery.isError
        ? 'Available balance could not be loaded. Retry before continuing.'
        : 'Please wait while the available balance is refreshed.');
      return;
    }
    const validAmount = parseWithdrawalAmount(
      amount,
      availableBalance,
      fee ?? 0,
      minimumPayoutForValidation,
    );
    if (validAmount == null || !withdrawalCurrency || !bankName.trim() || !accountHolder.trim() || !accountNumber.trim()) {
      setError('Enter a payout that meets the minimum shown above and fits the available balance after the fee.');
      setStage('form');
      return;
    }
    if (otp.trim().length !== 6 || !transactionPasswordRef.current) {
      setError('Enter the emailed code and your transaction password.');
      return;
    }
    try {
      const response = record(await create.mutateAsync({
        data: buildWithdrawalRequest(validAmount, otp, transactionPasswordRef.current, {
          bank_name: bankName,
          account_holder: accountHolder,
          account_number: accountNumber,
          iban,
          swift,
          branch,
        }, saveBankDetails, purpose, withdrawalCurrency),
      }));
      const withdrawal = record(response.data);
      setConfirmation(withdrawal);
      setSuccessFeedbackVisible(true);
      setSelectedWithdrawalId(first(withdrawal, ['id', 'reference', 'withdraw_id']));
      setSubmittedAmount(validAmount);
      setNotice('Your withdrawal request has been received.');
      setStage('submitted');
      setOtp('');
      setOtpEmail('');
      setOtpCooldown(0);
      transactionPasswordRef.current = '';
      setHasTransactionPasswordInput(false);
      void historyQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-profile'] });
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
  }

  const withdrawalStatus = first(confirmation ?? {}, ['status', 'state', 'withdrawal_status']).trim();
  const normalizedWithdrawalStatus = withdrawalStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const withdrawalTransferConfirmed = ['settled', 'completed', 'paid', 'paid out', 'transferred'].includes(normalizedWithdrawalStatus);
  const withdrawalApproved = normalizedWithdrawalStatus === 'approved';
  const withdrawalNeedsAttention = ['rejected', 'declined', 'failed', 'error', 'cancelled', 'canceled'].includes(normalizedWithdrawalStatus);
  const successTitle = withdrawalTransferConfirmed
    ? 'Withdrawal completed'
    : withdrawalApproved
      ? 'Withdrawal approved'
      : withdrawalNeedsAttention
        ? 'Withdrawal status updated'
        : 'Withdrawal request received';
  const successBody = withdrawalTransferConfirmed
    ? 'This withdrawal is marked as completed in your OG Exports account. This does not verify receipt by your bank.'
    : withdrawalApproved
      ? 'Your withdrawal has been approved. Approval does not confirm that funds have reached your bank account.'
      : withdrawalNeedsAttention
        ? 'The withdrawal request needs attention. Review the current status and any note in your withdrawal history.'
      : 'Your withdrawal request is under review. A submitted request does not confirm that funds have reached your bank account.';

  return <Screen title="Withdraw" subtitle="Request a payout from your OG Exports wallet">
    {dashboardQuery.isError && availableBalance == null
      ? <ErrorState message="Withdrawable balance could not be loaded." error={dashboardQuery.error} onRetry={() => { void walletQuery.refetch(); void dashboardQuery.refetch(); }} />
      : null}
    {!dashboardQuery.isLoading && !dashboardQuery.isError && availableBalance == null
      ? <ErrorState message="Available balance was not returned by OG Exports." onRetry={() => void dashboardQuery.refetch()} />
      : null}
    {stage === 'overview' ? <>
      {dashboardQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading available balance…</Text></Card> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1, borderTopWidth: 3, borderTopColor: colors.border }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '600' }}>Available balance</Text>
          <Text style={{ color: colors.foreground, fontSize: 19, fontWeight: '700', marginTop: 7 }}>
            {availableBalance == null ? 'Unavailable' : money(availableBalance, withdrawalCurrency || 'USD')}
          </Text>
        </Card>
        <Card style={{ flex: 1, borderTopWidth: 3, borderTopColor: colors.primary }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '600' }}>Withdrawable balance</Text>
          <Text style={{ color: colors.primary, fontSize: 19, fontWeight: '700', marginTop: 7 }}>
            {availableBalance == null ? 'Unavailable' : money(availableBalance, withdrawalCurrency || 'USD')}
          </Text>
        </Card>
      </View>
      <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 3 }}>Withdrawal limits</Text>
        <DetailRow label="Minimum withdrawal" value={moneyInSourceCurrency(minimumWithdrawalUsd, 'USD')} />
        {minimumWithdrawalAmount != null && minimumWithdrawalCurrency !== 'USD'
          ? <DetailRow label="Minimum in wallet currency" value={moneyInSourceCurrency(minimumWithdrawalAmount, minimumWithdrawalCurrency)} />
          : null}
      </Card>
      {availableBalance != null && minimumWithdrawalAmount != null && availableBalance < minimumWithdrawalAmount
        ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17 }}>
            Available balance is below the minimum payout.
          </Text>
        : null}
      <Card testID="withdraw-processing-info">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="clock" size={15} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>Processing information</Text>
        </View>
        <DetailRow label="Processing time" value={processingTime || 'Not provided'} />
        <DetailRow label="Tax treatment" value={taxTreatment || 'Not specified'} />
        <DetailRow label="Wallet currency" value={withdrawalCurrency || 'Not provided'} />
      </Card>
      {pendingBalance != null && pendingBalance > 0 ? <Card>
        <DetailRow label="Pending withdrawals reserved" value={money(pendingBalance, withdrawalCurrency || 'USD')} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 6 }}>
          Pending requests are reserved funds, not completed wallet movements.
        </Text>
      </Card> : null}
      <Card>
        <Action
          title="Proceed to Withdraw"
          icon="arrow-right"
          onPress={() => { setError(''); setNotice(''); setBankDetailsTouched(false); setStage('form'); }}
        />
      </Card>
    </> : null}

    {stage === 'form' ? <Card>
      <Section title="Bank Details & Amount" />
      {profileQuery.isError ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginBottom: 8 }}>
        Saved bank details could not be loaded. You can still enter them below.
      </Text> : null}
      <CheckRow
        checked={autoFillBank}
        disabled={!savedBankDetails}
        title="Use saved default account"
        detail={savedBankDetails ? 'Details are filled from your investor profile and can be edited.' : 'No saved default account is available; enter the bank details manually.'}
        testID="withdraw-autofill-bank"
        onPress={() => {
          if (!savedBankDetails) return;
          const next = !autoFillBank;
          setAutoFillBank(next);
          if (next) {
            setBankDetailsTouched(false);
            setBankName(savedBankDetails.bank_name);
            setAccountHolder(savedBankDetails.account_holder);
            setAccountNumber(savedBankDetails.account_number);
            setIban(savedBankDetails.iban);
            setSwift(savedBankDetails.swift);
            setBranch(savedBankDetails.branch);
          }
        }}
      />
      <Field label="Withdrawal amount" value={amount} onChangeText={value => { setAmount(value); setError(''); }} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      <DetailRow label="Wallet currency" value={withdrawalCurrency || 'Not provided'} />
      <DetailRow label="Minimum withdrawal" value={moneyInSourceCurrency(minimumWithdrawalUsd, 'USD')} />
      {minimumWithdrawalAmount != null && minimumWithdrawalCurrency !== 'USD'
        ? <DetailRow label="Minimum in wallet currency" value={moneyInSourceCurrency(minimumWithdrawalAmount, minimumWithdrawalCurrency)} />
        : null}
      {amount.trim() && amountNumber == null ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 11, lineHeight: 16, marginTop: 3 }}>
        {amountBelowMinimum
          ? 'Payout must meet the minimum withdrawal shown above.'
          : 'Enter a valid payout amount that fits the available balance after the withdrawal fee.'}
      </Text> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4, marginBottom: 12 }}>
        <Text>Maximum payout after fee:</Text>
        <Text> {maxPayout == null ? 'Unavailable' : moneyInSourceCurrency(maxPayout, withdrawalCurrency || 'USD')}</Text>
      </Text>
      <DetailRow label="Withdrawal fee (USD)" value={feeUsd == null ? 'Unavailable' : moneyInSourceCurrency(feeUsd, 'USD')} />
      {fee != null && feeCurrency !== 'USD'
        ? <DetailRow label="Fee charged in wallet" value={moneyInSourceCurrency(fee, feeCurrency)} />
        : null}
      {amountNumber != null && fee != null
        ? <DetailRow label="Total wallet debit" value={moneyInSourceCurrency(amountNumber + fee, withdrawalCurrency || 'USD')} />
        : null}
      <Field label="Bank name *" value={bankName} onChangeText={value => { setBankDetailsTouched(true); setAutoFillBank(false); setBankName(value); setError(''); }} placeholder="Bank name" autoCapitalize="words" maxLength={255} />
      <Field label="Account holder *" value={accountHolder} onChangeText={value => { setBankDetailsTouched(true); setAutoFillBank(false); setAccountHolder(value); setError(''); }} placeholder="Account holder name" autoCapitalize="words" maxLength={255} />
      <Field label="Account number *" value={accountNumber} onChangeText={value => { setBankDetailsTouched(true); setAutoFillBank(false); setAccountNumber(value); setError(''); }} placeholder="Account number" keyboardType="default" autoCapitalize="none" maxLength={100} />
      <Field label="IBAN" value={iban} onChangeText={value => { setBankDetailsTouched(true); setAutoFillBank(false); setIban(value); setError(''); }} placeholder="IBAN" autoCapitalize="characters" maxLength={100} />
      <Field label="SWIFT / BIC" value={swift} onChangeText={value => { setBankDetailsTouched(true); setAutoFillBank(false); setSwift(value); setError(''); }} placeholder="SWIFT / BIC" autoCapitalize="characters" maxLength={50} />
      <Field label="Branch" value={branch} onChangeText={value => { setBankDetailsTouched(true); setAutoFillBank(false); setBranch(value); setError(''); }} placeholder="Branch" autoCapitalize="words" maxLength={255} />
      <CheckRow
        checked={saveBankDetails}
        title="Save bank details to my profile for future withdrawals"
        detail="OG Exports will receive your choice with this withdrawal request."
        testID="withdraw-save-bank-details"
        onPress={() => setSaveBankDetails(value => !value)}
      />
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
            disabled={dashboardQuery.isFetching || dashboardQuery.isError}
            onPress={() => void continueToSecurity()}
          />
        </View>
      </View>
    </Card> : null}

    {stage === 'security' ? <Card testID="withdraw-security-step">
      <Section title="Security verification" />
      <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginBottom: 14 }}>
        {otpEmail ? <><Text>Code sent to</Text><Text> {otpEmail}</Text></> : 'Enter the six-digit code sent to your registered email.'}
      </Text>
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>OTP verification</Text>
        <Field
          label="Six-digit email code"
          value={otp}
          onChangeText={value => { setOtp(value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          placeholder="000000"
          keyboardType="numeric"
          autoCapitalize="none"
          autoFocus
          maxLength={6}
        />
        <Action
          title="Resend verification code"
          secondary
          loading={sendOtp.isPending}
          disabled={otpCooldown > 0}
          onPress={() => void requestOtp()}
        />
        {otpCooldown > 0 ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 7 }}>
          <Text>Resend available in</Text><Text> {otpCooldown}s</Text>
        </Text> : null}
      </View>
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>Transaction password</Text>
        <TransactionPasswordEntryField onValueChange={updateTransactionPassword} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Forgot password?</Text>
          <Pressable accessibilityRole="button" onPress={() => setShowResetModal(true)}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Reset here</Text>
          </Pressable>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>or set one in</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account/settings' as never)}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Settings</Text>
          </Pressable>
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      {notice ? <Text style={{ color: colors.primary, lineHeight: 19, marginBottom: 12 }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 0.8 }}><Action title="Back" secondary disabled={create.isPending} onPress={() => {
          transactionPasswordRef.current = '';
          setHasTransactionPasswordInput(false);
          setError('');
          setStage('form');
        }} /></View>
        <View style={{ flex: 1.4 }}>
          <Action
            title="Verify & Continue"
            icon="arrow-right"
            loading={create.isPending}
            disabled={otp.length !== 6 || !hasTransactionPasswordInput}
            onPress={() => void submit()}
          />
        </View>
      </View>
    </Card> : null}

    {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }} testID="withdraw-submitted">
      <SuccessMark feedback="none" />
       <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginTop: 10 }}>Withdrawal request received</Text>
      <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>
         <Text>Current status:</Text><Text> {formatUiStatus(first(confirmation, ['status', 'state'], 'Not provided'))}.</Text>
      </Text>
      <DetailRow label="Reference" value={first(confirmation, ['withdraw_id', 'reference', 'id'], 'Not provided')} />
      <DetailRow
        label="Requested amount"
        value={moneyInSourceCurrency(readAmount(confirmation, ['amount']) ?? submittedAmount, first(confirmation, ['currency'], withdrawalCurrency || 'USD'))}
      />
      <DetailRow
        label="Withdrawal fee (USD)"
        value={readAmount(confirmation, ['fee_usd', 'withdrawal_fee_usd']) == null
          ? 'Not provided'
          : moneyInSourceCurrency(readAmount(confirmation, ['fee_usd', 'withdrawal_fee_usd']), 'USD')}
      />
      {readAmount(confirmation, ['fee']) != null && first(confirmation, ['currency'], withdrawalCurrency || 'USD') !== 'USD'
        ? <DetailRow label="Fee charged in wallet" value={moneyInSourceCurrency(readAmount(confirmation, ['fee']), first(confirmation, ['currency'], withdrawalCurrency || 'USD'))} />
        : null}
      <DetailRow
        label="Total wallet debit"
        value={readAmount(confirmation, ['total_debit']) == null
          ? 'Not provided'
          : moneyInSourceCurrency(readAmount(confirmation, ['total_debit']), first(confirmation, ['currency'], withdrawalCurrency || 'USD'))}
      />
      <DetailRow label="Processing time" value={first(confirmation, ['estimated_processing_time'], processingTime || 'Not provided')} />
      <WithdrawalProgress withdrawal={confirmation} />
      {notice ? <Text style={{ color: colors.primary, lineHeight: 19, marginTop: 10 }}>{notice}</Text> : null}
      <View style={{ marginTop: 14 }}><Action title="Request another withdrawal" secondary onPress={() => {
        setConfirmation(null);
        setSelectedWithdrawalId('');
        setNotice('');
        setError('');
        setAmount('');
        setBankDetailsTouched(false);
        setPurpose('');
        setOtp('');
        setOtpEmail('');
        transactionPasswordRef.current = '';
        setHasTransactionPasswordInput(false);
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
    {historyQuery.isError ? <ErrorState message="Withdrawal history could not be loaded." error={historyQuery.error} onRetry={() => void historyQuery.refetch()} /> : null}
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
          <Status value={first(item, ['status', 'state'], '—')} />
        </Card>
      </Pressable>;
    })}
    {progressWithdrawal && stage !== 'submitted' ? <WithdrawalProgress withdrawal={progressWithdrawal} /> : null}

    <TransactionPasswordResetModal
      visible={showResetModal}
      onClose={() => setShowResetModal(false)}
      onSuccess={() => setNotice('Transaction password updated. You can use it to confirm withdrawals.')}
    />
    <SuccessFeedback
      visible={successFeedbackVisible}
      title={successTitle}
      body={successBody}
      feedback={withdrawalTransferConfirmed ? 'success' : withdrawalApproved ? 'approved' : withdrawalNeedsAttention ? 'attention' : 'ack'}
      status={withdrawalStatus ? formatUiStatus(withdrawalStatus) : undefined}
      reference={first(confirmation ?? {}, ['reference', 'withdraw_id', 'id']) || undefined}
      onDismiss={() => setSuccessFeedbackVisible(false)}
      testID="withdraw-success-feedback"
    />
  </Screen>;
}
