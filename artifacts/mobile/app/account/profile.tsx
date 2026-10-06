import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useGetInvestorProfile, useInvestorMobileLogout, useRevokeInvestorPushToken } from '@workspace/api-client-react';
import { Action, Card, ConfirmationSheet, ErrorState, Row, Screen, Section, Status } from '@/components/InvestorUI';
import { first, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getInvestorKycStatus } from '@/lib/kyc';

const pushEnabledKey = (userId: string) => `og-investor-push-enabled:${userId}`;
const pushTokenKey = (userId: string) => `og-investor-push-token:${userId}`;

export default function Profile() {
  const { token, user, signOut } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const logout = useInvestorMobileLogout();
  const revokePushToken = useRevokeInvestorPushToken();
  const userId = first(record(user), ['id']);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token, staleTime: 60_000 } });
  const profile = unwrap(profileQuery.data);
  const account = { ...record(user), ...record(profile) };
  const initials = first(account, ['name'], 'OG').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const kyc = profileQuery.isLoading ? 'Loading' : getInvestorKycStatus(account);
  const open = (path: string) => router.push(path as never);

  async function signOutNow() {
    if (signingOut) return;
    setSigningOut(true);
    if (userId) {
      try {
        const devicePushToken = await SecureStore.getItemAsync(pushTokenKey(userId));
        if (devicePushToken) {
          await revokePushToken.mutateAsync({ data: { expo_push_token: devicePushToken } });
        }
      } catch {
        // Signing out still invalidates the current server session.
      }
      await Promise.all([
        SecureStore.deleteItemAsync(pushTokenKey(userId)),
        AsyncStorage.removeItem(pushEnabledKey(userId)),
      ]).catch(() => undefined);
    }
    try { await logout.mutateAsync(); } catch { /* Local sign-out still clears this device's token. */ }
    queryClient.clear();
    await signOut();
    router.replace('/(auth)/login');
  }

  return <Screen title="Profile" subtitle="Your identity, payment details and account preferences">
    {profileQuery.isError ? <ErrorState message="Account details could not be refreshed." error={profileQuery.error} onRetry={() => void profileQuery.refetch()} /> : null}
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 17 }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{first(account, ['name'], 'Investor')}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>{first(account, ['email'], '')}</Text>
      </View>
      <Pressable
        testID="profile-edit-details"
        accessibilityRole="button"
        accessibilityLabel="Edit profile details"
        onPress={() => open('/account/settings')}
        hitSlop={8}
      >
        <Feather name="edit-3" size={18} color={colors.primary} />
      </Pressable>
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>Identity verification</Text>
        <Status value={kyc} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8, lineHeight: 18 }}>Verification helps protect your account and is required for investing.</Text>
      <Pressable accessibilityRole="button" onPress={() => open('/account/kyc')} style={{ marginTop: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>View verification →</Text>
      </Pressable>
    </Card>
    <Card style={{ paddingHorizontal: 14 }}>
      <Row label="KYC Verification" icon="shield" onPress={() => open('/account/kyc')} />
      <Row label="Personal Information" icon="user" onPress={() => open('/account/settings')} />
      <Row label="Bank Accounts" icon="credit-card" onPress={() => open('/account/bank-accounts')} />
      <Row label="Transaction History" icon="list" onPress={() => open('/account/transactions')} />
      <Row label="Investment Statements" icon="file-text" onPress={() => open('/account/reports')} />
      <Row label="Trade Analytics" icon="pie-chart" onPress={() => open('/account/analytics')} />
      <Row label="Security & 2FA" icon="lock" onPress={() => open('/account/security')} />
      <Row label="Notifications" icon="bell" onPress={() => open('/account/notifications')} />
      <Row label="Settings" icon="settings" onPress={() => open('/account/settings')} />
    </Card>
    <Section title="Support & legal" />
    <Card style={{ paddingHorizontal: 14 }}>
      <Row label="Messages & support" icon="message-circle" onPress={() => open('/account/messages')} />
      <Row label="Terms of service" icon="file-text" onPress={() => open('/account/legal/terms')} />
      <Row label="Privacy policy" icon="shield" onPress={() => open('/account/legal/privacy')} />
      <Row label="Risk disclosure" icon="alert-triangle" onPress={() => open('/account/legal/risk')} />
    </Card>
    <Section title="Account" />
    <Card style={{ paddingHorizontal: 14 }}>
      <Action
        title="Sign out"
        icon="log-out"
        secondary
        loading={signingOut || logout.isPending || revokePushToken.isPending}
        testID="profile-sign-out"
        onPress={() => setConfirmSignOut(true)}
      />
    </Card>
    <ConfirmationSheet
      visible={confirmSignOut}
      testID="profile-confirm-sign-out-sheet"
      title="Confirm logout"
      body="Your session on this device will end."
      confirmLabel="Sign out"
      destructive
      loading={signingOut || logout.isPending || revokePushToken.isPending}
      onCancel={() => setConfirmSignOut(false)}
      onConfirm={() => void signOutNow()}
    />
  </Screen>;
}
