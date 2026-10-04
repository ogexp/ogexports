import React, { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field, Screen } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf, record } from '@/lib/data';
import { useInvestorMobileLogin } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Login() {
  const { apiOrigin, updateOrigin, setChallenge, acceptSession } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const login = useInvestorMobileLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(apiOrigin);
  const [showServer, setShowServer] = useState(!apiOrigin);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      if (!apiOrigin && !server.trim()) throw new Error('Add your API server address to connect your investor account.');
      if (server.trim()) await updateOrigin(server);
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
        <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: '#1f6d4c', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Image source={require('../../assets/images/icon.png')} style={{ width: 58, height: 58 }} />
        </View>
        <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '700', marginTop: 18 }}>Your capital, clearly.</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 7 }}>Sign in to your OG Exports investor account.</Text>
      </View>
      <Card>
        {showServer ? <Field label="Investor API address" value={server} onChangeText={setServer} placeholder="https://api.yourcompany.com" keyboardType="default" autoCapitalize="none" /> : <Pressable onPress={() => setShowServer(true)} style={{ marginBottom: 12 }}><Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Connected to {apiOrigin} · Change server</Text></Pressable>}
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" />
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