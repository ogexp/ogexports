import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  useConfirmInvestorTwoFactor,
  useDisableInvestorTwoFactor,
  useEnableInvestorTwoFactor,
  useGetInvestorSecurityActivity,
  useGetInvestorSessions,
  useGetInvestorTransactionPasswordStatus,
  useGetInvestorTwoFactorStatus,
  useInvestorMobileLogout,
  useRevokeInvestorSession,
  useRevokeOtherInvestorSessions,
} from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { saveAppPin, verifyAppPin } from '@/lib/app-pin';
import { authenticateWithBiometrics, getBiometricInfo, type BiometricInfo } from '@/lib/biometrics';

function displayDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'Date unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    'login.success': 'Successful sign-in',
    'login.mobile_success': 'Mobile sign-in',
    'login.2fa_success': 'Sign-in verified with 2FA',
    'password.changed': 'Sign-in password changed',
    'password.reset': 'Sign-in password reset',
    'email.verified': 'Email address verified',
    '2fa.enable_requested': 'Two-factor setup requested',
    '2fa.enabled': 'Two-factor authentication enabled',
    '2fa.disabled': 'Two-factor authentication disabled',
    'transaction_password.set': 'Transaction password set',
    'transaction_password.reset': 'Transaction password changed',
    'session.revoked': 'Device session revoked',
    'session.revoked_others': 'Other device sessions revoked',
    'logout.mobile': 'Mobile device signed out',
  };
  if (labels[action]) return labels[action];
  return action.split(/[._]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ') || 'Security activity';
}

