import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Field } from '@/components/InvestorUI';
import {
  useGetInvestorTransactionPasswordStatus,
  useResetInvestorTransactionPassword,
  useSetInvestorTransactionPassword,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { messageOf, unwrap } from '@/lib/data';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TransactionPasswordForm = {
  login: string;
  transaction: string;
  confirm: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function TransactionPasswordResetModal({ visible, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const statusQuery = useGetInvestorTransactionPasswordStatus({
    query: { queryKey: ['investor-transaction-password-status'], enabled: Boolean(token) },
  });
  const setPassword = useSetInvestorTransactionPassword();
  const resetPassword = useResetInvestorTransactionPassword();
  const [formKey, setFormKey] = useState(0);
  const status = unwrap(statusQuery.data);
  const hasPassword = status.has_transaction_password === true
    || status.set === true
    || status.is_set === true
    || status.configured === true;
  const busy = setPassword.isPending || resetPassword.isPending;
  const statusUnavailable = statusQuery.isLoading || statusQuery.isFetching || statusQuery.isError;

  function close() {
    setFormKey(value => value + 1);
    onClose();
  }

  async function save(form: TransactionPasswordForm) {
    if (statusUnavailable) {
      throw new Error('Transaction-password status could not be checked. Please retry or use account settings.');
    }
    const data = {
      password: form.login,
      transaction_password: form.transaction,
      transaction_password_confirmation: form.confirm,
    };
    if (hasPassword) await resetPassword.mutateAsync({ data });
    else await setPassword.mutateAsync({ data });
    close();
    await statusQuery.refetch();
    onSuccess();
  }

  return <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={close}
  >
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: 'rgba(8, 18, 13, 0.48)' }}>
      <Pressable accessible={false} importantForAccessibility="no" onPress={close} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: 480,
        maxHeight: '88%',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 20,
        paddingBottom: Math.max(insets.bottom, 16) + 10,
      }}>
        <TransactionPasswordResetForm
          key={formKey}
          statusError={statusQuery.isError}
          statusUnavailable={statusUnavailable}
          busy={busy}
          onCancel={close}
          onSave={save}
        />
      </View>
    </View>
  </Modal>;
}

function TransactionPasswordResetForm({
  statusError,
  statusUnavailable,
  busy,
  onCancel,
  onSave,
}: {
  statusError: boolean;
  statusUnavailable: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (form: TransactionPasswordForm) => Promise<void>;
}) {
  const colors = useColors();
  const [form, setForm] = useState<TransactionPasswordForm>({ login: '', transaction: '', confirm: '' });
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!form.login || form.transaction.length < 6) {
      setError('Enter your login password and use at least 6 characters for the new transaction password.');
      return;
    }
    if (form.transaction !== form.confirm) {
      setError('The transaction password and confirmation do not match.');
      return;
    }
    try {
      await onSave(form);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return <KeyboardAwareScrollViewCompat keyboardShouldPersistTaps="handled" bottomOffset={24} showsVerticalScrollIndicator={false}>
    <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginBottom: 5 }}>Reset transaction password</Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
      Confirm your login password, then choose and confirm a new transaction password.
    </Text>
    {statusError ? <Text style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
      Transaction-password status could not be checked. Retry the status check or use account settings.
    </Text> : null}
    <Field label="Login password" value={form.login} onChangeText={value => { setForm(current => ({ ...current, login: value })); setError(''); }} secureTextEntry autoCapitalize="none" />
    <Field label="New transaction password" value={form.transaction} onChangeText={value => { setForm(current => ({ ...current, transaction: value })); setError(''); }} secureTextEntry autoCapitalize="none" />
    <Field label="Confirm transaction password" value={form.confirm} onChangeText={value => { setForm(current => ({ ...current, confirm: value })); setError(''); }} secureTextEntry autoCapitalize="none" />
    {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>{error}</Text> : null}
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 0.8 }}><Action title="Cancel" secondary disabled={busy} onPress={onCancel} /></View>
      <View style={{ flex: 1.2 }}>
        <Action
          title="Update password"
          loading={busy}
          disabled={statusUnavailable || !form.login || form.transaction.length < 6 || !form.confirm}
          onPress={() => void submit()}
        />
      </View>
    </View>
  </KeyboardAwareScrollViewCompat>;
}
