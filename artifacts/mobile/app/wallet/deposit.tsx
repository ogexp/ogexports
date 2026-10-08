import React, { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, View, Platform } from 'react-native';
import { LocalizedPressable, LocalizedText as Text } from '@/components/LocalizedText';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvestorDeposit,
  useGetInvestorDepositOptions,
  useGetInvestorDeposits,
  useGetInvestorPaymentBankAccounts,
  useGetInvestorDashboard,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status, SuccessFeedback, SuccessMark } from '@/components/InvestorUI';
import { formatUiStatus } from '@/lib/strings';
import { amount as readAmount, first, list, messageOf, money, moneyInSourceCurrency, moneyWithDisplayCurrencyAndSource, record, unwrap, walletCurrencyFromDashboard } from '@/lib/data';
import { DEPOSIT_PAYMENT_METHODS, type DepositPaymentMethodId } from '@/lib/deposit-methods';
import { uploadInvestorFile } from '@/lib/file-upload';
import { INVESTOR_DOCUMENT_MIME_TYPES } from '@/lib/upload-rules';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { motionHaptic } from '@/lib/motion';
import { createTransactionReceipt, saveTransactionReceipt } from '@/lib/transaction-receipt';

const depositStages = ['Submitted', 'Under Review', 'Verified', 'Credited'] as const;
const verificationStatuses = new Set(['approved', 'verified']);
const walletCreditStatuses = new Set(['credited', 'completed', 'settled']);
const reviewStatuses = new Set(['pending', 'under review', 'review', 'in review', 'pending verification']);

function isEnabled(value: string) {
  return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
}

function DepositProgress({ deposit }: { deposit: Record<string, unknown> }) {
  const colors = useColors();
  const rawStatus = first(deposit, ['review_status', 'status'], '—');
  const status = rawStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const walletCredited = walletCreditStatuses.has(status);
  const verificationComplete = verificationStatuses.has(status) || walletCredited;
  const inReview = reviewStatuses.has(status);
  const stopped = ['rejected', 'declined', 'failed', 'error', 'cancelled', 'canceled'].includes(status);
  const completeCount = walletCredited ? 4 : verificationComplete ? 3 : stopped ? (status === 'rejected' ? 2 : 1) : inReview ? 1 : status === 'submitted' ? 0 : 0;
  const activeIndex = walletCredited || stopped ? -1 : verificationComplete ? 3 : inReview ? 1 : status === 'submitted' ? 0 : -1;
  const explanation = walletCredited
    ? 'Your deposit has been credited to your wallet.'
    : status === 'approved'
      ? 'Your deposit was approved. Check your wallet balance to confirm whether funds were credited.'
    : status === 'verified'
      ? 'Your deposit details have been verified. Check your wallet balance to confirm whether funds were credited.'
    : inReview
      ? 'OG Exports is reviewing the request. Your wallet has not been credited yet.'
      : stopped
        ? 'This deposit request did not complete. Review the status and contact support if you need help.'
        : 'This status has not been confirmed. Check again for an update.';

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
    <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }}>{explanation}</Text>
  </Card>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, flex: 0.8 }}>{label}</Text>
    <Text selectable style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', textAlign: 'right', flex: 1.2 }}>{value || '—'}</Text>
  </View>;
}

