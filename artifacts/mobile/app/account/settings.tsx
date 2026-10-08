import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  useGetInvestorProfile,
  useInvestorMobileLogout,
  useRegisterInvestorPushToken,
  useRevokeInvestorPushToken,
  useUpdateInvestorMe,
  useUpdateInvestorPassword,
  useUpdateInvestorProfile,
} from '@workspace/api-client-react';
import { Action, Card, ConfirmationSheet, Field, Screen } from '@/components/InvestorUI';
import { TransactionPasswordSettingsCard } from '@/components/TransactionPasswordSettingsCard';
import { CountryPicker } from '@/components/CountryPicker';
import { useAuth } from '@/context/AuthContext';
import { first, list, messageOf, record, unwrap, type Json } from '@/lib/data';
import { countryForApi, profileUserCountry } from '@/lib/countries';
import { validOrigin } from '@/lib/api-config';
import { useColors } from '@/hooks/useColors';
import { useAppPreferences, type AppearancePreference, type DisplayCurrency } from '@/context/AppPreferencesContext';
import { localizedAlert as Alert, translateUi } from '@/lib/strings';
import {
  NOTIFICATION_CATEGORIES,
  isNotificationPreferenceEnabled,
  type NotificationCategoryKey,
} from '@/lib/notification-categories';
import { useMotion } from '@/lib/motion';

const pushEnabledKey = (userId: string) => `og-investor-push-enabled:${userId}`;
const pushTokenKey = (userId: string) => `og-investor-push-token:${userId}`;

