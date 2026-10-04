import React, { useEffect, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { resolvePostAuthHref } from '@/lib/post-auth-route';
import { first, record } from '@/lib/data';
import { verifyAppPin } from '@/lib/app-pin';

export default function AppLock() {
  const { unlockApp, user, appPinEnabled, biometricEnabled } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const colors = useColors();
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const userId = first(record(user), ['id'], '');
  const nextRoute = resolvePostAuthHref(returnTo);
  const canUseBiometrics = Platform.OS !== 'web' && biometricEnabled && available;

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
        cancelLabel: appPinEnabled ? 'Use app PIN' : 'Use password',
        disableDeviceFallback: false,
      });
      if (result.success) {
        unlockApp();
        router.replace(nextRoute);
      } else if (result.error === 'user_fallback' && !appPinEnabled) {
        router.replace({ pathname: '/(auth)/login', params: { returnTo } });
      } else {
        setError('Authentication was not completed. Try again or use your app PIN.');
      }
    } catch {
      setError('Biometric authentication is unavailable. Use your app PIN or account password.');
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithPin() {
    setError('');
    if (!userId) {
      setError('Your saved account could not be identified. Sign in with your password.');
      return;
    }
    setBusy(true);
    try {
      const result = await verifyAppPin(pin, userId);
      if (result.valid) {
        unlockApp();
        router.replace(nextRoute);
        return;
      }
      setPin('');
      setError(result.lockedUntil
        ? 'Too many incorrect PIN attempts. Wait one minute before trying again.'
        : 'That app PIN is incorrect.');
    } catch {
      setError('The app PIN could not be checked safely. Sign in with your password.');
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
        <Text style={{ color: colors.mutedForeground, lineHeight: 21, marginBottom: 16 }}>
          {appPinEnabled
            ? 'Enter your six-digit app PIN or use an enabled biometric on this device.'
            : checking
              ? 'Checking this device’s biometric capability…'
              : canUseBiometrics
                ? 'Use your enabled biometric or device passcode to unlock.'
                : 'Biometric unlock is unavailable. Sign in with your account password.'}
        </Text>
        {appPinEnabled ? <>
          <Field
            label="Six-digit app PIN"
            value={pin}
            onChangeText={value => { setPin(value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="000000"
            keyboardType="numeric"
            secureTextEntry
            autoCapitalize="none"
          />
          <Action title="Unlock with app PIN" icon="lock" loading={busy} disabled={pin.length !== 6} onPress={() => void unlockWithPin()} />
        </> : null}
        {canUseBiometrics ? <View style={{ marginTop: appPinEnabled ? 10 : 0 }}>
          <Action title={appPinEnabled ? 'Use biometrics' : 'Unlock securely'} icon="lock" loading={busy} onPress={() => void authenticate()} />
        </View> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 12, lineHeight: 20 }}>{error}</Text> : null}
        <View style={{ marginTop: canUseBiometrics || appPinEnabled ? 10 : 0 }}>
          <Action
            title="Sign in with password"
            icon="log-in"
            secondary={canUseBiometrics || appPinEnabled}
            onPress={() => router.replace({ pathname: '/(auth)/login', params: { returnTo } })}
          />
        </View>
      </Card>
    </View>
  );
}