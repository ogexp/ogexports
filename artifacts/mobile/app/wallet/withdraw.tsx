import React, { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateInvestorWithdrawal,
  useGetInvestorProfile,
  useGetInvestorWallet,
  useGetInvestorWithdrawals,
  useSendInvestorWithdrawalOtp,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Withdraw() {
  const { token } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token } });
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token } });
  const historyQuery = useGetInvestorWithdrawals({}, { query: { queryKey: ['investor-withdrawals'], enabled: !!token } });
  const create = useCreateInvestorWithdrawal();
  const sendOtp = useSendInvestorWithdrawalOtp();
  const wallet = unwrap(walletQuery.data);
  const profile = unwrap(profileQuery.data);
  const savedBank = record(profile.default_bank_account);
  const currency = first(wallet, ['currency'], 'USD');
  const availableValue = wallet.available_balance;
  const availableBalance = typeof availableValue === 'number' ? availableValue : Number.isFinite(Number(availableValue)) && availableValue != null ? Number(availableValue) : null;
  const hasSavedBank = Boolean(first(savedBank, ['bank_name']) && first(savedBank, ['account_holder']) && (first(savedBank, ['account_number']) || first(savedBank, ['iban'])));
  const withdrawals = list(historyQuery.data);
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [transactionPassword, setTransactionPassword] = useState('');
  const [useDifferentBank, setUseDifferentBank] = useState(false);
  const [saveBankDetails, setSaveBankDetails] = useState(false);
  const [bankName, setBankName] = useState('');
  const [holder, setHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [branch, setBranch] = useState('');
  const [error, setError] = useState('');
  const showBankForm = !hasSavedBank || useDifferentBank;

  async function requestOtp() {
    setError('');
    try {
      await sendOtp.mutateAsync();
      Alert.alert('Code sent', 'Check your email for the withdrawal verification code.');
    } catch (err) { setError(messageOf(err)); }
  }

  async function submit() {
    setError('');
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber < 1 || (availableBalance !== null && amountNumber > availableBalance)) {
      setError('Enter a valid amount within your available wallet balance.');
      return;
    }
    if (!otp.trim() || !transactionPassword) {
      setError('Enter the emailed code and your transaction password.');
      return;
    }
    if (showBankForm && (!bankName.trim() || !holder.trim() || !(accountNumber.trim() || iban.trim()))) {
      setError('Enter the bank name, account holder, and an account number or IBAN.');
      return;
    }
    const bankDetails = showBankForm
      ? { bank_name: bankName.trim(), account_holder: holder.trim(), account_number: accountNumber.trim(), iban: iban.trim(), swift: swift.trim(), branch: branch.trim(), currency }
      : undefined;
    try {
      await create.mutateAsync({
        data: {
          amount: amountNumber,
          otp: otp.trim(),
          transaction_password: transactionPassword,
          bank_details: bankDetails,
          save_bank_details: Boolean(bankDetails && saveBankDetails),
        },
      });
      Alert.alert('Withdrawal requested', 'Your request is now awaiting review.');
      setAmount('');
      setOtp('');
      setTransactionPassword('');
      setUseDifferentBank(false);
      void historyQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-wallet-transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] });
    } catch (err) { setError(messageOf(err)); }
  }

  return <Screen title="Withdraw" subtitle="Request a payout from your investor wallet">
    <Card>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>AVAILABLE TO WITHDRAW</Text>
      <Text style={{ color: colors.foreground, fontSize: 25, fontWeight: '700', marginTop: 5 }}>
        {availableBalance === null ? '—' : `${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
      </Text>
      {!hasSavedBank ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 8 }}>Add payout details here or save a default account in Settings.</Text> : null}
    </Card>

    <Card>
      <Field label={`Withdrawal amount (${currency})`} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" autoCapitalize="none" />
      {hasSavedBank ? <>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 10 }}>
          Default payout: {first(savedBank, ['bank_name'])} · account ending {first(savedBank, ['account_number', 'iban']).slice(-4)}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => setUseDifferentBank(!useDifferentBank)} style={{ paddingVertical: 8, marginBottom: 6 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{useDifferentBank ? 'Use saved payout account' : 'Use a different account for this withdrawal'}</Text>
        </Pressable>
      </> : null}
      {showBankForm ? <>
        <Field label="Bank name" value={bankName} onChangeText={setBankName} placeholder="Bank name" />
        <Field label="Account holder" value={holder} onChangeText={setHolder} placeholder="Name on the account" />
        <Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" autoCapitalize="none" />
        <Field label="IBAN (or account number)" value={iban} onChangeText={setIban} placeholder="IBAN" autoCapitalize="none" />
        <Field label="SWIFT / BIC (optional)" value={swift} onChangeText={setSwift} placeholder="SWIFT / BIC" autoCapitalize="characters" />
        <Field label="Branch (optional)" value={branch} onChangeText={setBranch} placeholder="Branch" />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <Text style={{ flex: 1, color: colors.foreground, fontSize: 13 }}>Save this account for future withdrawals</Text>
          <Switch value={saveBankDetails} onValueChange={setSaveBankDetails} trackColor={{ true: colors.primary }} />
        </View>
      </> : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="Email verification code" value={otp} onChangeText={setOtp} placeholder="6-digit code" keyboardType="numeric" autoCapitalize="none" /></View>
        <View style={{ marginBottom: 14 }}><Action title="Send code" secondary loading={sendOtp.isPending} onPress={() => void requestOtp()} /></View>
      </View>
      <Field label="Transaction password" value={transactionPassword} onChangeText={setTransactionPassword} placeholder="Transaction password" secureTextEntry autoCapitalize="none" />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Submit withdrawal" icon="arrow-up-right" loading={create.isPending} disabled={!amount || !otp || !transactionPassword} onPress={() => void submit()} />
    </Card>

    <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginVertical: 8 }}>Recent withdrawals</Text>
    {historyQuery.isError ? <ErrorState message="Withdrawal history could not be loaded." onRetry={() => void historyQuery.refetch()} /> : null}
    {historyQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading withdrawal history…</Text></Card> : null}
    {!historyQuery.isLoading && !historyQuery.isError && withdrawals.length === 0 ? <EmptyState title="No withdrawals yet" body="Your payout requests will appear here with their review status." /> : null}
    {withdrawals.map((item, index) => <Card key={first(item, ['id', 'reference'], String(index))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['reference', 'withdraw_id'], 'Withdrawal request')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>{first(item, ['amount'], '—')} {first(item, ['currency'], currency)} · {first(item, ['created_at', 'date'], '')}</Text></View>
      <Status value={first(item, ['status'], 'Pending')} />
    </Card>)}
  </Screen>;
}