function exactBankDetail(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

type PaymentBankDetailKey = 'account-number' | 'iban' | 'swift';

function CopyableBankDetailRow({ label, value, copied, accessibilityLabel, testID, onCopy }: {
  label: string;
  value: string;
  copied: boolean;
  accessibilityLabel: string;
  testID: string;
  onCopy: () => void;
}) {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, width: 76 }}>{label}</Text>
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Text numberOfLines={1} ellipsizeMode="clip" accessibilityLabel={`${label}: ${value || '—'}`}
        style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', textAlign: 'right', writingDirection: 'ltr', flexShrink: 0 }}>
        {value || '—'}
      </Text>
    </ScrollView>
    {value ? <LocalizedPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint="Copies value to clipboard"
      testID={testID} onPress={onCopy} style={{ width: 40, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
      <Feather name={copied ? 'check' : 'copy'} size={16} color={colors.primary} />
    </LocalizedPressable> : <View style={{ width: 40 }} />}
  </View>;
}

export default function Deposit() {
  const { token, apiOrigin, beginExternalFilePicker, endExternalFilePicker } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const dashboardQuery = useGetInvestorDashboard({ query: { queryKey: ['investor-dashboard'], enabled: Boolean(token), staleTime: 30_000, refetchOnMount: 'always' } });
  const optionsQuery = useGetInvestorDepositOptions({ query: { queryKey: ['investor-deposit-options'], enabled: Boolean(token) } });
  const banksQuery = useGetInvestorPaymentBankAccounts({ query: { queryKey: ['investor-payment-bank-accounts'], enabled: Boolean(token), refetchOnMount: 'always' } });
  const depositsQuery = useGetInvestorDeposits({ per_page: 5 }, { query: { queryKey: ['investor-deposits'], enabled: Boolean(token) } });
  const create = useCreateInvestorDeposit();
  const banks = list(banksQuery.data);
  const projects = list(optionsQuery.data);
  const deposits = list(depositsQuery.data);
  const dashboard = unwrap(dashboardQuery.data);
  const wallet = record(dashboard.wallet);
  const walletCurrency = walletCurrencyFromDashboard(
    dashboardQuery.data,
    first(wallet, ['currency', 'default_currency'], ''),
  );
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState('');
  const [proofName, setProofName] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<PaymentBankDetailKey | null>(null);
  const [bankDetailCopyError, setBankDetailCopyError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stage, setStage] = useState<'method' | 'form' | 'review' | 'submitted'>('method');
  const [paymentMethodId, setPaymentMethodId] = useState<DepositPaymentMethodId | ''>('');
  const [confirmation, setConfirmation] = useState<Record<string, unknown> | null>(null);
  const [successFeedbackVisible, setSuccessFeedbackVisible] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState('');
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultBank = banks.find(item => isEnabled(first(item, ['is_default'])));
  const selectedBank = banks.find(item => first(item, ['id']) === bankId) ?? defaultBank;
  const selectedProject = projects.find(item => first(item, ['id']) === projectId);
  const selectedPaymentMethod = DEPOSIT_PAYMENT_METHODS.find(item => item.id === paymentMethodId);
  const paymentCurrency = walletCurrency;
  const paymentFeeAmount = selectedPaymentMethod
    ? Number(amount || 0) * selectedPaymentMethod.feePercent / 100
    : 0;
  const acceptedBankCurrencies = first(selectedBank ?? {}, ['currency']).toUpperCase() || walletCurrency;
  const bankAccountNumber = exactBankDetail(selectedBank ?? {}, ['account_number', 'accountNumber']);
  const bankIban = exactBankDetail(selectedBank ?? {}, ['iban']);
  const bankSwift = exactBankDetail(selectedBank ?? {}, ['swift', 'swift_code', 'swift_bic']);
  const reviewBankDetails: Array<{ key: PaymentBankDetailKey; label: string; value: string }> = [
    { key: 'account-number', label: 'Account number', value: bankAccountNumber },
    { key: 'iban', label: 'IBAN', value: bankIban },
    { key: 'swift', label: 'SWIFT / BIC', value: bankSwift },
  ];
  const proofRequired = isEnabled(first(selectedBank ?? {}, ['proof_required', 'requires_proof']));
  const timelineDeposit = confirmation ?? deposits.find(item => first(item, ['id', 'reference', 'deposit_reference']) === selectedDepositId);
  const confirmationCurrency = first(confirmation ?? {}, ['currency', 'wallet_currency'], paymentCurrency);

  async function downloadReceipt(source: Record<string, unknown>) {
    setReceiptError('');
    setReceiptBusy(true);
    try {
      await saveTransactionReceipt(createTransactionReceipt('deposit', source));
    } catch (err) {
      setReceiptError(messageOf(err));
    } finally {
      setReceiptBusy(false);
    }
  }

  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  async function copyBankDetail(field: PaymentBankDetailKey, value: string) {
    setBankDetailCopyError('');
    setCopiedBankField(null);
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    try {
      const didCopy = await Clipboard.setStringAsync(value);
      if (!didCopy) throw new Error('Clipboard did not confirm the copy.');
      setCopiedBankField(field);
      copyResetTimer.current = setTimeout(() => setCopiedBankField(null), 1600);
    } catch {
      setBankDetailCopyError('Could not copy the bank detail. Select and copy the value instead.');
    }
  }

  async function pickProof() {
    setError('');
    setProofUploading(true);
    try {
      let uploadSource: string | ExpoFile;
      let fileName: string;
      let mimeType: string;
      if (Platform.OS === 'web') {
        const result = await DocumentPicker.getDocumentAsync({ type: [...INVESTOR_DOCUMENT_MIME_TYPES], copyToCacheDirectory: true });
        if (result.canceled) return;
        const asset = result.assets[0];
        if (!asset) throw new Error('No file was selected. Try again.');
        uploadSource = asset.uri;
        fileName = asset.name;
        mimeType = asset.mimeType ?? 'application/octet-stream';
      } else {
        let selectedFile: ExpoFile | null = null;
        beginExternalFilePicker();
        try {
          const result = await ExpoFile.pickFileAsync({ mimeTypes: [...INVESTOR_DOCUMENT_MIME_TYPES] });
          if (result.canceled) return;
          selectedFile = result.result;
        } finally {
          endExternalFilePicker();
        }
        if (!selectedFile) return;
        uploadSource = selectedFile;
        fileName = selectedFile.name;
        mimeType = selectedFile.type || 'application/octet-stream';
      }
      const path = await uploadInvestorFile(uploadSource, fileName, mimeType, 'deposit-proofs', apiOrigin);
      setProof(path);
      setProofName(fileName);
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
    finally { setProofUploading(false); }
  }

  function validateDeposit() {
    const numericAmount = Number(amount);
    if (dashboardQuery.isLoading || dashboardQuery.isFetching || dashboardQuery.isError || !walletCurrency) {
      setError(dashboardQuery.isError
        ? 'Wallet currency could not be loaded. Retry before continuing.'
        : 'Wait for the wallet currency to load before continuing.');
      return false;
    }
    if (!selectedPaymentMethod) {
      setError('Choose a payment method before continuing.');
      return false;
    }
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
    const paymentMethod = selectedPaymentMethod;
    if (!paymentMethod) {
      setError('Choose a payment method before continuing.');
      setStage('method');
      return;
    }
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
          method: paymentMethod.label,
          bank_account_id: Number.isFinite(selectedBankId) ? selectedBankId : undefined,
          bank_account_name: first(selectedBank ?? {}, ['bank_name', 'name']) || undefined,
          bank_reference: reference.trim(),
          proof_path: proof || undefined,
          project_id: numericProjectId,
        },
      }));
      const deposit = record(response.data);
      setConfirmation(deposit);
      setSuccessFeedbackVisible(true);
      setSelectedDepositId(first(deposit, ['id', 'reference', 'deposit_reference']));
      setNotice('Your deposit request has been received.');
      setStage('submitted');
      setAmount('');
      setReference('');
      setProof('');
      setProofName('');
      setBankId('');
      setProjectId('');
      void queryClient.invalidateQueries({ queryKey: ['investor-deposits'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] });
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
  }

  const depositStatus = first(confirmation ?? {}, ['review_status', 'status']).trim();
  const normalizedDepositStatus = depositStatus.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const depositCompleted = ['settled', 'completed', 'credited'].includes(normalizedDepositStatus);
  const depositApproved = normalizedDepositStatus === 'approved';
  const depositVerified = normalizedDepositStatus === 'verified';
  const depositStatusNeedsAttention = ['rejected', 'declined', 'failed', 'error', 'cancelled', 'canceled'].includes(normalizedDepositStatus);
  const successTitle = depositCompleted
    ? 'Deposit complete'
    : depositApproved
      ? 'Deposit approved'
      : depositVerified
        ? 'Deposit verified'
        : depositStatusNeedsAttention
          ? 'Deposit status updated'
          : 'Deposit request received';
  const successBody = depositCompleted
    ? 'Your deposit has been credited to your wallet.'
    : depositApproved
      ? 'Your deposit was approved. Check your wallet balance to confirm whether funds were credited.'
      : depositVerified
        ? 'Your deposit details have been verified. Check your wallet balance to confirm whether funds were credited.'
        : depositStatusNeedsAttention
          ? 'This deposit was not approved. No wallet credit was recorded for this request.'
      : 'Your deposit request is under review. Your wallet balance will update when the deposit is credited.';

  return <Screen key={stage} title="Add funds" subtitle={selectedPaymentMethod
    ? `Deposit via ${selectedPaymentMethod.label} · ${paymentCurrency || 'wallet currency unavailable'}`
    : 'Choose a payment method to get started'} refreshable>
    {stage === 'method' ? <>
      <Section title="1 · Payment Method" />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 4 }}>
        Choose a deposit method. Bank details and amount fields will appear next.
      </Text>
      {DEPOSIT_PAYMENT_METHODS.map(method => {
        const selected = method.id === paymentMethodId;
        return <Pressable key={method.id} accessibilityRole="button" accessibilityState={{ selected }}
          testID={`deposit-payment-method-${method.id}`} onPress={() => setPaymentMethodId(method.id)}
          style={{ marginBottom: 10 }}>
          <Card style={{
            borderColor: selected ? colors.primary : colors.border,
            borderWidth: selected ? 2 : 1,
            backgroundColor: selected ? colors.lightGreen : colors.card,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={method.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{method.label}</Text>
              </View>
              {selected ? <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '700' }}>SELECTED</Text> : null}
              <Feather name={selected ? 'check-circle' : 'circle'} size={19} color={selected ? colors.primary : colors.mutedForeground} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 9 }}>{method.description}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, letterSpacing: 0.6 }}>MIN / MAX</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.foreground, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                  {money(method.minimumUsd, 'USD')} / {money(method.maximumUsd, 'USD')}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, letterSpacing: 0.6 }}>PROCESSING</Text>
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{method.processing}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 9 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, letterSpacing: 0.6 }}>WALLET CURRENCY</Text>
                <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{paymentCurrency || '—'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, letterSpacing: 0.6 }}>FEES</Text>
                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{method.fees}</Text>
              </View>
            </View>
          </Card>
        </Pressable>;
      })}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 10 }}>{error}</Text> : null}
      <Action title="Continue" icon="arrow-right" testID="continue-deposit-payment-method" disabled={!selectedPaymentMethod}
        onPress={() => { setError(''); setStage('form'); }} />
    </> : null}

    {stage === 'form' ? <>
      <Section title="2 · Deposit Details" />
      {dashboardQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading wallet currency…</Text></Card> : null}
      {dashboardQuery.isError ? <ErrorState message="Wallet currency could not be loaded." error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
      <Section title="Amount" />
      <Card>
        <Field label={`Deposit amount (${paymentCurrency || 'currency unavailable'})`} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      </Card>

      <Section title="Payment Method" right={<Pressable accessibilityRole="button" accessibilityLabel="Change payment method"
        testID="change-deposit-payment-method" onPress={() => { setError(''); setStage('method'); }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Change</Text>
      </Pressable>} />
      <Card style={{ borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={selectedPaymentMethod?.icon ?? 'home'} size={17} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{selectedPaymentMethod?.label ?? 'Choose a method'}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{selectedPaymentMethod?.description ?? 'Select a deposit method to continue.'}</Text>
          </View>
          <Feather name="check-circle" size={18} color={colors.primary} />
        </View>
      </Card>

      <Section title="Receiving Account & Transfer Instructions" />
      {banksQuery.isError ? <ErrorState message="OG Exports payment accounts could not be loaded." error={banksQuery.error} onRetry={() => void banksQuery.refetch()} /> : null}
      {banksQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading payment instructions…</Text></Card> : null}
      {!banksQuery.isLoading && !banksQuery.isError && banks.length === 0
        ? <EmptyState title="Payment instructions unavailable" body="Deposits are currently unavailable. Contact OG Exports to confirm the receiving account." />
        : null}
      {banks.length ? <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 7 }}>Select a receiving account</Text>
        {banks.map((item, index) => {
          const id = first(item, ['id']);
          const selected = first(selectedBank ?? {}, ['id']) === id;
          return <Pressable key={id || String(index)} accessibilityRole="button" accessibilityState={{ selected }} testID={`deposit-bank-${id || index}`} onPress={() => { setBankId(id); setCopiedBankField(null); setBankDetailCopyError(''); }} style={{ paddingVertical: 11, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: selected ? colors.primary : colors.foreground, fontWeight: '700', flex: 1 }}>{first(item, ['bank_name', 'name'], 'Bank account')}</Text>
              {selected ? <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>SELECTED</Text> : null}
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{first(item, ['account_title', 'account_holder', 'account_name'], '—')}{first(item, ['currency']) ? ` · ${first(item, ['currency']).toUpperCase()}` : ''}</Text>
          </Pressable>;
        })}
        {selectedBank ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 2 }}>
          <CopyableBankDetailRow label="Account number" value={bankAccountNumber} copied={copiedBankField === 'account-number'}
            accessibilityLabel={copiedBankField === 'account-number' ? 'Account number copied' : 'Copy account number'} testID="copy-payment-account-number"
            onCopy={() => void copyBankDetail('account-number', bankAccountNumber)} />
          <CopyableBankDetailRow label="IBAN" value={bankIban} copied={copiedBankField === 'iban'}
            accessibilityLabel={copiedBankField === 'iban' ? 'IBAN copied' : 'Copy IBAN'} testID="copy-payment-iban"
            onCopy={() => void copyBankDetail('iban', bankIban)} />
          <CopyableBankDetailRow label="SWIFT / BIC" value={bankSwift} copied={copiedBankField === 'swift'}
            accessibilityLabel={copiedBankField === 'swift' ? 'SWIFT / BIC copied' : 'Copy SWIFT / BIC'} testID="copy-payment-swift"
            onCopy={() => void copyBankDetail('swift', bankSwift)} />
          {bankDetailCopyError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 11, lineHeight: 16, paddingTop: 7 }}>{bankDetailCopyError}</Text> : null}
          <DetailRow label="Accepted transfer currencies" value={acceptedBankCurrencies || '—'} />
          {first(selectedBank, ['instructions']) ? <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 19, marginTop: 7 }}>{first(selectedBank, ['instructions'])}</Text> : null}
          {first(selectedBank, ['notes']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 6 }}>{first(selectedBank, ['notes'])}</Text> : null}
          {!first(selectedBank, ['instructions', 'notes']) ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 6 }}>Contact OG Exports support before sending a transfer.</Text> : null}
        </View> : null}
      </Card> : null}

      {optionsQuery.isError ? <ErrorState message="Project association options could not be loaded." error={optionsQuery.error} onRetry={() => void optionsQuery.refetch()} /> : null}
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

      <Section title="Transaction Reference & Proof" />
      <Card>
        <Field label="Bank transaction reference · Required" value={reference} onChangeText={setReference} placeholder="Reference from your transfer receipt" autoCapitalize="none" />
        <View style={{ gap: 12 }}>
          <Action title={proofUploading ? 'Uploading payment proof…' : proofName ? 'Change payment proof' : 'Upload payment proof'}
            icon={proofName ? 'refresh-cw' : 'upload'} secondary loading={proofUploading} testID="attach-deposit-proof" onPress={() => void pickProof()} />
          {proofName ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.lightGreen }}>
            <Feather name="file-text" size={17} color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>Receipt attached</Text>
              <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{proofName}</Text>
            </View>
            <Feather name="check-circle" size={17} color={colors.primary} />
          </View> : null}
          {proofRequired ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>The selected payment account requires proof before submission.</Text> : null}
          {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, lineHeight: 18 }}>{error}</Text> : null}
          <Action title="Review deposit" icon="arrow-right" disabled={!paymentCurrency || !amount || Number(amount) < 1 || !selectedBank || !reference.trim() || (proofRequired && !proof)} onPress={() => {
            setError('');
            if (validateDeposit()) setStage('review');
          }} />
        </View>
      </Card>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Use the selected OG Exports payment instructions and submit the transfer reference. Your wallet balance updates when the deposit is credited.</Text>
    </> : null}

    {stage === 'review' ? <Card>
      <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Review deposit</Text>
      <DetailRow label="Amount" value={moneyWithDisplayCurrencyAndSource(Number(amount), paymentCurrency || 'USD')} />
      <DetailRow label="OG Exports fee (0%)" value={moneyWithDisplayCurrencyAndSource(paymentFeeAmount, paymentCurrency || 'USD')} />
      <DetailRow label="Payment method" value={selectedPaymentMethod?.label ?? '—'} />
      <DetailRow label="Receiving bank" value={first(selectedBank ?? {}, ['bank_name', 'name'])} />
      <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: colors.border }}>
        {reviewBankDetails.map((detail, index) => <View
          key={detail.key}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: index === reviewBankDetails.length - 1 ? 0 : 1, borderBottomColor: colors.border }}
        >
           <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 0.85 }}>{detail.label}</Text>
           <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}
             style={{ flex: 1.5 }}
             contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
             <Text testID={`review-${detail.key}-value`} numberOfLines={1} selectable
               accessibilityLabel={`${detail.label}: ${detail.value || 'Not provided'}`}
               style={{ color: detail.value ? colors.foreground : colors.mutedForeground, fontFamily: 'monospace', fontSize: 14, fontWeight: '600', flexShrink: 0, lineHeight: 20, textAlign: 'right', writingDirection: 'ltr' }}>
               {detail.value || 'Not provided'}
             </Text>
           </ScrollView>
        </View>)}
      </View>
      <DetailRow label="Transaction reference" value={reference.trim()} />
      <DetailRow label="Proof of transfer" value={proofName || (proofRequired ? 'Required, but not attached' : 'Not attached')} />
      {selectedProject ? <DetailRow label="Project association" value={first(selectedProject, ['title', 'name'], 'Investment project')} /> : null}
       <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 12 }}>OG Exports will review this request. Your wallet balance will update when the deposit is credited.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit deposit request" icon="lock" loading={create.isPending} onPress={() => void submit()} />
      <View style={{ marginTop: 10 }}><Action title="Edit deposit" secondary onPress={() => { setError(''); setStage('form'); }} /></View>
    </Card> : null}

    {stage === 'submitted' && confirmation ? <Card style={{ borderColor: colors.primary }}>
      <SuccessMark feedback="none" />
       <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>Deposit request received</Text>
      {notice ? <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 7 }}>{notice}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, marginTop: 6 }}>
         <Text style={{ color: colors.mutedForeground }}>Current status</Text>
         <Status value={formatUiStatus(first(confirmation, ['review_status_label', 'status'], '—'))} />
      </View>
      <DetailRow label="Deposit reference" value={first(confirmation, ['reference', 'deposit_reference'])} />
      <DetailRow label="Amount" value={moneyWithDisplayCurrencyAndSource(readAmount(confirmation, ['amount']), confirmationCurrency || 'USD')} />
      <DetailRow label="OG Exports fee (0%)" value={moneyWithDisplayCurrencyAndSource(0, confirmationCurrency || 'USD')} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 8 }}>Your deposit request is under review. Your wallet balance will update when the deposit is credited.</Text>
      <DepositProgress deposit={confirmation} />
      {receiptError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, marginTop: 10 }}>{receiptError}</Text> : null}
      <View style={{ marginTop: 12 }}>
        <Action
          title={receiptBusy ? 'Preparing receipt…' : 'Save / share receipt'}
          icon="download"
          loading={receiptBusy}
          disabled={receiptBusy}
          onPress={() => void downloadReceipt(confirmation)}
        />
      </View>
      <View style={{ marginTop: 14 }}><Action title="Record another deposit" secondary onPress={() => {
        setConfirmation(null);
        setSelectedDepositId('');
        setNotice('');
        setError('');
        setPaymentMethodId('');
        setStage('method');
      }} /></View>
    </Card> : null}

    <Section title="Recent deposits" right={<Pressable accessibilityRole="button" accessibilityLabel="Refresh deposit history" onPress={() => {
      void depositsQuery.refetch();
      void dashboardQuery.refetch();
    }} style={{ width: 38, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 18 }}>↻</Text>
    </Pressable>} />
    {depositsQuery.isError ? <ErrorState message="Deposit history could not be loaded." error={depositsQuery.error} onRetry={() => void depositsQuery.refetch()} /> : null}
    {depositsQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading deposit history…</Text></Card> : null}
    {!depositsQuery.isLoading && !depositsQuery.isError && deposits.length === 0 ? <EmptyState title="No deposits yet" body="Submitted transfers will appear here with their review status." /> : null}
    {deposits.map((item, index) => {
      const id = first(item, ['id', 'reference', 'deposit_reference'], String(index));
      const detailId = first(item, ['id', 'deposit_id', 'depositId']);
      const selected = selectedDepositId === id;
      return <Pressable key={id} accessibilityRole="button" accessibilityLabel="Open deposit details" accessibilityState={{ selected }} onPress={() => {
        if (/^\d+$/.test(detailId)) {
          router.push({ pathname: '/account/transaction/[id]', params: { id: detailId, kind: 'deposit' } });
          return;
        }
        setSelectedDepositId(selected ? '' : id);
        if (!selected) {
          setConfirmation(null);
          setStage('method');
        }
      }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderColor: selected ? colors.primary : colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'deposit_reference'], 'Deposit request')}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>{moneyWithDisplayCurrencyAndSource(readAmount(item, ['amount']), first(item, ['currency'], walletCurrency || 'USD'))} · {first(item, ['created_at', 'date'], '—')}</Text>
          </View>
          <Status value={first(item, ['review_status_label', 'status'], '—')} />
        </Card>
      </Pressable>;
    })}
    {timelineDeposit && stage !== 'submitted' ? <Card style={{ borderColor: colors.primary }}>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Deposit record</Text>
      <DetailRow label="Server reference" value={first(record(timelineDeposit), ['reference', 'deposit_reference'], 'Not provided')} />
      <DetailRow label="Server status" value={first(record(timelineDeposit), ['review_status', 'status'], 'Not provided')} />
      <DetailRow
        label="Amount returned by OG Exports"
        value={moneyWithDisplayCurrencyAndSource(
          readAmount(record(timelineDeposit), ['amount']),
          first(record(timelineDeposit), ['currency', 'wallet_currency']) || 'USD',
        )}
      />
      <DetailRow label="Date returned by OG Exports" value={first(record(timelineDeposit), ['created_at', 'date'], 'Not provided')} />
      {receiptError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, marginTop: 8 }}>{receiptError}</Text> : null}
      <View style={{ marginTop: 10 }}>
        <Action
          title={receiptBusy ? 'Preparing receipt…' : 'Save / share receipt'}
          icon="download"
          loading={receiptBusy}
          disabled={receiptBusy}
          onPress={() => void downloadReceipt(record(timelineDeposit))}
        />
      </View>
    </Card> : null}
    {timelineDeposit && stage !== 'submitted' ? <DepositProgress deposit={record(timelineDeposit)} /> : null}
    <SuccessFeedback
      visible={successFeedbackVisible}
      title={successTitle}
      body={successBody}
      feedback={depositCompleted ? 'success' : depositApproved || depositVerified ? 'approved' : depositStatusNeedsAttention ? 'attention' : 'ack'}
      status={depositStatus ? formatUiStatus(depositStatus) : undefined}
      reference={first(confirmation ?? {}, ['reference', 'deposit_reference', 'bank_reference']) || undefined}
      onDismiss={() => setSuccessFeedbackVisible(false)}
      testID="deposit-success-feedback"
    />
  </Screen>;
}