export default function Security() {
  const { token, user, biometricEnabled, appPinEnabled, setBiometricEnabled, setAppPinEnabled, signOut } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const sessions = useGetInvestorSessions({ query: { queryKey: ['investor-security-sessions'], enabled: !!token } });
  const activity = useGetInvestorSecurityActivity({ query: { queryKey: ['investor-security-activity'], enabled: !!token } });
  const twoFactor = useGetInvestorTwoFactorStatus({ query: { queryKey: ['investor-two-factor-status'], enabled: !!token } });
  const transactionPassword = useGetInvestorTransactionPasswordStatus({
    query: { queryKey: ['investor-transaction-password-status'], enabled: !!token },
  });
  const revokeSession = useRevokeInvestorSession();
  const revokeOthers = useRevokeOtherInvestorSessions();
  const logout = useInvestorMobileLogout();
  const enableTwoFactor = useEnableInvestorTwoFactor();
  const confirmTwoFactor = useConfirmInvestorTwoFactor();
  const disableTwoFactor = useDisableInvestorTwoFactor();
  const sessionsList = list(sessions.data);
  const activityList = list(activity.data).filter(item => first(item, ['module']).toLowerCase() === 'security');
  const twoFactorData = unwrap(twoFactor.data);
  const twoFactorEnabled = twoFactorData.enabled === true;
  const transactionPasswordData = unwrap(transactionPassword.data);
  const transactionPasswordSet = transactionPasswordData.has_transaction_password === true
    || transactionPasswordData.set === true
    || transactionPasswordData.is_set === true
    || transactionPasswordData.configured === true;
  const userId = first(record(user), ['id'], '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [setupRequested, setSetupRequested] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [confirmSessionId, setConfirmSessionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [biometricName, setBiometricName] = useState('biometrics');
  const [biometricInfo, setBiometricInfo] = useState<BiometricInfo | null>(null);
  const [biometricChecking, setBiometricChecking] = useState(true);
  const [biometricError, setBiometricError] = useState('');
  const [biometricNotice, setBiometricNotice] = useState('');

  async function refreshBiometricInfo() {
    setBiometricChecking(true);
    try {
      const info = await getBiometricInfo();
      setBiometricInfo(info);
      setBiometricName(info.name);
    } catch (err) {
      const reason = messageOf(err);
      setBiometricInfo({ available: false, name: 'biometrics', reason: `The app could not check biometrics: ${reason}` });
    } finally {
      setBiometricChecking(false);
    }
  }

  useEffect(() => {
    void refreshBiometricInfo();
  }, []);

  function refreshSecurity() {
    void queryClient.invalidateQueries({ queryKey: ['investor-security-sessions'] });
    void queryClient.invalidateQueries({ queryKey: ['investor-security-activity'] });
    void queryClient.invalidateQueries({ queryKey: ['investor-two-factor-status'] });
  }

  function clearPinFields() {
    setCurrentPin('');
    setNewPin('');
    setConfirmNewPin('');
  }

  async function checkCurrentPin() {
    if (!userId) throw new Error('The signed-in account could not be identified.');
    const result = await verifyAppPin(currentPin, userId);
    if (!result.valid) {
      throw new Error(result.lockedUntil
        ? 'Too many incorrect PIN attempts. Wait one minute before trying again.'
        : 'The current app PIN is incorrect.');
    }
  }

  async function saveNewPin() {
    setError('');
    setNotice('');
    if (!/^\d{6}$/.test(newPin)) { setError('Choose a six-digit app PIN.'); return; }
    if (newPin !== confirmNewPin) { setError('The new PIN entries do not match.'); return; }
    setBusy(true);
    try {
      if (appPinEnabled) await checkCurrentPin();
      if (!userId) throw new Error('The signed-in account could not be identified.');
      await saveAppPin(newPin, userId);
      await setAppPinEnabled(true);
      clearPinFields();
      setNotice(appPinEnabled ? 'Your app PIN has been changed.' : 'App PIN lock is enabled on this device.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function disablePin() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await checkCurrentPin();
      await setAppPinEnabled(false);
      clearPinFields();
      setNotice('App PIN lock is disabled on this device.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOnDevice(): Promise<string> {
    const info = await getBiometricInfo();
    setBiometricInfo(info);
    setBiometricName(info.name);
    if (!info.available) throw new Error(info.reason ?? `Set up ${info.name} on this device before enabling biometric sign-in.`);
    const result = await authenticateWithBiometrics(`Confirm ${info.name} sign-in`);
    if (!result.success) {
      if (['user_cancel', 'app_cancel', 'system_cancel'].includes(result.error)) {
        throw new Error('Verification cancelled. No security settings were changed.');
      }
      const authErrorMessages: Record<string, string> = {
        not_available: `${info.name} authentication is not available in this app session. Open the installed mobile app and try again.`,
        not_enrolled: `No ${info.name} is enrolled on this device. Set it up in device settings and try again.`,
        lockout: `${info.name} is temporarily locked. Unlock your device with its passcode, then try again.`,
        lockout_permanent: `${info.name} is locked on this device. Unlock it with your device passcode, then try again.`,
        passcode_not_set: 'Set a device passcode before enabling biometric sign-in.',
        authentication_failed: `${info.name} did not verify. Try again; no security settings were changed.`,
      };
      throw new Error(authErrorMessages[result.error] ?? `${info.name} verification failed (${result.error}). No security settings were changed.`);
    }
    return info.name;
  }

  async function toggleBiometrics() {
    setError('');
    setNotice('');
    setBiometricError('');
    setBiometricNotice('');
    setBusy(true);
    try {
      let verifiedName = biometricName;
      if (!biometricEnabled) {
        verifiedName = await verifyOnDevice();
      } else {
        const info = await getBiometricInfo();
        setBiometricName(info.name);
        verifiedName = info.name;
        if (info.available) verifiedName = await verifyOnDevice();
      }
      await setBiometricEnabled(!biometricEnabled);
      const message = biometricEnabled
        ? `${verifiedName} sign-in disabled on this device.`
        : `${verifiedName} sign-in enabled on this device.`;
      setBiometricNotice(message);
      await refreshBiometricInfo();
    } catch (err) {
      setBiometricError(messageOf(err));
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

  async function logoutAllDevices() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await revokeOthers.mutateAsync();
      await logout.mutateAsync();
      queryClient.clear();
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      setError(`Other sessions may already be revoked, but this device could not complete sign-out: ${messageOf(err)}`);
    } finally {
      setBusy(false);
    }
  }

  function openSettings() {
    router.push('/account/settings');
  }

  return <Screen title="Security & devices" subtitle="Manage app unlock, email verification, and active sessions">
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

    <Section title="App PIN lock" />
    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{appPinEnabled ? 'Enabled on this device' : 'Not enabled'}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 6, marginBottom: 4, lineHeight: 19, fontSize: 12 }}>
        The six-digit PIN is stored in secure device storage and is rate-limited after repeated incorrect attempts.
      </Text>
      {Platform.OS === 'web' ? <Text style={{ color: colors.mutedForeground, marginTop: 8, fontSize: 12 }}>
        Set up an app PIN in the mobile app.
      </Text> : <>
        {appPinEnabled ? <Field
          label="Current app PIN"
          value={currentPin}
          onChangeText={value => setCurrentPin(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="numeric"
          secureTextEntry
          autoCapitalize="none"
        /> : null}
        <Field
          label={appPinEnabled ? 'New six-digit app PIN' : 'Create six-digit app PIN'}
          value={newPin}
          onChangeText={value => setNewPin(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="numeric"
          secureTextEntry
          autoCapitalize="none"
        />
        <Field
          label={appPinEnabled ? 'Confirm new PIN' : 'Confirm app PIN'}
          value={confirmNewPin}
          onChangeText={value => setConfirmNewPin(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="numeric"
          secureTextEntry
          autoCapitalize="none"
        />
        <Action
          title={appPinEnabled ? 'Change app PIN' : 'Enable app PIN'}
          icon="lock"
          loading={busy}
          disabled={newPin.length !== 6 || confirmNewPin.length !== 6 || (appPinEnabled && currentPin.length !== 6)}
          onPress={() => void saveNewPin()}
        />
        {appPinEnabled ? <View style={{ marginTop: 10 }}>
          <Action
            title="Disable app PIN"
            secondary
            loading={busy}
            disabled={currentPin.length !== 6}
            onPress={() => void disablePin()}
          />
        </View> : null}
      </>}
    </Card>

    <Section title={biometricName === 'Face ID' ? 'Face ID' : 'Biometric'} />
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>{biometricName}</Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>
            {biometricEnabled ? 'Enabled on this device' : 'Not enabled'}
          </Text>
        </View>
        <Status value={biometricEnabled ? 'Enabled' : 'Not enabled'} />
      </View>
      <Text style={{ color: colors.mutedForeground, marginTop: 10, lineHeight: 18, fontSize: 12 }}>
        {Platform.OS === 'web'
          ? 'Use the installed mobile app to open your device’s biometric prompt.'
          : biometricChecking
            ? 'Checking Face ID or fingerprint…'
            : biometricInfo?.available
              ? `${biometricName} is ready. Tap Biometric to open the phone’s verification prompt.`
              : biometricInfo?.reason ?? 'Biometric availability could not be confirmed on this device.'}
      </Text>
      {biometricError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 10, fontSize: 12, lineHeight: 18 }}>{biometricError}</Text> : null}
      {biometricNotice ? <Text style={{ color: colors.primary, marginTop: 10, fontSize: 12, lineHeight: 18 }}>{biometricNotice}</Text> : null}
      {Platform.OS !== 'web' ? <>
        <View style={{ marginTop: 14 }}>
          <Action
            title={biometricEnabled
              ? 'Turn off biometric'
              : 'Biometric'}
            icon="unlock"
            secondary={biometricEnabled}
            loading={busy || biometricChecking}
            disabled={biometricChecking}
            testID="security-biometric-action"
            onPress={() => void toggleBiometrics()}
          />
        </View>
      </> : null}
    </Card>

    <Section title="Password & transaction security" />
    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>Sign-in password</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 5, marginBottom: 11, lineHeight: 18, fontSize: 12 }}>
        Change your account password with your current password as verification.
      </Text>
      <Action title="Change sign-in password" icon="key" secondary onPress={openSettings} />
      <View style={{ height: 14 }} />
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>Withdrawal transaction password</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 5, marginBottom: 11, lineHeight: 18, fontSize: 12 }}>
        {transactionPassword.isLoading
          ? 'Checking transaction authentication…'
          : transactionPassword.isError
            ? 'Transaction-password status could not be loaded.'
            : transactionPasswordSet
              ? 'A transaction password is set. Withdrawals also require an email verification code.'
              : 'Set a transaction password. Withdrawals also require an email verification code.'}
      </Text>
      {transactionPassword.isError ? <Pressable onPress={() => void transactionPassword.refetch()} style={{ marginBottom: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Retry status check</Text>
      </Pressable> : null}
      <Action title={transactionPasswordSet ? 'Manage transaction password' : 'Set transaction password'} icon="shield" secondary onPress={openSettings} />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>
        OG Exports verifies the email code and transaction password when a withdrawal is submitted.
      </Text>
      <View style={{ marginTop: 10 }}>
        <Action title="Review withdrawal verification" icon="arrow-right" secondary onPress={() => router.push('/wallet/withdraw')} />
      </View>
    </Card>

    <Section title="Account sessions" right={sessionsList.length > 1 ? <Pressable onPress={() => setConfirmAll(value => !value)}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Revoke others</Text></Pressable> : null} />
    <Card><Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
      Review devices signed in to this investor account and revoke any session you no longer use.
    </Text></Card>
    {sessions.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading sessions…</Text></Card> : null}
    {sessions.isError ? <ErrorState message="Account sessions could not be loaded." onRetry={() => void sessions.refetch()} /> : null}
    {!sessions.isLoading && !sessions.isError && sessionsList.length === 0 ? <EmptyState title="No active sessions" body="No active investor sessions were returned." /> : null}
    {confirmAll ? <Card style={{ borderColor: colors.destructive }}>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>Revoke all other sessions?</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 5, lineHeight: 19 }}>This signs out every other active device and keeps this session signed in.</Text>
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
          <Text style={{ color: colors.foreground, flex: 1, fontWeight: '700' }}>{first(session, ['device'], 'Mobile session')}</Text>
          {current ? <Status value="Current session" /> : null}
        </View>
        <Text style={{ color: colors.mutedForeground, marginTop: 5, fontSize: 11 }}>{first(session, ['session_type'], 'Account session')}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 7, fontSize: 12 }}>Last active: {displayDate(session.last_activity)}</Text>
        {first(session, ['ip']) ? <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 11 }}>IP address: {first(session, ['ip'])}</Text> : null}
        {!current && id ? <Pressable onPress={() => setConfirmSessionId(id)} style={{ alignSelf: 'flex-start', paddingTop: 12 }}><Text style={{ color: colors.destructive, fontWeight: '700' }}>Revoke this session</Text></Pressable> : null}
        {confirmSessionId === id ? <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.foreground, marginBottom: 10 }}>Sign this device out?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Action title="Cancel" secondary onPress={() => setConfirmSessionId('')} /></View>
            <View style={{ flex: 1 }}><Action title="Revoke" loading={revokeSession.isPending} onPress={() => void revokeOne(id)} /></View>
          </View>
        </View> : null}
      </Card>;
    })}

    <Section title="Login activity" />
    <Card>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
        Recent sign-ins and security changes recorded by OG Exports.
      </Text>
    </Card>
    {activity.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading security activity…</Text></Card> : null}
    {activity.isError ? <ErrorState message="Login activity could not be loaded." onRetry={() => void activity.refetch()} /> : null}
    {!activity.isLoading && !activity.isError && activityList.length === 0
      ? <EmptyState title="No security activity" body="OG Exports has not returned any recent security events." />
      : null}
    {activityList.map((item, index) => {
      const meta = record(item.meta);
      const device = first(meta, ['device']);
      const channel = first(meta, ['channel']);
      return <Card key={first(item, ['id'], `${first(item, ['action'], 'activity')}-${index}`)}>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>{activityLabel(first(item, ['action']))}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 6, fontSize: 12 }}>{displayDate(item.created_at)}</Text>
        {device || channel ? <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 11 }}>
          {device || (channel === 'mobile' ? 'Mobile app' : 'Account activity')}
        </Text> : null}
        {first(item, ['ip']) ? <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 11 }}>IP address: {first(item, ['ip'])}</Text> : null}
      </Card>;
    })}

    <Section title="Sign out everywhere" />
    <Card style={{ borderColor: colors.destructive }}>
      <Text style={{ color: colors.foreground, fontWeight: '700' }}>End every active session</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 5, marginBottom: 12, fontSize: 12, lineHeight: 18 }}>
        This revokes other browser and mobile sessions, then signs this device out.
      </Text>
      {!confirmLogoutAll
        ? <Action title="Log out from all devices" icon="log-out" secondary onPress={() => setConfirmLogoutAll(true)} />
        : <>
          <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 12, lineHeight: 18 }}>
            You will need to sign in again on this device and every other device.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Action title="Cancel" secondary onPress={() => setConfirmLogoutAll(false)} /></View>
            <View style={{ flex: 1 }}><Action title="Confirm logout" icon="log-out" loading={busy || revokeOthers.isPending || logout.isPending} onPress={() => void logoutAllDevices()} /></View>
          </View>
        </>}
    </Card>
  </Screen>;
}