import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf, record } from '@/lib/data';
import { useInvestorMobileLogin } from '@workspace/api-client-react';
import { validOrigin } from '@/lib/api-config';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Login() {
  const { apiOrigin, updateOrigin, setChallenge, acceptSession } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const login = useInvestorMobileLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [serverAddress, setServerAddress] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSaving, setServerSaving] = useState(false);

  async function saveServer() {
    setServerError('');
    if (!validOrigin(serverAddress)) {
      setServerError('Enter a valid server address beginning with https:// or http://.');
      return;
    }
    setServerSaving(true);
    try {
      await updateOrigin(serverAddress);
      setServerAddress(serverAddress.trim().replace(/\/+$/, '').replace(/\/api$/i, ''));
    } catch (err) {
      setServerError(messageOf(err));
    } finally {
      setServerSaving(false);
    }
  }

  async function submit() {
    setError('');
    if (!apiOrigin) {
      setError('Connect the investor API server above before signing in.');
      return;
    }
    try {
      const result = record(await login.mutateAsync({ data: { email: email.trim(), password, device_name: 'og_investor_mobile' } }));
      const user = record(result.user);
      if (result.requires_2fa) {
        setChallenge({ email: email.trim(), token: String(result.token ?? ''), mode: '2fa' });
        router.push('/(auth)/verify');
      } else if (result.requires_verification) {
        setChallenge({ email: email.trim(), mode: 'email' });
        router.push('/(auth)/verify');
      } else if (typeof result.token === 'string') {
        await acceptSession(result.token, user);
        router.replace('/(tabs)');
      } else {
        throw new Error('The server response did not include a session token.');
      }
    } catch (err) {
      const payload = record(record(err).data);
      if (payload.requires_verification) {
        setChallenge({ email: email.trim(), mode: 'email' });
        router.push('/(auth)/verify');
        return;
      }
      setError(messageOf(err));
    }
  }

  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24, paddingHorizontal: 22, justifyContent: 'center' }} bottomOffset={72} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 26 }}>
        <Image source={require('../../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 76, height: 62 }} />
        <Text style={{ color: colors.primary, fontSize: 25, fontWeight: '700', marginTop: 18 }}>OG Exports</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 7 }}>Global Trade. Smart Investment.</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 5 }}>Sign in to your investor account.</Text>
      </View>
      {!apiOrigin ? <Card style={{ marginBottom: 14 }}>
        <Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 7 }}>Connect the investor API</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
          Enter your development server address once to enable registration, login, and verification.
        </Text>
        <Field label="API server address" value={serverAddress} onChangeText={value => { setServerAddress(value); setServerError(''); }} placeholder="https://api.example.com" autoCapitalize="none" />
        {serverError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 10 }}>{serverError}</Text> : null}
        <Action title="Save API server" icon="globe" secondary loading={serverSaving} disabled={!serverAddress.trim()} onPress={() => void saveServer()} />
      </Card> : null}
      <Card>
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
      <View style={{ alignItems: 'center', marginTop: 22 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Protected by secure, token-based sign-in</Text></View>
    </KeyboardAwareScrollViewCompat>
  );
}