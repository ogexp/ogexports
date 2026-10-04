import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useGetPublicInvestorAppSettings, getGetPublicInvestorAppSettingsQueryKey, useGetInvestorAdminConversation, useGetInvestorConversationMessages, useSendInvestorConversationMessage, useGetInvestorSupportTickets, useCreateInvestorSupportTicket } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type SupportMode = 'help' | 'chat' | 'tickets';

const helpTopics = [
  {
    title: 'Investing',
    description: 'Browse current opportunities and review investment details.',
    icon: 'trending-up',
    href: '/(tabs)/opportunities',
  },
  {
    title: 'Trade Tracking',
    description: 'Open your portfolio to view investments and available shipment tracking.',
    icon: 'truck',
    href: '/(tabs)/portfolio',
  },
  {
    title: 'Wallet',
    description: 'Review wallet activity, deposits, and withdrawal options.',
    icon: 'credit-card',
    href: '/(tabs)/wallet',
  },
  {
    title: 'KYC',
    description: 'Check identity verification and any document requests.',
    icon: 'shield',
    href: '/account/kyc',
  },
  {
    title: 'Withdrawals',
    description: 'Review payout requirements and follow withdrawal status.',
    icon: 'corner-up-right',
    href: '/wallet/withdraw',
  },
  {
    title: 'Account',
    description: 'Manage profile details, security, and account preferences.',
    icon: 'user',
    href: '/account/profile',
  },
] as const;

const ticketStatusSteps = ['Open', 'In Progress', 'Resolved'] as const;

function normalizedTicketStatus(value: string) {
  const normalized = value.toLowerCase().replace(/[_-]+/g, ' ').trim();
  return ticketStatusSteps.find(status => status.toLowerCase() === normalized) ?? '';
}

function TicketStatusProgress({ status }: { status: string }) {
  const colors = useColors();
  const current = ticketStatusSteps.indexOf(normalizedTicketStatus(status) as typeof ticketStatusSteps[number]);
  if (current < 0) return <Status value={status || 'Status not provided'} />;

  return (
    <View accessibilityLabel={`Ticket status: ${ticketStatusSteps[current]}`} style={{ flexDirection: 'row', gap: 5, marginTop: 13 }}>
      {ticketStatusSteps.map((step, index) => {
        const reached = index <= current;
        return <View key={step} style={{ flex: 1 }}>
          <View style={{ height: 4, borderRadius: 3, backgroundColor: reached ? colors.primary : colors.border }} />
          <Text style={{ color: reached ? colors.primary : colors.mutedForeground, fontSize: 10, fontWeight: reached ? '700' : '400', marginTop: 5 }}>{step}</Text>
        </View>;
      })}
    </View>
  );
}

