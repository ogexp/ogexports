import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorNotifications, useMarkAllInvestorNotificationsRead, useMarkInvestorNotificationRead } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen } from '@/components/InvestorUI';
import { first, list } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Notifications() {
  const { token } = useAuth();
  const colors = useColors();
  const query = useGetInvestorNotifications({ query: { queryKey: ['investor-notifications'], enabled: !!token, staleTime: 20_000 } });
  const markAll = useMarkAllInvestorNotificationsRead({ mutation: { onSuccess: () => void query.refetch() } });
  const markOne = useMarkInvestorNotificationRead({ mutation: { onSuccess: () => void query.refetch() } });
  const notifications = list(query.data);
  return <Screen title="Notifications" subtitle="Updates about your account and investments" action={notifications.length ? <Pressable onPress={() => markAll.mutate()} disabled={markAll.isPending} style={{ paddingTop: 7 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Mark all read</Text></Pressable> : null}>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading notifications…</Text></Card> : null}
    {query.isError ? <ErrorState message="Notifications could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && notifications.length === 0 ? <EmptyState title="You’re all caught up" body="Important investor updates will appear here." /> : null}
    {notifications.map((item, index) => {
      const id = first(item, ['id'], '');
      const unread = !item.read_at && item.is_read !== true && item.read !== true;
      return <Pressable key={id || index} disabled={!id || !unread || markOne.isPending} onPress={() => markOne.mutate({ id })}>
        <Card style={{ flexDirection: 'row', gap: 12, borderColor: unread ? colors.primary : colors.border }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Feather name={unread ? 'bell' : 'check'} size={16} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: unread ? '700' : '600' }}>{first(item, ['title', 'subject'], 'Investor update')}</Text><Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 5 }}>{first(item, ['message', 'body', 'description'], '')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 7 }}>{first(item, ['created_at', 'date'], '')}</Text></View>
          {unread ? <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: colors.primary, marginTop: 5 }} /> : null}
        </Card>
      </Pressable>;
    })}
  </Screen>;
}