import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorProfile } from '@workspace/api-client-react';
import { Card, ErrorState, Row, Screen, Section, Status } from '@/components/InvestorUI';
import { first, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getInvestorKycStatus } from '@/lib/kyc';

export default function Account() {
  const { token, user } = useAuth();
  const colors = useColors();
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token, staleTime: 60_000 } });
  const profile = unwrap(profileQuery.data);
  const account = { ...record(user), ...record(profile) };
  const initials = first(account, ['name'], 'OG').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const kyc = profileQuery.isLoading ? 'Loading' : getInvestorKycStatus(account);
  const open = (path: string) => router.push(path as never);
  return <Screen title="Profile" subtitle="Your identity, payment details and account preferences">
    {profileQuery.isError ? <ErrorState message="Account details could not be refreshed." onRetry={() => void profileQuery.refetch()} /> : null}
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 17 }}>{initials}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{first(account, ['name'], 'Investor')}</Text><Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>{first(account, ['email'], '')}</Text></View>
      <Pressable onPress={() => open('/account/settings')}><Feather name="edit-3" size={18} color={colors.primary} /></Pressable>
    </Card>
    <Card><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>Identity verification</Text><Status value={kyc} /></View><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8, lineHeight: 18 }}>Verification helps protect your account and is required for investing.</Text><Pressable onPress={() => open('/account/kyc')} style={{ marginTop: 10 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>View verification →</Text></Pressable></Card>
    <Card style={{ paddingHorizontal: 14 }}>
      <Row label="KYC Verification" icon="shield" onPress={() => open('/account/kyc')} />
      <Row label="Personal Information" icon="user" onPress={() => open('/account/settings')} />
      <Row label="Bank Accounts" icon="credit-card" onPress={() => open('/account/settings')} />
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
  </Screen>;
}