export default function Settings() {
  const { token, user, apiOrigin, updateOrigin, updateUser, signOut } = useAuth();
  const appPreferences = useAppPreferences();
  const motion = useMotion();
  const colors = useColors();
  const queryClient = useQueryClient();
  const userId = first(record(user), ['id']);
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token } });
  const updateProfile = useUpdateInvestorProfile();
  const updateMe = useUpdateInvestorMe();
  const updatePassword = useUpdateInvestorPassword();
  const logout = useInvestorMobileLogout();
  const registerPushToken = useRegisterInvestorPushToken();
  const revokePushToken = useRevokeInvestorPushToken();
  const profile = unwrap(profileQuery.data);
  const [server, setServer] = useState(apiOrigin);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, unknown>>({});
  const [notificationPreferenceError, setNotificationPreferenceError] = useState('');
  const [savingNotificationPreference, setSavingNotificationPreference] = useState<NotificationCategoryKey | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const expoProjectId = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? '';

  useEffect(() => {
    setServer(apiOrigin);
    if (profileQuery.data) {
      setNotificationPrefs(record(profile.notification_prefs));
    }
  }, [apiOrigin, profileQuery.data]);

  useEffect(() => {
    const account = record(user);
    setName(first(account, ['name']));
    setPhone(first(account, ['mobile']));
    setCountry(profileUserCountry(account));
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
    if (Platform.OS === 'android' && isRunningInExpoGo()) {
      setPushError('Android Expo Go does not support remote push notifications. Install a development or published app build to enable them.');
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

  async function saveNotificationPreference(category: NotificationCategoryKey, enabled: boolean) {
    setNotificationPreferenceError('');
    setSavingNotificationPreference(category);
    const nextPreferences = { ...notificationPrefs, [category]: enabled };
    try {
      await updateProfile.mutateAsync({
        data: { notification_prefs: nextPreferences },
      });
      setNotificationPrefs(nextPreferences);
      void profileQuery.refetch();
    } catch (preferenceError) {
      setNotificationPreferenceError(messageOf(preferenceError));
    } finally {
      setSavingNotificationPreference(null);
    }
  }

  async function saveProfile() {
    setError('');
    try {
      const saved = record(await updateMe.mutateAsync({
        data: { name: name.trim(), mobile: phone.trim(), country: countryForApi(country) },
      }));
      const savedUser = record(saved.user);
      if (!first(savedUser, ['id'])) throw new Error('The server did not return the updated profile.');
      await updateUser(savedUser as Json);

      Alert.alert('Profile updated', 'Your profile details have been saved.');
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

  async function saveAppPreference(patch: { language?: 'en' | 'ur' | 'ar'; currency?: DisplayCurrency; appearance?: AppearancePreference }) {
    setError('');
    try {
      await appPreferences.savePreferences(patch);
    } catch (preferenceSaveError) {
      setError(messageOf(preferenceSaveError));
    }
  }

  const appLanguage = appPreferences.preferences.language;

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

  return <Screen title="Settings" subtitle="Profile, security and server connection">
    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Profile details</Text>
      <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Mobile number" value={phone} onChangeText={setPhone} placeholder="+92 300 1234567" keyboardType="phone-pad" />
      <CountryPicker label="Country / region" value={country} onChange={setCountry} placeholder="Country of residence" />
      <View style={{ gap: 12 }}>
        <Action title="Manage bank accounts & verification" secondary onPress={() => router.push('/account/bank-accounts' as never)} />
        <Action title="Save profile details" icon="save" loading={updateMe.isPending} onPress={() => void saveProfile()} />
      </View>
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 10 }}>App preferences</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>Language</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {([
          ['en', 'English'],
          ['ur', 'اردو'],
          ['ar', 'العربية'],
        ] as const).map(([language, label]) => {
          const selected = appPreferences.preferences.language === language;
          return <Pressable
            key={language}
            testID={`language-option-${language}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: appPreferences.isSaving }}
            disabled={appPreferences.isSaving}
            onPress={() => void saveAppPreference({ language })}
            style={{ paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, borderRadius: 18, backgroundColor: selected ? colors.lightGreen : colors.card }}
          >
            <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{label}</Text>
          </Pressable>;
        })}
      </View>

      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
        {translateUi('Profile and wallet currency', appLanguage)}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 7 }}>
        {(['USD', 'PKR', 'EUR', 'GBP'] as const).map(currency => {
          const selected = appPreferences.preferences.currency === currency;
          return <Pressable
            key={currency}
            testID={`currency-option-${currency}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: appPreferences.isSaving }}
            disabled={appPreferences.isSaving}
            onPress={() => void saveAppPreference({ currency })}
            style={{ paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, borderRadius: 18, backgroundColor: selected ? colors.lightGreen : colors.card }}
          >
            <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{currency}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 14 }}>
        {appPreferences.ratesLoading
          ? translateUi('Loading authenticated OG Exports exchange rates. Until rates are available, amounts stay in their source currency.', appLanguage)
          : appPreferences.ratesError
            ? translateUi('Exchange rates are unavailable. Amounts stay in their source currency and are marked as unavailable for conversion.', appLanguage)
            : <>{translateUi('Selecting a currency converts your available wallet balance at the authenticated rate and sets the currency used for future wallet requests.', appLanguage)}{appPreferences.ratesAsOf ? ` ${translateUi('Rates as of', appLanguage)} ${appPreferences.ratesAsOf}.` : ''} {translateUi('Wallet transaction history remains in the currency recorded at the time of each transaction.', appLanguage)}</>}
      </Text>
      {appPreferences.walletCurrency
        && appPreferences.walletCurrency !== appPreferences.preferences.currency
        ? <Text style={{ color: colors.primary, fontSize: 11, lineHeight: 17, marginBottom: 14 }}>
          {translateUi('Your wallet and Profile currencies differ. Tap the selected currency to convert the available balance.', appLanguage)}
          {' '}{appPreferences.walletCurrency} → {appPreferences.preferences.currency}
        </Text>
        : null}

      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>Appearance</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {([
          ['light', 'Light'],
          ['dark', 'Dark'],
          ['system', 'System'],
        ] as const).map(([appearance, label]) => {
          const selected = appPreferences.preferences.appearance === appearance;
          return <Pressable
            key={appearance}
            testID={`appearance-option-${appearance}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: appPreferences.isSaving }}
            disabled={appPreferences.isSaving}
            onPress={() => void saveAppPreference({ appearance })}
            style={{ paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, borderRadius: 18, backgroundColor: selected ? colors.lightGreen : colors.card }}
          >
            <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{label}</Text>
          </Pressable>;
        })}
      </View>
      {appPreferences.isSaving ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 8 }}>Saving app preferences…</Text> : null}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 2, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600' }}>Reduce motion</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 3 }}>
            Use minimal movement in the app. Your device accessibility setting is always respected.
          </Text>
        </View>
        <Pressable
          testID="reduce-motion-toggle"
          accessibilityRole="switch"
          accessibilityLabel="Reduce motion"
          accessibilityState={{ checked: motion.reduceMotionPreference }}
          onPress={() => void motion.setReduceMotionPreference(!motion.reduceMotionPreference)}
          style={{ width: 48, height: 28, borderRadius: 16, padding: 3, justifyContent: 'center', backgroundColor: motion.reduceMotionPreference ? colors.primary : colors.border }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.card, alignSelf: motion.reduceMotionPreference ? 'flex-end' : 'flex-start' }} />
        </Pressable>
      </View>
      <Action title="Data preferences" icon="shield" secondary onPress={() => router.push('/account/data-preferences' as never)} />
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>In-app alert preferences</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
        Choose which category alerts you receive in-app. This affects new alerts only; email and device push preferences are separate.
      </Text>
      {profileQuery.isLoading
        ? <Text style={{ color: colors.mutedForeground, fontSize: 12, paddingVertical: 8 }}>Loading preferences…</Text>
        : null}
      {profileQuery.isError
        ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, paddingVertical: 8 }}>Notification preferences could not be loaded. Retry Settings before changing them.</Text>
        : null}
      {notificationPreferenceError
        ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginBottom: 8 }}>{notificationPreferenceError}</Text>
        : null}
      {NOTIFICATION_CATEGORIES.map((category, index) => {
        const enabled = isNotificationPreferenceEnabled(notificationPrefs, category.key);
        const isSaving = savingNotificationPreference === category.key;
        return <Pressable
          key={category.key}
          testID={`notification-preference-${category.key}`}
          accessibilityRole="switch"
          accessibilityLabel={`${category.label} notifications`}
          accessibilityState={{ checked: enabled, disabled: profileQuery.isLoading || profileQuery.isError || updateProfile.isPending }}
          disabled={profileQuery.isLoading || profileQuery.isError || updateProfile.isPending}
          onPress={() => void saveNotificationPreference(category.key, !enabled)}
          style={{
            minHeight: 58,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 10,
            borderBottomWidth: index === NOTIFICATION_CATEGORIES.length - 1 ? 0 : 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>{category.label}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{category.description}</Text>
          </View>
          <View style={{ minWidth: 48, alignItems: 'flex-end' }}>
            <Text style={{ color: enabled ? colors.primary : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>
              {isSaving ? 'Saving…' : enabled ? 'On' : 'Off'}
            </Text>
          </View>
        </Pressable>;
      })}
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

    <TransactionPasswordSettingsCard />

    <Card>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Investor API server</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Changing this address reconnects the app to a different OG Exports server.</Text>
      <Field label="Server address" value={server} onChangeText={setServer} placeholder="https://api.yourcompany.com" keyboardType="default" autoCapitalize="none" />
      <Action title="Save server address" icon="globe" secondary onPress={() => void changeServer()} />
    </Card>
    {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
    <View style={{ marginBottom: 8 }}>
      <Action title="Sign out" icon="log-out" secondary loading={logout.isPending} onPress={() => setConfirmSignOut(true)} />
    </View>
    <ConfirmationSheet
      visible={confirmSignOut}
      testID="confirm-sign-out-sheet"
      title="Confirm logout"
      body="Your session on this device will end."
      confirmLabel="Sign out"
      destructive
      loading={logout.isPending}
      onCancel={() => setConfirmSignOut(false)}
      onConfirm={() => void signOutNow()}
    />
  </Screen>;
}