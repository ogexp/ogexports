import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  useGetInvestorProfile,
  useGetInvestorWallet,
  useGetInvestorTransactionPasswordStatus,
  useInvestorMobileLogout,
  useRegisterInvestorPushToken,
  useRevokeInvestorPushToken,
  useResetInvestorTransactionPassword,
  useSetInvestorTransactionPassword,
  useUpdateInvestorMe,
  useUpdateInvestorPassword,
  useUpdateInvestorProfile,
} from '@workspace/api-client-react';
import { Action, Card, Field, Screen } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { first, list, messageOf, record, unwrap, type Json } from '@/lib/data';
import { validOrigin } from '@/lib/api-config';
import { useColors } from '@/hooks/useColors';

const pushEnabledKey = (userId: string) => `og-investor-push-enabled:${userId}`;
const pushTokenKey = (userId: string) => `og-investor-push-token:${userId}`;

export default function Settings() {
  const { token, user, apiOrigin, updateOrigin, updateUser, signOut } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const userId = first(record(user), ['id']);
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token } });
  const walletQuery = useGetInvestorWallet({ query: { queryKey: ['investor-wallet'], enabled: !!token, staleTime: 30_000 } });
  const transactionPasswordQuery = useGetInvestorTransactionPasswordStatus({
    query: { queryKey: ['investor-transaction-password-status'], enabled: !!token },
  });
  const updateProfile = useUpdateInvestorProfile();
  const updateMe = useUpdateInvestorMe();
  const updatePassword = useUpdateInvestorPassword();
  const setTransactionPassword = useSetInvestorTransactionPassword();
  const resetTransactionPassword = useResetInvestorTransactionPassword();
  const logout = useInvestorMobileLogout();
  const registerPushToken = useRegisterInvestorPushToken();
  const revokePushToken = useRevokeInvestorPushToken();
  const profile = unwrap(profileQuery.data);
  const wallet = unwrap(walletQuery.data);
  const walletCurrency = first(wallet, ['currency', 'default_currency']);
  const savedAccount = record(profile.default_bank_account);
  const profileAccounts = list(profile.bank_accounts);
  const transactionPasswordStatus = unwrap(transactionPasswordQuery.data);
  const hasTransactionPassword = transactionPasswordStatus.has_transaction_password === true
    || transactionPasswordStatus.set === true
    || transactionPasswordStatus.is_set === true
    || transactionPasswordStatus.configured === true;
  const [server, setServer] = useState(apiOrigin);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [branch, setBranch] = useState('');
  const [bankCurrency, setBankCurrency] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginPasswordForTransaction, setLoginPasswordForTransaction] = useState('');
  const [newTransactionPassword, setNewTransactionPassword] = useState('');
  const [confirmTransactionPassword, setConfirmTransactionPassword] = useState('');
  const [error, setError] = useState('');
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const expoProjectId = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? '';

  useEffect(() => {
    setServer(apiOrigin);
    if (profileQuery.data) {
      setBankName(first(savedAccount, ['bank_name']));
      setAccountHolder(first(savedAccount, ['account_holder']));
      setAccountNumber(first(savedAccount, ['account_number']));
      setIban(first(savedAccount, ['iban']));
      setSwift(first(savedAccount, ['swift']));
      setBranch(first(savedAccount, ['branch']));
      setBankCurrency(first(savedAccount, ['currency']));
    }
  }, [apiOrigin, profileQuery.data]);

  useEffect(() => {
    const account = record(user);
    setName(first(account, ['name']));
    setPhone(first(account, ['mobile']));
    setCountry(first(account, ['country']));
  }, [user]);

  useEffect(() => {
    let active = true;
    setPushEnabled(null);
    setPushError('');
    if (!userId) {
      setPushEnabled(false);
      return () => { active = false; };
    }
    void AsyncStorage.getItem(pushEnabledKey(userId))
      .then(value => { if (active) setPushEnabled(value === 'enabled'); })
      .catch(() => { if (active) setPushEnabled(false); });
    return () => { active = false; };
  }, [userId]);

  async function enablePushNotifications() {
    setPushError('');
    if (Platform.OS === 'web') {
      setPushError('Push notifications can only be enabled on an iOS or Android device.');
      return;
    }
    if (!expoProjectId) {
      setPushError('Push notifications are not configured for this app build yet. Device permission was not requested.');
      return;
    }
    if (!userId) {
      setPushError('Sign in again before enabling push notifications.');
      return;
    }

    setPushBusy(true);
    try {
      const notifications = await import('expo-notifications');
      if (Platform.OS === 'android') {
        await notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: notifications.AndroidImportance.DEFAULT,
        });
      }

      let permission = await notifications.getPermissionsAsync();
      if (!permission.granted) permission = await notifications.requestPermissionsAsync();
      if (!permission.granted) {
        if (permission.status === 'denied' && !permission.canAskAgain) {
          Alert.alert(
            'Notifications are blocked',
            'Allow notifications in your device settings to enable investor updates.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS !== 'web') {
                    void Linking.openSettings().catch(() => {
                      setPushError('Device settings could not be opened. Enable notifications from system settings.');
                    });
                  }
                },
              },
            ],
          );
        }
        return;
      }

      const devicePushToken = (await notifications.getExpoPushTokenAsync({
        projectId: expoProjectId,
      })).data;
      const secureKey = pushTokenKey(userId);
      await SecureStore.setItemAsync(secureKey, devicePushToken);
      try {
        await registerPushToken.mutateAsync({
          data: {
            expo_push_token: devicePushToken,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
          },
        });
        await AsyncStorage.setItem(pushEnabledKey(userId), 'enabled');
      } catch (registrationError) {
        try {
          await revokePushToken.mutateAsync({ data: { expo_push_token: devicePushToken } });
        } catch {
          // A failed registration may already have been revoked by the server.
        }
        await SecureStore.deleteItemAsync(secureKey).catch(() => undefined);
        throw registrationError;
      }
      setPushEnabled(true);
      Alert.alert('Notifications enabled', 'This device is registered for investor push updates.');
    } catch (pushRegistrationError) {
      setPushError(messageOf(pushRegistrationError));
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePushNotifications() {
    setPushError('');
    if (!userId) {
      setPushError('Sign in again before changing push notification settings.');
      return;
    }
    setPushBusy(true);
    try {
      const secureKey = pushTokenKey(userId);
      const devicePushToken = await SecureStore.getItemAsync(secureKey);
      if (!devicePushToken) {
        throw new Error('This device has no saved push token to revoke. Sign out and back in, then enable notifications again.');
      }
      await revokePushToken.mutateAsync({ data: { expo_push_token: devicePushToken } });
      await Promise.all([
        SecureStore.deleteItemAsync(secureKey),
        AsyncStorage.removeItem(pushEnabledKey(userId)),
      ]);
      setPushEnabled(false);
    } catch (pushRevocationError) {
      setPushError(messageOf(pushRevocationError));
    } finally {
      setPushBusy(false);
    }
  }

  async function saveProfile() {
    setError('');
    const hasBankInput = [bankName, accountHolder, accountNumber, iban, swift, branch].some(value => value.trim());
    if (hasBankInput && (!bankName.trim() || !accountHolder.trim() || !(accountNumber.trim() || iban.trim()))) {
      setError('For a payout account, enter the bank, account holder, and an account number or IBAN.');
      return;
    }
    try {
      const saved = record(await updateMe.mutateAsync({
        data: { name: name.trim(), mobile: phone.trim(), country: country.trim() },
      }));
      const savedUser = record(saved.user);
      if (!first(savedUser, ['id'])) throw new Error('The server did not return the updated profile.');
      await updateUser(savedUser as Json);

      if (hasBankInput) {
        const id = first(savedAccount, ['id'], 'mobile-default');
        const bankAccounts = [
          ...profileAccounts
            .filter(account => first(account, ['id']) !== id)
            .map(account => ({ ...account, is_default: false })),
          {
            id,
            bank_name: bankName.trim(),
            account_holder: accountHolder.trim(),
            account_number: accountNumber.trim(),
            iban: iban.trim(),
            swift: swift.trim(),
            branch: branch.trim(),
            currency: bankCurrency.trim() || undefined,
            is_default: true,
          },
        ];
        const request: Parameters<typeof updateProfile.mutateAsync>[0] = {
          data: { name: name.trim(), phone: phone.trim(), country: country.trim(), bank_accounts: bankAccounts },
        };
        await updateProfile.mutateAsync(request);
      }
      Alert.alert(
        'Profile updated',
        hasBankInput ? 'Your profile and payout details have been saved.' : 'Your profile details have been saved.',
      );
      void profileQuery.refetch();
    } catch (err) { setError(messageOf(err)); }
  }

  async function savePassword() {
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }
    try {
      await updatePassword.mutateAsync({ data: { current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your sign-in password has been changed.');
    } catch (err) { setError(messageOf(err)); }
  }

  async function saveTransactionPassword() {
    setError('');
    if (newTransactionPassword.length < 6) {
      setError('Use at least 6 characters for the transaction password.');
      return;
    }
    if (newTransactionPassword !== confirmTransactionPassword) {
      setError('The transaction password and confirmation do not match.');
      return;
    }
    try {
      if (hasTransactionPassword) {
        await resetTransactionPassword.mutateAsync({
          data: {
            password: loginPasswordForTransaction,
            transaction_password: newTransactionPassword,
            transaction_password_confirmation: confirmTransactionPassword,
          },
        });
      } else {
        await setTransactionPassword.mutateAsync({
          data: {
            password: loginPasswordForTransaction,
            transaction_password: newTransactionPassword,
            transaction_password_confirmation: confirmTransactionPassword,
          },
        });
      }
      setLoginPasswordForTransaction('');
      setNewTransactionPassword('');
      setConfirmTransactionPassword('');
      await transactionPasswordQuery.refetch();
      Alert.alert('Transaction password updated', 'You can use it to confirm withdrawals.');
    } catch (err) { setError(messageOf(err)); }
  }

  async function changeServer() {
    setError('');
    if (!validOrigin(server)) {
      setError('Enter a valid address beginning with https:// (or http:// for local development).');
      return;
    }
    try {
      await updateOrigin(server);
      Alert.alert('Server saved', 'The app will use this investor API server.');
    } catch (err) { setError(messageOf(err)); }
  }

  async function signOutNow() {
    if (userId) {
      try {
        const devicePushToken = await SecureStore.getItemAsync(pushTokenKey(userId));
        if (devicePushToken) {
          await revokePushToken.mutateAsync({ data: { expo_push_token: devicePushToken } });
        }
      } catch {
        // Session revocation still prevents the server from selecting this device for future pushes.
      }
      await Promise.all([
        SecureStore.deleteItemAsync(pushTokenKey(userId)),
        AsyncStorage.removeItem(pushEnabledKey(userId)),
      ]).catch(() => undefined);
    }
    try { await logout.mutateAsync(); } catch { /* Removing the local token still signs this device out. */ }
    queryClient.clear();
    await signOut();
    router.replace('/(auth)/login');
  }

  const transactionPasswordBusy = setTransactionPassword.isPending || resetTransactionPassword.isPending;
  return <Screen title="Settings" subtitle="Profile, payout details, security and server connection">
    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Profile details</Text>
      <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Mobile number" value={phone} onChangeText={setPhone} placeholder="+92 300 1234567" keyboardType="phone-pad" />
      <Field label="Country / region" value={country} onChangeText={setCountry} placeholder="Country of residence" />
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15, marginBottom: 10 }}>Default payout bank account</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>These details are used for withdrawals. You can also enter different details for a single withdrawal.</Text>
      <Field label="Bank name" value={bankName} onChangeText={setBankName} placeholder="Bank name" />
      <Field label="Account holder" value={accountHolder} onChangeText={setAccountHolder} placeholder="Name on the account" />
      <Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" autoCapitalize="none" />
      <Field label="IBAN (optional if account number is provided)" value={iban} onChangeText={setIban} placeholder="IBAN" autoCapitalize="none" />
      <Field label="SWIFT / BIC (optional)" value={swift} onChangeText={setSwift} placeholder="SWIFT / BIC" autoCapitalize="characters" />
      <Field label="Branch (optional)" value={branch} onChangeText={setBranch} placeholder="Branch" />
      <Field label="Account currency (optional)" value={bankCurrency} onChangeText={setBankCurrency} placeholder="Currency code" autoCapitalize="characters" />
      <Action title="Save profile and payout details" icon="save" loading={updateMe.isPending || updateProfile.isPending} onPress={() => void saveProfile()} />
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>App preferences</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text style={{ color: colors.mutedForeground }}>Language</Text>
        <Text style={{ color: colors.foreground, fontWeight: '600' }}>English</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text style={{ color: colors.mutedForeground }}>Wallet currency</Text>
        <Text style={{ color: colors.foreground, fontWeight: '600' }}>{walletQuery.isLoading ? 'Loading…' : walletCurrency || 'Not available'}</Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 5 }}>This app is currently in English. Amounts use the wallet currency returned by OG Exports; the investor API does not provide a selectable mobile display-currency setting.</Text>
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Push notifications</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        {pushEnabled === null
          ? 'Checking this device…'
          : pushEnabled
            ? 'This device is registered for investor updates. Turning this off revokes its server registration.'
            : 'Optional investor updates. Device permission is requested only after you choose to enable them.'}
      </Text>
      {!expoProjectId && !pushEnabled
        ? <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Push setup is waiting for this app’s Expo project ID. Permission will not be requested until that is configured.</Text>
        : null}
      {pushError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>{pushError}</Text> : null}
      <Action
        title={pushEnabled ? 'Turn off push notifications' : 'Enable push notifications'}
        icon={pushEnabled ? 'bell-off' : 'bell'}
        secondary={!pushEnabled}
        loading={pushBusy}
        disabled={pushEnabled === null || (!pushEnabled && (!expoProjectId || Platform.OS === 'web'))}
        onPress={() => void (pushEnabled ? disablePushNotifications() : enablePushNotifications())}
      />
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Sign-in password</Text>
      <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry autoCapitalize="none" />
      <Field label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
      <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter new password" secureTextEntry autoCapitalize="none" />
      <Action title="Update sign-in password" icon="lock" loading={updatePassword.isPending} disabled={!currentPassword || newPassword.length < 8 || !confirmPassword} onPress={() => void savePassword()} />
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Withdrawal transaction password</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        {transactionPasswordQuery.isLoading ? 'Checking security settings…' : hasTransactionPassword ? 'A transaction password is set. Confirm the change with your sign-in password.' : 'Set a transaction password to confirm withdrawals.'}
      </Text>
      <Field label="Sign-in password to confirm" value={loginPasswordForTransaction} onChangeText={setLoginPasswordForTransaction} placeholder="Your sign-in password" secureTextEntry autoCapitalize="none" />
      <Field label="New transaction password" value={newTransactionPassword} onChangeText={setNewTransactionPassword} placeholder="At least 6 characters" secureTextEntry autoCapitalize="none" />
      <Field label="Confirm transaction password" value={confirmTransactionPassword} onChangeText={setConfirmTransactionPassword} placeholder="Re-enter password" secureTextEntry autoCapitalize="none" />
      {transactionPasswordQuery.isError ? <Text style={{ color: colors.destructive, marginBottom: 10 }}>Security status could not be loaded. Retry the screen before changing this password.</Text> : null}
      <Action title={hasTransactionPassword ? 'Reset transaction password' : 'Set transaction password'} icon="shield" loading={transactionPasswordBusy} disabled={!transactionPasswordQuery.data || transactionPasswordQuery.isError || !loginPasswordForTransaction || newTransactionPassword.length < 6 || !confirmTransactionPassword} onPress={() => void saveTransactionPassword()} />
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Investor API server</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Changing this address reconnects the app to a different OG Exports server.</Text>
      <Field label="Server address" value={server} onChangeText={setServer} placeholder="https://api.yourcompany.com" keyboardType="default" autoCapitalize="none" />
      <Action title="Save server address" icon="globe" secondary onPress={() => void changeServer()} />
    </Card>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
    <View style={{ marginBottom: 8 }}>
      <Action title="Sign out" icon="log-out" secondary loading={logout.isPending} onPress={() => void signOutNow()} />
    </View>
  </Screen>;
}