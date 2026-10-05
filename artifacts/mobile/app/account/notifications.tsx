import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorNotifications, useMarkAllInvestorNotificationsRead, useMarkInvestorNotificationRead } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen } from '@/components/InvestorUI';
import { first, list, messageOf } from '@/lib/data';
import { notificationHref } from '@/lib/notification-routing';
import {
  NOTIFICATION_CATEGORIES,
  notificationCategory,
  notificationCategoryLabel,
  type NotificationCategoryFilter,
} from '@/lib/notification-categories';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const categoryFilters: NotificationCategoryFilter[] = [
  'All',
  ...NOTIFICATION_CATEGORIES.map(category => category.label),
];

export default function Notifications() {
  const { token } = useAuth();
  const colors = useColors();
  const [actionError, setActionError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategoryFilter>('All');
  const query = useGetInvestorNotifications({ query: { queryKey: ['investor-notifications'], enabled: !!token, staleTime: 20_000 } });
  const markAll = useMarkAllInvestorNotificationsRead({ mutation: {
    onSuccess: () => { setActionError(''); void query.refetch(); },
    onError: error => setActionError(messageOf(error)),
  } });
  const markOne = useMarkInvestorNotificationRead({ mutation: {
    onSuccess: () => { setActionError(''); void query.refetch(); },
    onError: error => setActionError(messageOf(error)),
  } });
  const notifications = list(query.data);
  const unreadCount = notifications.filter(item => !item.read_at && item.is_read !== true && item.read !== true).length;
  const visibleNotifications = selectedCategory === 'All'
    ? notifications
    : notifications.filter(item => notificationCategoryLabel(notificationCategory(item)) === selectedCategory);
  function openNotification(item: Record<string, unknown>, id: string, unread: boolean) {
    if (unread && id) markOne.mutate({ id });
    const target = notificationHref(item);
    if (target) router.push(target);
  }

  return <Screen title="Notifications" subtitle="Updates about your account and investments" action={
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Pressable testID="notification-preferences-link" accessibilityRole="button" accessibilityLabel="Notification preferences" onPress={() => router.push('/account/settings')}>
        <Feather name="sliders" size={18} color={colors.primary} />
      </Pressable>
      {unreadCount > 0 ? <Pressable testID="mark-all-notifications-read" onPress={() => markAll.mutate()} disabled={markAll.isPending} style={{ paddingTop: 7 }}>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{markAll.isPending ? 'Marking…' : 'Mark all read'}</Text>
      </Pressable> : null}
    </View>
  }>
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading notifications…</Text></Card> : null}
    {query.isError ? <ErrorState message="Notifications could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {actionError ? <ErrorState message={`Notification action failed: ${actionError}`} /> : null}
    {!query.isLoading && !query.isError && notifications.length === 0 ? <EmptyState title="You’re all caught up" body="Important investor updates will appear here." /> : null}
    {notifications.length > 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
      {categoryFilters.map(category => {
        const selected = selectedCategory === category;
        return <Pressable
          key={category}
          testID={`notification-filter-${category.toLowerCase()}`}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => setSelectedCategory(category)}
          style={{ borderWidth: 1, borderColor: selected ? colors.primary : colors.border, borderRadius: 18, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: selected ? colors.secondary : colors.card }}
        >
          <Text style={{ color: selected ? colors.primary : colors.mutedForeground, fontSize: 12, fontWeight: selected ? '700' : '500' }}>{category}</Text>
        </Pressable>;
      })}
    </View> : null}
    {!query.isLoading && !query.isError && notifications.length > 0 && visibleNotifications.length === 0
      ? <EmptyState title={`No ${selectedCategory} notifications`} body="Updates in this category will appear here when OG Exports records them." />
      : null}
    {visibleNotifications.map((item, index) => {
      const id = first(item, ['id'], '');
      const unread = !item.read_at && item.is_read !== true && item.read !== true;
      const target = notificationHref(item);
      const category = notificationCategory(item);
      const categoryInfo = NOTIFICATION_CATEGORIES.find(value => value.key === category);
      const body = first(item, ['body', 'message', 'description']);
      const createdAt = first(item, ['created_at', 'date']);
      return <Card key={id || index} style={{ borderColor: unread ? colors.primary : colors.border, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <Pressable
            testID={`notification-${id || index}`}
            accessibilityRole="button"
            accessibilityHint={target ? 'Opens the related account screen' : unread ? 'Marks this notification as read' : undefined}
            disabled={!id && !target}
            onPress={() => openNotification(item, id, unread)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={categoryInfo?.icon ?? 'bell'} size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <Text style={{ color: colors.foreground, fontWeight: unread ? '700' : '600', flexShrink: 1 }}>{first(item, ['title', 'subject'], 'Investor update')}</Text>
                <View style={{ borderRadius: 10, backgroundColor: colors.secondary, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>{notificationCategoryLabel(category)}</Text>
                </View>
              </View>
              {body ? <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 5 }}>{body}</Text> : null}
              {createdAt ? <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 7 }}>{createdAt}</Text> : null}
            </View>
          </Pressable>
          {unread ? <Pressable
            testID={`mark-notification-read-${id || index}`}
            accessibilityRole="button"
            accessibilityLabel="Mark as read"
            hitSlop={8}
            onPress={() => id && markOne.mutate({ id })}
            disabled={!id || markOne.isPending}
            style={{ padding: 4 }}
          >
            <Feather name="check-circle" size={19} color={colors.primary} />
          </Pressable> : null}
        </View>
      </Card>;
    })}
  </Screen>;
}