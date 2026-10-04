import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf, record } from '@/lib/data';
import { useInvestorRegister } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Register() {
  const { setChallenge } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mutation = useInvestorRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    setError('');
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('The password and confirmation do not match.'); return; }
    try {
      await mutation.mutateAsync({ data: { name: name.trim(), email: email.trim(), phone: phone.trim(), country: country.trim(), password, password_confirmation: confirmPassword, account_type: 'investor' } });
      setChallenge({ email: email.trim(), mode: 'email' });
      router.push('/(auth)/verify');
    } catch (err) { setError(messageOf(err)); }
  }
  return <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }} bottomOffset={72} keyboardShouldPersistTaps="handled">
    <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: '700', marginBottom: 6 }}>Start investing</Text>
    <Text style={{ color: colors.mutedForeground, marginBottom: 20 }}>Create your investor account. A verification code will be sent to your email.</Text>
    <Card>
      <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Email address" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
      <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
      <Field label="Country" value={country} onChangeText={setCountry} placeholder="Country of residence" />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>The investor API verifies email during registration; it does not provide a phone-verification step.</Text>
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
      <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter your password" secureTextEntry autoCapitalize="none" />
      {error ? <Text style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Create investor account" loading={mutation.isPending} disabled={!name.trim() || !email.trim() || !password || !confirmPassword} onPress={() => void submit()} />
    </Card>
    <Pressable onPress={() => router.back()}><Text style={{ textAlign: 'center', color: colors.primary, fontWeight: '700', padding: 12 }}>Already have an account? Sign in</Text></Pressable>
  </KeyboardAwareScrollViewCompat>;
}