import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorProfile } from '@workspace/api-client-react';
import { Card, ErrorState, Row, Screen, Status } from '@/components/InvestorUI';
import { first, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Account() {
  const { token, user } = useAuth();
  const colors = useColors();
  const profileQuery = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token, staleTime: 60_000 } });
  const profile = unwrap(profileQuery.data);
  const account = { ...record(user), ...record(profile) };
  const initials = first(account, ['name'], 'OG').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const kyc = first(account, ['kyc_status', 'verification_status'], 'Not started');
  const open = (path: string) => router.push(path as never);
  return <Screen title="Your account" subtitle="Profile, verification and preferences">
    {profileQuery.isError ? <ErrorState message="Account details could not be refreshed." onRetry={() => void profileQuery.refetch()} /> : null}
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.accentForeground, fontWeight: '700', fontSize: 17 }}>{initials}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{first(account, ['name'], 'Investor')}</Text><Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>{first(account, ['email'], '')}</Text></View>
      <Pressable onPress={() => open('/account/settings')}><Feather name="edit-3" size={18} color={colors.primary} /></Pressable>
    </Card>
    <Card><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>Identity verification</Text><Status value={kyc} /></View><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8, lineHeight: 18 }}>Verification helps protect your account and is required for investing.</Text><Pressable onPress={() => open('/account/kyc')} style={{ marginTop: 10 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>View verification →</Text></Pressable></Card>
    <Card style={{ paddingHorizontal: 14 }}>
      <Row label="Identity verification" icon="shield" onPress={() => open('/account/kyc')} />
      <Row label="Reports" icon="file-text" onPress={() => open('/account/reports')} />
      <Row label="Notifications" icon="bell" onPress={() => open('/account/notifications')} />
      <Row label="Messages & support" icon="message-circle" onPress={() => open('/account/messages')} />
      <Row label="Security & preferences" icon="settings" onPress={() => open('/account/settings')} />
    </Card>
  </Screen>;
}