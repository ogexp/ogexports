import React, { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useLocalSearchParams } from 'expo-router';
import { Action, Card, Field } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { resolvePostAuthHref } from '@/lib/post-auth-route';
import { first, record } from '@/lib/data';
import { verifyAppPin } from '@/lib/app-pin';
import { authenticateWithBiometrics, getBiometricInfo } from '@/lib/biometrics';

export default function AppLock() {
  const { unlockApp, user, appPinEnabled, biometricEnabled } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const colors = useColors();
  const [available, setAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('biometrics');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const autoPromptStarted = useRef(false);
  const userId = first(record(user), ['id'], '');
  const nextRoute = resolvePostAuthHref(returnTo);
  const canUseBiometrics = biometricEnabled && available;

  useEffect(() => {
    let active = true;
    getBiometricInfo()
      .then(info => {
        if (!active) return;
        setAvailable(info.available);
        setBiometricName(info.name);
      })
      .catch(() => { if (active) setAvailable(false); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!canUseBiometrics || checking || autoPromptStarted.current) return;
    autoPromptStarted.current = true;
    void authenticate();
  }, [canUseBiometrics, checking]);

  async function authenticate() {
    setError('');
    setBusy(true);
    try {
      const result = await authenticateWithBiometrics('Verify your identity to unlock OG Exports');
      if (result.success) {
        unlockApp();
        router.replace(nextRoute);
      } else if (!['user_cancel', 'app_cancel', 'system_cancel'].includes(result.error)) {
        setError(result.error === 'lockout'
          ? `${biometricName} is temporarily locked. Use your app PIN or account password.`
          : `${biometricName} was not verified. Try again, use your app PIN, or sign in with your password.`);
      }
    } catch {
      setError(`Biometric authentication is unavailable. Use your app PIN or account password.`);
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
            ? `Enter your six-digit app PIN or unlock with ${biometricName}.`
            : checking
              ? 'Checking this device’s biometric security…'
              : canUseBiometrics
                ? `Your saved session is protected by ${biometricName}. A successful check unlocks this device.`
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
          <Action title={`Unlock with ${biometricName}`} icon="unlock" loading={busy} onPress={() => void authenticate()} />
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