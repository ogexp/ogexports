import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf, record } from '@/lib/data';
import { useInvestorMobileLogin } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Login() {
  const { apiOrigin, acceptSession } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const login = useInvestorMobileLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!apiOrigin) {
      setError('The investor API server is not configured for this build. Set EXPO_PUBLIC_API_BASE_URL before signing in.');
      return;
    }
    try {
      const result = record(await login.mutateAsync({ data: { email: email.trim(), password, device_name: 'og_investor_mobile' } }));
      const user = record(result.user);
      if (typeof result.token !== 'string') throw new Error('The server response did not include a session token.');
      await acceptSession(result.token, user);
      router.replace('/(tabs)');
    } catch (err) {
      setError(messageOf(err));
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