import React, { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
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
  async function submit() {
    setError('');
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
  const title = ['Reset your password', 'Enter your email code', 'Choose a new password', 'Password updated'][step];
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, justifyContent: 'center' }} bottomOffset={72} keyboardShouldPersistTaps="handled">
    <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: '700' }}>{title}</Text>
    <Text style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 20, lineHeight: 21 }}>{step === 0 ? 'We’ll email you a verification code.' : step === 3 ? 'You can now sign in with your new password.' : `Account: ${email}`}</Text>
    {step < 3 ? <Card>
      {step === 0 ? <Field label="Email address" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" /> : null}
      {step === 1 ? <Field label="Verification code" value={code} onChangeText={setCode} placeholder="Enter code" keyboardType="numeric" autoCapitalize="none" /> : null}
      {step === 2 ? <Field label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" /> : null}
      {step === 2 ? <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter the password again" secureTextEntry autoCapitalize="none" /> : null}
      {error ? <Text style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title={step === 0 ? 'Send code' : step === 1 ? 'Verify code' : 'Update password'} loading={request.isPending || verify.isPending || reset.isPending} onPress={() => void submit()} disabled={step === 0 ? !email : step === 1 ? !code : password.length < 8 || !confirmPassword} />
    </Card> : <Card>
      <Text style={{ color: colors.foreground, lineHeight: 21, marginBottom: 14 }}>Your password has been updated. Sign in with the new password to continue.</Text>
      <Action title="Back to sign in" icon="arrow-right" onPress={() => router.replace('/(auth)/login')} />
    </Card>}
  </KeyboardAwareScrollViewCompat>;
}