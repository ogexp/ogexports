import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { first, messageOf, record } from '@/lib/data';
import { useInvestorMobileLogin } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolvePostAuthHref } from '@/lib/post-auth-route';
import { authenticateWithBiometrics, getBiometricInfo, type BiometricInfo } from '@/lib/biometrics';

export default function Login() {
  const { apiOrigin, token, user, biometricEnabled, acceptSession, setChallenge, unlockApp } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const login = useInvestorMobileLogin();
  const postAuthPath = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [biometricInfo, setBiometricInfo] = useState<BiometricInfo | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const hasSavedBiometricSession = Platform.OS !== 'web' && !!token && biometricEnabled;
  const savedName = first(record(user), ['name'], 'Saved investor account');
  const savedEmail = first(record(user), ['email']);

  useEffect(() => {
    let active = true;
    if (!hasSavedBiometricSession) {
      setBiometricInfo(null);
      return () => { active = false; };
    }
    void getBiometricInfo()
      .then(info => { if (active) setBiometricInfo(info); })
      .catch(() => { if (active) setBiometricInfo({ available: false, name: 'biometrics' }); });
    return () => { active = false; };
  }, [hasSavedBiometricSession]);

  async function submit() {
    setError('');
    if (!apiOrigin) {
      setError('The investor API server is not configured for this build. Set EXPO_PUBLIC_API_BASE_URL before signing in.');
      return;
    }
    try {
      const result = record(await login.mutateAsync({
        data: { email: email.trim(), password, device_name: 'OG Exports mobile' },
      }));
      if (result.requires_2fa === true && typeof result.email === 'string') {
        setChallenge({
          email: result.email,
          mode: '2fa',
          message: typeof result.message === 'string' ? result.message : '',
          ...(postAuthPath ? { returnTo: postAuthPath } : {}),
        });
        router.push('/(auth)/verify');
        return;
      }
      const user = record(result.user);
      if (typeof result.token !== 'string') throw new Error('The server response did not include a session token.');
      await acceptSession(result.token, user);
      router.replace(resolvePostAuthHref(returnTo));
    } catch (err) {
      const payload = record(record(err).data);
      if (payload.requires_email_verification === true && typeof payload.email === 'string') {
        setChallenge({
          email: payload.email,
          mode: 'email',
          message: typeof payload.message === 'string' ? payload.message : '',
          ...(postAuthPath ? { returnTo: postAuthPath } : {}),
        });
        router.push('/(auth)/verify');
        return;
      }
      setError(messageOf(err));
    }
  }

  async function signInWithBiometrics() {
    setError('');
    if (!token || !biometricEnabled) {
      setError('No saved biometric session is available. Sign in with your account password.');
      return;
    }
    setBiometricBusy(true);
    try {
      const info = await getBiometricInfo();
      setBiometricInfo(info);
      if (!info.available) {
        setError(`Set up ${info.name} on this device, or sign in with your account password.`);
        return;
      }
      const result = await authenticateWithBiometrics('Verify your identity to sign in to OG Exports');
      if (result.success) {
        unlockApp();
        router.replace(resolvePostAuthHref(returnTo));
      } else if (!['user_cancel', 'app_cancel', 'system_cancel'].includes(result.error)) {
        setError(result.error === 'lockout'
          ? `${info.name} is temporarily locked. Sign in with your account password.`
          : `${info.name} was not verified. Try again or sign in with your account password.`);
      }
    } catch {
      setError('Biometric sign-in is unavailable. Use your account password instead.');
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.secondary }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24, paddingHorizontal: 22, justifyContent: 'center' }} bottomOffset={72} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 22 }}>
        <Image source={require('../../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 112, height: 82 }} />
        <Text style={{ color: colors.primary, fontSize: 25, fontWeight: '700', marginTop: 18 }}>OG Exports</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 7 }}>Global Trade. Digital Investment.</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 5 }}>Sign in to your investor account.</Text>
      </View>
      <Card>
        {hasSavedBiometricSession ? <View style={{ marginBottom: 15, padding: 13, borderRadius: 14, backgroundColor: colors.lightGreen }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>SAVED SECURE SESSION</Text>
          <Text style={{ color: colors.foreground, fontWeight: '700', marginTop: 5 }}>{savedName}</Text>
          {savedEmail ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>{savedEmail}</Text> : null}
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 7, marginBottom: 10 }}>
            Biometric verification unlocks the session stored securely on this device. Your account password is not stored.
          </Text>
          <Action
            title={biometricInfo?.available ? `Continue with ${biometricInfo.name}` : 'Checking biometric availability…'}
            icon="unlock"
            loading={biometricBusy}
            disabled={!biometricInfo?.available}
            onPress={() => void signInWithBiometrics()}
          />
          {biometricInfo && !biometricInfo.available ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 8 }}>
            {`Set up Face ID, Touch ID or fingerprint unlock on this device, or continue with your password below.`}
          </Text> : null}
          <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: 'center', marginTop: 11 }}>Or use your account password</Text>
        </View> : null}
        <Field label="Email address" value={email} onChangeText={value => { setEmail(value); setError(''); }} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={value => { setPassword(value); setError(''); }} placeholder="Enter your password" secureTextEntry autoCapitalize="none" />
        {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 14, lineHeight: 20 }}>{error}</Text> : null}
        <Action title="Sign in securely" icon="lock" loading={login.isPending} disabled={!email.trim() || !password} onPress={() => void submit()} />
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'center', padding: 14 }}><Text style={{ color: colors.primary, fontWeight: '600' }}>Forgot password?</Text></Pressable>
      </Card>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
        <Text style={{ color: colors.mutedForeground }}>New to OG Exports?</Text>
        <Pressable onPress={() => router.push('/(auth)/register')}><Text style={{ color: colors.primary, fontWeight: '700' }}>Create account</Text></Pressable>
      </View>
      <View style={{ alignItems: 'center', marginTop: 22 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
          {apiOrigin ? 'Protected by secure, token-based sign-in' : 'Sign-in is ready when the investor API is configured for this build.'}
        </Text>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}