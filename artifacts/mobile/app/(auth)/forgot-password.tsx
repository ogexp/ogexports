import React, { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { messageOf } from '@/lib/data';
import { useInvestorForgotPassword, useInvestorResetPassword, useInvestorVerifyResetCode } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPassword() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const request = useInvestorForgotPassword();
  const verify = useInvestorVerifyResetCode();
  const reset = useInvestorResetPassword();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit() {
    setError('');
    setNotice('');
    try {
      if (step === 0) { await request.mutateAsync({ data: { email } }); setStep(1); }
      else if (step === 1) { await verify.mutateAsync({ data: { email, code } }); setStep(2); }
      else {
        if (password.length < 8) { setError('Use at least 8 characters for your new password.'); return; }
        if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
        await reset.mutateAsync({ data: { email, password, password_confirmation: confirmPassword } });
        setStep(3);
      }
    } catch (err) { setError(messageOf(err)); }
  }
  async function resendCode() {
    setError('');
    setNotice('');
    try {
      const response = await request.mutateAsync({ data: { email } });
      setNotice(typeof response === 'object' && response !== null && 'message' in response && typeof response.message === 'string'
        ? response.message
        : 'If the account exists, a reset code has been sent to its email address.');
    } catch (err) { setError(messageOf(err)); }
  }
  const title = ['Reset your password', 'Enter your email code', 'Choose a new password', 'Password updated'][step];
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 0 : insets.top + 30, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, justifyContent: 'center' }} bottomOffset={72} keyboardShouldPersistTaps="handled">
    <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: '700' }}>{title}</Text>
    <Text style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 20, lineHeight: 21 }}>
      {step === 0
        ? 'Enter the email address on your account. We’ll send a reset code there.'
        : step === 3
          ? 'You can now sign in with your new password.'
          : `Reset code sent to: ${email}`}
    </Text>
    {step < 3 ? <Card>
      {step === 0 ? <Field label="Email address" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" /> : null}
      {step === 1 ? <Field label="Six-digit verification code" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="numeric" autoCapitalize="none" /> : null}
      {step === 2 ? <Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" /> : null}
      {step === 2 ? <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter the password again" secureTextEntry autoCapitalize="none" /> : null}
      {notice ? <Text style={{ color: colors.primary, marginBottom: 12, lineHeight: 19 }}>{notice}</Text> : null}
      {error ? <Text style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title={step === 0 ? 'Send code' : step === 1 ? 'Verify code' : 'Update password'} loading={request.isPending || verify.isPending || reset.isPending} onPress={() => void submit()} disabled={step === 0 ? !email.trim() : step === 1 ? code.length !== 6 : password.length < 8 || !confirmPassword} />
      {step === 1 ? <Text onPress={() => void resendCode()} style={{ color: colors.primary, textAlign: 'center', padding: 14, fontWeight: '600' }}>Resend code</Text> : null}
    </Card> : <Card>
      <Text style={{ color: colors.foreground, lineHeight: 21, marginBottom: 14 }}>Your password has been updated. Sign in with the new password to continue.</Text>
      <Action title="Back to sign in" icon="arrow-right" onPress={() => router.replace('/(auth)/login')} />
    </Card>}
  </KeyboardAwareScrollViewCompat>;
}