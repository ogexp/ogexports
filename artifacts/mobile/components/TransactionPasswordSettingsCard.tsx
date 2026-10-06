import React, { useState } from 'react';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Action, Card, Field } from '@/components/InvestorUI';
import {
  useGetInvestorTransactionPasswordStatus,
  useResetInvestorTransactionPassword,
  useSetInvestorTransactionPassword,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { messageOf, unwrap } from '@/lib/data';
import { useColors } from '@/hooks/useColors';
import { localizedAlert as Alert } from '@/lib/strings';

export function TransactionPasswordSettingsCard() {
  const { token } = useAuth();
  const colors = useColors();
  const transactionPasswordQuery = useGetInvestorTransactionPasswordStatus({
    query: { queryKey: ['investor-transaction-password-status'], enabled: !!token },
  });
  const setTransactionPassword = useSetInvestorTransactionPassword();
  const resetTransactionPassword = useResetInvestorTransactionPassword();
  const transactionPasswordStatus = unwrap(transactionPasswordQuery.data);
  const hasTransactionPassword = transactionPasswordStatus.has_transaction_password === true
    || transactionPasswordStatus.set === true
    || transactionPasswordStatus.is_set === true
    || transactionPasswordStatus.configured === true;
  const [loginPassword, setLoginPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const busy = setTransactionPassword.isPending || resetTransactionPassword.isPending;

  async function save() {
    setError('');
    if (newPassword.length < 6) {
      setError('Use at least 6 characters for the transaction password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The transaction password and confirmation do not match.');
      return;
    }
    try {
      const data = {
        password: loginPassword,
        transaction_password: newPassword,
        transaction_password_confirmation: confirmPassword,
      };
      if (hasTransactionPassword) await resetTransactionPassword.mutateAsync({ data });
      else await setTransactionPassword.mutateAsync({ data });
      setLoginPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await transactionPasswordQuery.refetch();
      Alert.alert('Transaction password updated', 'You can use it to confirm withdrawals.');
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return <Card>
    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Withdrawal transaction password</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
      {transactionPasswordQuery.isLoading
        ? 'Checking security settings…'
        : hasTransactionPassword
          ? 'A transaction password is set. Confirm the change with your sign-in password.'
          : 'Set a transaction password to confirm withdrawals.'}
    </Text>
    <Field label="Sign-in password to confirm" value={loginPassword} onChangeText={setLoginPassword} placeholder="Your sign-in password" secureTextEntry autoCapitalize="none" />
    <Field label="New transaction password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 6 characters" secureTextEntry autoCapitalize="none" />
    <Field label="Confirm transaction password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry autoCapitalize="none" />
    {transactionPasswordQuery.isError ? <Text style={{ color: colors.destructive, marginBottom: 10 }}>Security status could not be loaded. Retry the screen before changing this password.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 10 }}>{error}</Text> : null}
    <Action
      title={hasTransactionPassword ? 'Reset transaction password' : 'Set transaction password'}
      icon="shield"
      loading={busy}
      disabled={!transactionPasswordQuery.data || transactionPasswordQuery.isError || !loginPassword || newPassword.length < 6 || !confirmPassword}
      onPress={() => void save()}
    />
  </Card>;
}
