import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf, record } from '@/lib/data';
import {
  useInvestorResendEmailVerification,
  useInvestorVerifyEmail,
  useInvestorVerifyTwoFactor,
} from '@workspace/api-client-react';
import { resolvePostAuthHref } from '@/lib/post-auth-route';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Verify() {
  const { challenge, acceptSession } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const emailVerify = useInvestorVerifyEmail();
  const twoFactor = useInvestorVerifyTwoFactor();
  const resend = useInvestorResendEmailVerification();
  const postAuthRedirect = useRef(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!challenge && !postAuthRedirect.current) {
      router.replace('/(auth)/login');
    }
  }, [challenge]);

  async function submit() {
    if (!challenge) { router.replace('/(auth)/login'); return; }
    setError('');
    try {
      const response = record(challenge.mode === '2fa'
        ? await twoFactor.mutateAsync({
          data: { email: challenge.email, code, device_name: 'OG Exports mobile' },
        })
        : await emailVerify.mutateAsync({
          data: { email: challenge.email, code, device_name: 'OG Exports mobile' },
        }));
      if (typeof response.token !== 'string') {
        throw new Error('The verification response did not include a session token.');
      }
      const destination = resolvePostAuthHref(challenge.returnTo);
      postAuthRedirect.current = true;
      await acceptSession(response.token, record(response.user));
      router.replace(destination);
    } catch (err) {
      postAuthRedirect.current = false;
      setError(messageOf(err));
    }
  }

  async function resendVerification() {
    if (!challenge || challenge.mode !== 'email') return;
    setError('');
    setNotice('');
    try {
      const response = record(await resend.mutateAsync({ data: { email: challenge.email } }));
      setNotice(typeof response.message === 'string' ? response.message : 'A new verification code has been sent.');
    } catch (err) {
      setError(messageOf(err));
    }
  }

  if (!challenge) {
    return null;
  }
  const isTwoFactor = challenge.mode === '2fa';
  const isPending = emailVerify.isPending || twoFactor.isPending;
  return <KeyboardAwareScrollViewCompat
    style={{ flex: 1, backgroundColor: colors.background }}
    contentInsetAdjustmentBehavior="never"
    contentContainerStyle={{
      flexGrow: 1,
      paddingTop: Platform.OS === 'ios' ? 0 : insets.top + 28,
      paddingBottom: insets.bottom + 24,
      paddingHorizontal: 20,
      justifyContent: 'center',
    }}
    bottomOffset={70}
    keyboardShouldPersistTaps="handled"
  >
    <Text style={{ fontSize: 27, fontWeight: '700', color: colors.foreground }}>
      {isTwoFactor ? 'Confirm your sign-in' : 'Verify your email'}
    </Text>
    <Text style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 20, lineHeight: 21 }}>
      {challenge.message || (isTwoFactor
        ? 'Enter the sign-in code sent to your verified email address.'
        : 'Enter the code sent to your email address.')}
      {'\n'}{challenge.email}
    </Text>
    <Card>
      <Field
        label="Six-digit code"
        value={code}
        onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        keyboardType="numeric"
        autoCapitalize="none"
      />
      {notice ? <Text style={{ color: colors.primary, marginBottom: 12, lineHeight: 19 }}>{notice}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12, lineHeight: 19 }}>{error}</Text> : null}
      <Action
        title={isTwoFactor ? 'Verify and sign in' : 'Verify email and continue'}
        loading={isPending}
        disabled={code.length !== 6}
        onPress={() => void submit()}
      />
      {!isTwoFactor ? <Pressable
        accessibilityRole="button"
        onPress={() => void resendVerification()}
        disabled={resend.isPending}
        style={{ alignSelf: 'center', padding: 14 }}
      >
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {resend.isPending ? 'Sending…' : 'Resend verification code'}
        </Text>
      </Pressable> : <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/(auth)/login')}
        style={{ alignSelf: 'center', padding: 14 }}
      >
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Back to sign in</Text>
      </Pressable>}
    </Card>
  </KeyboardAwareScrollViewCompat>;
}