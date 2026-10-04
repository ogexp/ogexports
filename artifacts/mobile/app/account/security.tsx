import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useQueryClient } from '@tanstack/react-query';
import {
  useConfirmInvestorTwoFactor,
  useDisableInvestorTwoFactor,
  useEnableInvestorTwoFactor,
  useGetInvestorSecurityActivity,
  useGetInvestorSessions,
  useGetInvestorTwoFactorStatus,
  useRevokeInvestorSession,
  useRevokeOtherInvestorSessions,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

function displayDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'Date unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function Security() {
  const { token, biometricEnabled, setBiometricEnabled } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const sessions = useGetInvestorSessions({ query: { queryKey: ['investor-security-sessions'], enabled: !!token } });
  const activity = useGetInvestorSecurityActivity({ query: { queryKey: ['investor-security-activity'], enabled: !!token } });
  const twoFactor = useGetInvestorTwoFactorStatus({ query: { queryKey: ['investor-two-factor-status'], enabled: !!token } });
  const revokeSession = useRevokeInvestorSession();
  const revokeOthers = useRevokeOtherInvestorSessions();
  const enableTwoFactor = useEnableInvestorTwoFactor();
  const confirmTwoFactor = useConfirmInvestorTwoFactor();
  const disableTwoFactor = useDisableInvestorTwoFactor();
  const sessionsList = list(sessions.data);
  const activityList = list(activity.data);
  const twoFactorData = unwrap(twoFactor.data);
  const twoFactorEnabled = twoFactorData.enabled === true;
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setupRequested, setSetupRequested] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmSessionId, setConfirmSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function refreshSecurity() {
    void queryClient.invalidateQueries({ queryKey: ['investor-security-sessions'] });
    void queryClient.invalidateQueries({ queryKey: ['investor-security-activity'] });
    void queryClient.invalidateQueries({ queryKey: ['investor-two-factor-status'] });
  }

  async function verifyOnDevice() {
    if (Platform.OS === 'web') throw new Error('Device biometrics are not available in the web preview.');
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) throw new Error('Set up Face ID, fingerprint or a device passcode before enabling biometric login.');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm your identity',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (!result.success) throw new Error('Biometric authentication was not completed.');
  }

  async function toggleBiometrics() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await verifyOnDevice();
      await setBiometricEnabled(!biometricEnabled);
      setNotice(biometricEnabled ? 'Biometric login disabled on this device.' : 'Biometric login enabled on this device.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function requestTwoFactor() {
    setError('');
    setNotice('');
    try {
      const result = record(await enableTwoFactor.mutateAsync({ data: { password } }));
      setSetupRequested(true);
      setCode('');
      setNotice(first(record(result.data), ['email']) ? `A verification code was sent to ${first(record(result.data), ['email'])}.` : first(result, ['message'], 'Check your email for a verification code.'));
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function confirmTwoFactorSetup() {
    setError('');
    setNotice('');
    try {
      const result = record(await confirmTwoFactor.mutateAsync({ data: { code: code.trim() } }));
      setSetupRequested(false);
      setPassword('');
      setCode('');
      setNotice(first(result, ['message'], 'Two-factor authentication is enabled.'));
      refreshSecurity();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function turnOffTwoFactor() {
    setError('');
    setNotice('');
    try {
      const result = record(await disableTwoFactor.mutateAsync({ data: { password } }));
      setPassword('');
      setNotice(first(result, ['message'], 'Two-factor authentication is disabled.'));
      refreshSecurity();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function revokeOne(id: string) {
    setError('');
    try {
      await revokeSession.mutateAsync({ id });
      setConfirmSessionId('');
      refreshSecurity();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  async function revokeAllOthers() {
    setError('');
    try {
      await revokeOthers.mutateAsync();
      setConfirmAll(false);
      refreshSecurity();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return <Screen title="Security & devices" subtitle="Protect sign-in and review recent account activity">
    {error ? <ErrorState message={error} /> : null}
    {notice ? <Card><Text style={{ color: colors.primary, lineHeight: 20 }}>{notice}</Text></Card> : null}

    <Section title="Two-factor authentication" />
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Email verification code</Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 5, lineHeight: 18, fontSize: 12 }}>Use a code sent to the email address on your account when signing in.</Text>
        </View>
        <Status value={twoFactor.isLoading ? 'Loading' : twoFactorEnabled ? 'Enabled' : 'Disabled'} />
      </View>
      {twoFactor.isError ? <Text style={{ color: colors.destructive, marginTop: 10 }}>Two-factor status could not be loaded.</Text> : null}
      {!twoFactorEnabled && !setupRequested ? <>
        <Field label="Account password" value={password} onChangeText={setPassword} placeholder="Confirm your password" secureTextEntry autoCapitalize="none" />
        <Action title="Enable two-factor authentication" icon="shield" loading={enableTwoFactor.isPending} disabled={!password} onPress={() => void requestTwoFactor()} />
      </> : null}
      {setupRequested ? <>
        <Field label="Six-digit email code" value={code} onChangeText={setCode} placeholder="000000" keyboardType="numeric" autoCapitalize="none" />
        <Action title="Confirm and enable" icon="check" loading={confirmTwoFactor.isPending} disabled={code.trim().length !== 6} onPress={() => void confirmTwoFactorSetup()} />
      </> : null}
      {twoFactorEnabled ? <>
        <Field label="Account password" value={password} onChangeText={setPassword} placeholder="Confirm your password to disable" secureTextEntry autoCapitalize="none" />
        <Action title="Disable two-factor authentication" icon="shield-off" secondary loading={disableTwoFactor.isPending} disabled={!password} onPress={() => void turnOffTwoFactor()} />
      </> : null}
    </Card>

    <Section title="Biometric sign-in" />
    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{biometricEnabled ? 'Enabled on this device' : 'Not enabled'}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 6, lineHeight: 19, fontSize: 12 }}>
        {Platform.OS === 'web'
          ? 'Manage biometric sign-in in the mobile app on a device with Face ID or fingerprint support.'
          : 'Biometric verification stays on your device. Your saved account token remains in secure device storage.'}
      </Text>
      {Platform.OS !== 'web' ? <View style={{ marginTop: 14 }}><Action title={biometricEnabled ? 'Turn off biometric login' : 'Enable biometric login'} icon="lock" secondary={biometricEnabled} loading={busy} onPress={() => void toggleBiometrics()} /></View> : null}
    </Card>

    <Section title="Account sessions" right={sessionsList.length > 1 ? <Pressable onPress={() => setConfirmAll(value => !value)}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Revoke others</Text></Pressable> : null} />
    <Card>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>The investor server lists browser sessions. It does not currently expose a mobile-token device list, so this screen cannot revoke other mobile app tokens.</Text>
    </Card>
    {sessions.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading sessions…</Text></Card> : null}
    {sessions.isError ? <ErrorState message="Account sessions could not be loaded." onRetry={() => void sessions.refetch()} /> : null}
    {!sessions.isLoading && !sessions.isError && sessionsList.length === 0 ? <EmptyState title="No browser sessions listed" body="The server has not returned any active browser sessions." /> : null}
    {confirmAll ? <Card style={{ borderColor: colors.destructive }}>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>Revoke all other sessions?</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 5, lineHeight: 19 }}>This signs out other sessions returned by the server. Your current account session is kept when the server can identify it.</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}><Action title="Cancel" secondary onPress={() => setConfirmAll(false)} /></View>
        <View style={{ flex: 1 }}><Action title="Revoke sessions" loading={revokeOthers.isPending} onPress={() => void revokeAllOthers()} /></View>
      </View>
    </Card> : null}
    {sessionsList.map((session, index) => {
      const id = first(session, ['id'], '');
      const current = session.is_current === true;
      return <Card key={id || index}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: colors.foreground, flex: 1, fontWeight: '700' }}>{first(session, ['device'], 'Browser session')}</Text>
          {current ? <Status value="Current session" /> : null}
        </View>
        <Text style={{ color: colors.mutedForeground, marginTop: 7, fontSize: 12 }}>IP address: {first(session, ['ip'], 'Not provided')}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>Last active: {first(session, ['last_activity_human'], displayDate(session.last_activity))}</Text>
        {!current && id ? <Pressable onPress={() => setConfirmSessionId(id)} style={{ alignSelf: 'flex-start', paddingTop: 12 }}><Text style={{ color: colors.destructive, fontWeight: '700' }}>Revoke this session</Text></Pressable> : null}
        {confirmSessionId === id ? <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.foreground, marginBottom: 10 }}>Sign this browser session out?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Action title="Cancel" secondary onPress={() => setConfirmSessionId('')} /></View>
            <View style={{ flex: 1 }}><Action title="Revoke" loading={revokeSession.isPending} onPress={() => void revokeOne(id)} /></View>
          </View>
        </View> : null}
      </Card>;
    })}

    <Section title="Recent security activity" />
    {activity.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading recent activity…</Text></Card> : null}
    {activity.isError ? <ErrorState message="Recent security activity could not be loaded." onRetry={() => void activity.refetch()} /> : null}
    {!activity.isLoading && !activity.isError && activityList.length === 0 ? <EmptyState title="No recent activity" body="Account security events returned by the investor server will appear here." /> : null}
    {activityList.slice(0, 15).map((item, index) => <Card key={first(item, ['id'], String(index))}>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['action'], 'Account event')}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 5, fontSize: 12 }}>{first(item, ['module'], 'Account')} · IP {first(item, ['ip'], 'not provided')}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>{first(item, ['time'], displayDate(item.created_at))}</Text>
    </Card>)}
  </Screen>;
}