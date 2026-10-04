import React, { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf, record } from '@/lib/data';
import { useInvestorVerifyEmail, useInvestorVerifyTwoFactor } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Verify() {
  const { challenge, setChallenge, acceptSession } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const emailVerify = useInvestorVerifyEmail();
  const twoFactor = useInvestorVerifyTwoFactor();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    if (!challenge) { router.replace('/(auth)/login'); return; }
    setError('');
    try {
      const response = record(challenge.mode === '2fa'
        ? await twoFactor.mutateAsync({ data: { token: challenge.token, code, device_name: 'og_investor_mobile' } })
        : await emailVerify.mutateAsync({ data: { email: challenge.email, code, device_name: 'og_investor_mobile' } }));
      if (response.requires_2fa) {
        setChallenge({ email: challenge.email, token: String(response.token ?? ''), mode: '2fa' });
        setCode('');
        return;
      }
      if (typeof response.token !== 'string') throw new Error('The verification response did not include a session token.');
      await acceptSession(response.token, record(response.user));
      router.replace('/(tabs)');
    } catch (err) { setError(messageOf(err)); }
  }
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, justifyContent: 'center' }} bottomOffset={70} keyboardShouldPersistTaps="handled">
    <Text style={{ fontSize: 27, fontWeight: '700', color: colors.foreground }}>Verify it’s you</Text>
    <Text style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 20, lineHeight: 21 }}>Enter the code sent to {challenge?.email ?? 'your email'}.</Text>
    <Card>
      <Field label="Verification code" value={code} onChangeText={setCode} placeholder="Enter code" keyboardType="numeric" autoCapitalize="none" />
      {error ? <Text style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Verify and continue" loading={emailVerify.isPending || twoFactor.isPending} disabled={code.length < 4} onPress={() => void submit()} />
    </Card>
  </KeyboardAwareScrollViewCompat>;
}