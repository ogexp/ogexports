import React, { useEffect, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { Action, Card } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { resolvePostAuthHref } from '@/lib/post-auth-route';

export default function AppLock() {
  const { unlockApp } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const colors = useColors();
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hardware, enrolled]) => { if (active) setAvailable(hardware && enrolled); })
      .catch(() => { if (active) setAvailable(false); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  async function authenticate() {
    setError('');
    setBusy(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock OG Exports Investor',
        cancelLabel: 'Use password',
        disableDeviceFallback: false,
      });
      if (result.success) {
        unlockApp();
        router.replace(resolvePostAuthHref(returnTo));
      } else if (result.error === 'user_fallback') {
        router.replace('/(auth)/login');
      } else {
        setError('Authentication was not completed. Try again or sign in with your password.');
      }
    } catch {
      setError('Biometric authentication is unavailable on this device. Sign in with your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 22 }}>
      <View style={{ alignItems: 'center', marginBottom: 22 }}>
        <Image source={require('../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 116, height: 88 }} />
        <Text style={{ color: colors.foreground, fontSize: 25, fontWeight: '700', marginTop: 18 }}>Welcome back</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>Unlock your OG Exports account</Text>
      </View>
      <Card>
        <Text style={{ color: colors.foreground, lineHeight: 21, marginBottom: 16 }}>
          {Platform.OS === 'web'
            ? 'Continue with your account password to access your investor account.'
            : checking
              ? 'Checking this device’s biometric capability…'
              : available
                ? 'Use your enrolled biometric or device passcode to unlock.'
                : 'Biometrics are not enrolled on this device. Sign in with your account password.'}
        </Text>
        {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 14 }}>{error}</Text> : null}
        {Platform.OS !== 'web' && available ? <Action title="Unlock securely" icon="lock" loading={busy} onPress={() => void authenticate()} /> : null}
        <View style={{ marginTop: available && Platform.OS !== 'web' ? 10 : 0 }}>
          <Action title={available && Platform.OS !== 'web' ? 'Use password instead' : 'Sign in with password'} icon="log-in" secondary={available && Platform.OS !== 'web'} onPress={() => router.replace({ pathname: '/(auth)/login', params: { returnTo } })} />
        </View>
      </Card>
    </View>
  );
}