export default function Messages() {
  const { token } = useAuth();
  const colors = useColors();
  const [mode, setMode] = useState<SupportMode>('help');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const settingsQuery = useGetPublicInvestorAppSettings({
    query: { queryKey: getGetPublicInvestorAppSettingsQueryKey(), staleTime: 300_000 },
  });
  const platformSettings = unwrap(settingsQuery.data);
  const supportEmail = first(platformSettings, ['support_email', 'supportEmail'], 'support@ogexports.co');

  const conversationQuery = useGetInvestorAdminConversation({
    query: { queryKey: ['investor-admin-conversation'], enabled: !!token && mode === 'chat' },
  });
  const conversation = unwrap(conversationQuery.data);
  const conversationId = first(conversation, ['id', 'conversation_id'], '');
  const messagesQuery = useGetInvestorConversationMessages(conversationId, {
    query: {
      queryKey: ['investor-conversation-messages', conversationId],
      enabled: Boolean(token && conversationId && mode === 'chat'),
      refetchInterval: mode === 'chat' && conversationId ? 5_000 : false,
      refetchIntervalInBackground: false,
    },
  });
  const send = useSendInvestorConversationMessage();
  const ticketsQuery = useGetInvestorSupportTickets({
    query: { queryKey: ['investor-support-tickets'], enabled: !!token && mode === 'tickets' },
  });
  const createTicket = useCreateInvestorSupportTicket();
  const messages = list(messagesQuery.data);
  const tickets = list(ticketsQuery.data);

  async function sendMessage() {
    setError('');
    setNotice('');
    if (!conversationId || !message.trim()) return;
    try {
      await send.mutateAsync({ conversation: conversationId, data: { message: message.trim() } });
      setMessage('');
      await messagesQuery.refetch();
    } catch (err) { setError(messageOf(err)); }
  }

  async function openTicket() {
    setError('');
    setNotice('');
    if (!subject.trim() || !ticketBody.trim()) {
      setError('Add a subject and describe your issue.');
      return;
    }
    try {
      await createTicket.mutateAsync({ data: { subject: subject.trim(), message: ticketBody.trim() } });
      setSubject('');
      setTicketBody('');
      setNotice('Your support ticket was sent. Its latest status will appear in ticket history.');
      setMode('tickets');
      void ticketsQuery.refetch();
    } catch (err) { setError(messageOf(err)); }
  }

  async function emailSupport() {
    setError('');
    try {
      await Linking.openURL(`mailto:${supportEmail}`);
    } catch {
      setError(`Could not open an email app. Contact support at ${supportEmail}, or create a ticket.`);
    }
  }

  return <Screen title="Support" subtitle="Help Center, live chat, and support tickets">
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 7, marginBottom: 14 }}>
      {([
        ['help', 'Help Center'],
        ['chat', 'Live chat'],
        ['tickets', 'Tickets'],
      ] as const).map(([value, label]) => (
        <Pressable
          key={value}
          testID={`support-tab-${value}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === value }}
          onPress={() => { setMode(value); setError(''); setNotice(''); }}
          style={{ flex: 1, alignItems: 'center', borderRadius: 18, paddingHorizontal: 8, paddingVertical: 10, backgroundColor: mode === value ? colors.primary : colors.secondary }}
        >
          <Text style={{ color: mode === value ? colors.primaryForeground : colors.foreground, fontWeight: '700', fontSize: 11 }}>{label}</Text>
        </Pressable>
      ))}
    </View>

    {error ? <ErrorState message={error} /> : null}
    {notice ? <Card><Text style={{ color: colors.primary, lineHeight: 20 }}>{notice}</Text></Card> : null}

    {mode === 'help' ? <>
      <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15 }}>How can we help?</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>
          Choose a topic to open the related area in your investor account.
        </Text>
      </Card>
      {helpTopics.map(topic => (
        <Pressable
          key={topic.title}
          testID={`support-topic-${topic.title.toLowerCase().replace(/\s+/g, '-')}`}
          accessibilityRole="button"
          onPress={() => router.push(topic.href as never)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 15,
            marginBottom: 9,
            borderRadius: colors.radius,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.78 : 1,
          })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={topic.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{topic.title}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3 }}>{topic.description}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
      <Section title="Email support" />
      <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>Prefer email?</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 12 }}>
          {supportEmail}
          {settingsQuery.isError ? ' · Showing the published default support address.' : ''}
        </Text>
        <Action title="Email support" icon="mail" onPress={() => void emailSupport()} />
      </Card>
    </> : null}

    {mode === 'chat' ? <>
      <Card>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>Investor support conversation</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 4 }}>
          Replies refresh automatically while this screen is open.
        </Text>
      </Card>
      {conversationQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Opening your support conversation…</Text></Card> : null}
      {conversationQuery.isError ? <ErrorState message="Your support conversation could not be opened." onRetry={() => void conversationQuery.refetch()} /> : null}
      {!conversationQuery.isLoading && !conversationQuery.isError && !conversationId ? <EmptyState title="Conversation unavailable" body="Use a support ticket or email instead. The support conversation could not be opened." /> : null}
      {messagesQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading messages…</Text></Card> : null}
      {messagesQuery.isError ? <ErrorState message="Messages could not be loaded." onRetry={() => void messagesQuery.refetch()} /> : null}
      {messages.length === 0 && !messagesQuery.isLoading && conversationId ? <EmptyState title="Start a conversation" body="Send a message to the investor support team. Replies will appear here." /> : null}
      {messages.map((item, index) => {
        const own = /investor|user/i.test(first(record(item.sender), ['role', 'type'], first(item, ['sender_type', 'role'], '')));
        return <Card key={first(item, ['id'], String(index))} style={{ backgroundColor: own ? colors.secondary : colors.card, alignSelf: own ? 'flex-end' : 'stretch', width: own ? '88%' : '100%' }}>
          <Text style={{ color: colors.foreground, lineHeight: 20 }}>{first(item, ['message', 'body', 'content'], '')}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 7 }}>{first(item, ['created_at', 'date'], '')}</Text>
        </Card>;
      })}
      {conversationId ? <Card>
        <Field label="Message" value={message} onChangeText={setMessage} placeholder="Write to investor support…" multiline />
        <Action title="Send message" icon="send" loading={send.isPending} disabled={!message.trim()} onPress={() => void sendMessage()} />
      </Card> : null}
    </> : null}

    {mode === 'tickets' ? <>
      <Section title="Create a support ticket" />
      <Card>
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" />
        <Field label="Details" value={ticketBody} onChangeText={setTicketBody} placeholder="Describe the issue" multiline />
        <Action title="Submit support ticket" icon="help-circle" loading={createTicket.isPending} disabled={!subject.trim() || !ticketBody.trim()} onPress={() => void openTicket()} />
      </Card>
      <Section title="Ticket history" />
      {ticketsQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading ticket history…</Text></Card> : null}
      {ticketsQuery.isError ? <ErrorState message="Support tickets could not be loaded." onRetry={() => void ticketsQuery.refetch()} /> : null}
      {tickets.length === 0 && !ticketsQuery.isLoading && !ticketsQuery.isError ? <EmptyState title="No tickets yet" body="Tickets you create will appear here with their latest status." /> : null}
      {tickets.map((item, index) => {
        const status = first(item, ['status'], '');
        return <Card key={first(item, ['id'], String(index))}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>{first(item, ['subject', 'title'], 'Support ticket')}</Text>
            <Status value={normalizedTicketStatus(status) || status || 'Status not provided'} />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 6 }}>
            {first(item, ['created_at', 'date'], 'Date not provided')}
          </Text>
          {normalizedTicketStatus(status)
            ? <TicketStatusProgress status={status} />
            : null}
        </Card>;
      })}
    </> : null}
  </Screen>;
}