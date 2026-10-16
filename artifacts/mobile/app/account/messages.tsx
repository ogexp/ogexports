import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Linking, Platform, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetPublicInvestorAppSettings, getGetPublicInvestorAppSettingsQueryKey, useGetInvestorAdminConversation, useGetInvestorConversationMessages, useSendInvestorConversationMessage, useMarkInvestorConversationRead, useGetInvestorSupportTickets, useGetInvestorSupportTicket, useMarkInvestorSupportTicketRead, useReplyInvestorSupportTicket, useCreateInvestorSupportTicket } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Section, Status, SuccessFeedback } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, MotionReveal, motionHaptic, useMotion } from '@/lib/motion';

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

function ChatBubbleReveal({
  id,
  seenIds,
  children,
}: {
  id: string;
  seenIds: React.MutableRefObject<Set<string>>;
  children: React.ReactNode;
}) {
  const { reduceMotion } = useMotion();
  const firstReveal = !seenIds.current.has(id);
  const opacity = useRef(new Animated.Value(firstReveal && !reduceMotion ? 0 : 1)).current;
  const offset = useRef(new Animated.Value(firstReveal && !reduceMotion ? MOTION.revealY : 0)).current;

  useEffect(() => {
    const shouldReveal = !seenIds.current.has(id);
    seenIds.current.add(id);
    if (!shouldReveal || reduceMotion) {
      opacity.setValue(1);
      offset.setValue(0);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.component,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(offset, {
        toValue: 0,
        duration: MOTION.component,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [id, offset, opacity, reduceMotion, seenIds]);

  return <Animated.View style={{ opacity, transform: [{ translateY: offset }] }}>{children}</Animated.View>;
}

function normalizedTicketStatus(value: string) {
  const normalized = value.toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (normalized === 'pending' || normalized === 'answered') return 'In Progress';
  return ticketStatusSteps.find(status => status.toLowerCase() === normalized) ?? '';
}

function TicketStatusProgress({ status }: { status: string }) {
  const colors = useColors();
  const current = ticketStatusSteps.indexOf(normalizedTicketStatus(status) as typeof ticketStatusSteps[number]);
  if (current < 0) return <Status value={status || '—'} />;

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
  const params = useLocalSearchParams<{ mode?: string; subject?: string; body?: string }>();
  const { token, user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<SupportMode>('help');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [ticketReply, setTicketReply] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [chatSentVisible, setChatSentVisible] = useState(false);
  const [chatSentCount, setChatSentCount] = useState(0);
  const [ticketFeedbackVisible, setTicketFeedbackVisible] = useState(false);
  const animatedChatMessageIds = useRef(new Set<string>());

  useEffect(() => {
    if (params.mode !== 'tickets') return;
    setMode('tickets');
    if (typeof params.subject === 'string') setSubject(params.subject);
    if (typeof params.body === 'string') setTicketBody(params.body);
  }, [params.mode, params.subject, params.body]);

  const settingsQuery = useGetPublicInvestorAppSettings({
    query: { queryKey: getGetPublicInvestorAppSettingsQueryKey(), staleTime: 300_000 },
  });
  const platformSettings = unwrap(settingsQuery.data);
  const supportEmail = first(platformSettings, ['support_email', 'supportEmail'], 'support@ogexports.co');

  const conversationQuery = useGetInvestorAdminConversation({
    query: { queryKey: ['investor-admin-conversation'], enabled: !!token && mode === 'chat' },
  });
  const conversationResult = unwrap(conversationQuery.data);
  const conversation = record(conversationResult.conversation ?? conversationResult);
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
  const markConversationRead = useMarkInvestorConversationRead();
  const ticketsQuery = useGetInvestorSupportTickets({
    query: { queryKey: ['investor-support-tickets'], enabled: !!token && mode === 'tickets' },
  });
  const ticketDetailQuery = useGetInvestorSupportTicket(selectedTicketId, {
    query: { queryKey: ['investor-support-ticket', selectedTicketId], enabled: !!token && !!selectedTicketId && mode === 'tickets' },
  });
  const markTicketRead = useMarkInvestorSupportTicketRead();
  const replyTicket = useReplyInvestorSupportTicket();
  const createTicket = useCreateInvestorSupportTicket();
  const messages = list(messagesQuery.data);
  const tickets = list(ticketsQuery.data);
  const selectedTicket = unwrap(ticketDetailQuery.data);
  const ticketMessages = list(selectedTicket.messages);
  const chatMessages = [...messages].sort((left, right) => {
    const leftTime = Date.parse(first(left, ['created_at', 'date'], ''));
    const rightTime = Date.parse(first(right, ['created_at', 'date'], ''));
    return Number.isFinite(leftTime) && Number.isFinite(rightTime) ? rightTime - leftTime : 0;
  });
  const userId = first(record(user), ['id'], '');
  const lastReadTimestamp = useRef(0);
  const lastTicketReadTimestamps = useRef<Record<string, number>>({});

  useEffect(() => {
    if (mode !== 'chat' || !conversationId || !messagesQuery.isSuccess) return;
    if (messagesQuery.dataUpdatedAt <= lastReadTimestamp.current) return;
    lastReadTimestamp.current = messagesQuery.dataUpdatedAt;
    void markConversationRead.mutateAsync({ conversation: conversationId }).catch(() => undefined);
  }, [mode, conversationId, messagesQuery.dataUpdatedAt, messagesQuery.isSuccess]);

  useEffect(() => {
    if (mode !== 'tickets' || !selectedTicketId || !ticketDetailQuery.isSuccess) return;
    if (ticketDetailQuery.dataUpdatedAt <= (lastTicketReadTimestamps.current[selectedTicketId] || 0)) return;
    lastTicketReadTimestamps.current[selectedTicketId] = ticketDetailQuery.dataUpdatedAt;
    void markTicketRead.mutateAsync({ id: selectedTicketId })
      .then(() => ticketsQuery.refetch())
      .catch(() => undefined);
  }, [mode, selectedTicketId, ticketDetailQuery.dataUpdatedAt, ticketDetailQuery.isSuccess]);

  useEffect(() => {
    if (!chatSentVisible) return;
    const timeout = setTimeout(() => setChatSentVisible(false), 2400);
    return () => clearTimeout(timeout);
  }, [chatSentVisible, chatSentCount]);

  async function sendMessage() {
    setError('');
    setNotice('');
    if (!conversationId || !message.trim()) return;
    try {
      await send.mutateAsync({ conversation: conversationId, data: { body: message.trim() } });
      motionHaptic('success');
      setMessage('');
      setChatSentCount(count => count + 1);
      setChatSentVisible(true);
      void messagesQuery.refetch();
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
  }

  async function openTicket() {
    setError('');
    setNotice('');
    if (!subject.trim() || !ticketBody.trim()) {
      setError('Add a subject and describe your issue.');
      return;
    }
    try {
      await createTicket.mutateAsync({ data: { subject: subject.trim(), body: ticketBody.trim() } });
      setSubject('');
      setTicketBody('');
      setNotice('Your support ticket was sent. Its latest status will appear in ticket history.');
      setTicketFeedbackVisible(true);
      setMode('tickets');
      void ticketsQuery.refetch();
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
  }

  async function sendTicketReply() {
    const body = ticketReply.trim();
    if (!selectedTicketId || !body) return;
    setError('');
    try {
      await replyTicket.mutateAsync({ id: selectedTicketId, data: { body } });
      setTicketReply('');
      motionHaptic('success');
      await Promise.all([ticketDetailQuery.refetch(), ticketsQuery.refetch()]);
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
  }

  async function emailSupport() {
    setError('');
    try {
      await Linking.openURL(`mailto:${supportEmail}`);
    } catch {
      setError(`Could not open an email app. Contact support at ${supportEmail}, or create a ticket.`);
    }
  }

  return <Screen title="Support" subtitle="Help Center, live chat, and support tickets" scrollable={mode !== 'chat'}>
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
          onPress={() => { motionHaptic('micro'); setMode(value); setError(''); setNotice(''); }}
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <Card>
          <Text style={{ color: colors.foreground, fontWeight: '700' }}>Investor support conversation</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 4 }}>
            Replies refresh automatically while this screen is open.
          </Text>
        </Card>
        {conversationQuery.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Opening your support conversation…</Text></Card> : null}
        {conversationQuery.isError ? <ErrorState message="Your support conversation could not be opened." error={conversationQuery.error} onRetry={() => void conversationQuery.refetch()} /> : null}
        {!conversationQuery.isLoading && !conversationQuery.isError && !conversationId ? <EmptyState title="Conversation unavailable" body="Use a support ticket or email instead. The support conversation could not be opened." /> : null}
        {messagesQuery.isError ? <ErrorState message="Messages could not be loaded." error={messagesQuery.error} onRetry={() => void messagesQuery.refetch()} /> : null}
        {conversationId ? <FlatList
          testID="support-chat-messages"
          data={chatMessages}
          inverted
          keyExtractor={(item, index) => first(item, ['id'], String(index))}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 6 }}
          ListEmptyComponent={
            messagesQuery.isLoading
              ? <Card><Text style={{ color: colors.mutedForeground }}>Loading messages…</Text></Card>
              : messagesQuery.isError
                ? null
                : <EmptyState title="Start a conversation" body="Send a message to investor support. Replies will appear here." />
          }
          renderItem={({ item, index }) => {
            const senderId = first(item, ['sender_id'], first(record(item.sender), ['id'], ''));
            const own = senderId === userId;
            const messageId = first(item, ['id'], first(item, ['created_at', 'date'], String(index)));
            return <ChatBubbleReveal key={messageId} id={messageId} seenIds={animatedChatMessageIds}>
              <Card style={{ backgroundColor: own ? colors.secondary : colors.card, alignSelf: own ? 'flex-end' : 'stretch', width: own ? '88%' : '100%' }}>
              <Text style={{ color: colors.foreground, lineHeight: 20 }}>{first(item, ['message', 'body', 'content'], '')}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 7 }}>{first(item, ['created_at', 'date'], '')}</Text>
              </Card>
            </ChatBubbleReveal>;
          }}
        /> : null}
        {conversationId ? <View style={{ paddingBottom: insets.bottom }}>
          {chatSentVisible ? <MotionReveal key={chatSentCount}>
            <View accessibilityLiveRegion="polite" testID="chat-message-sent" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, marginBottom: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.lightGreen }}>
              <Feather name="check" size={13} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Sent to support</Text>
            </View>
          </MotionReveal> : null}
          <Card style={{ marginBottom: 0 }}>
            <Field label="Message" value={message} onChangeText={setMessage} placeholder="Write to investor support…" multiline />
            <Action title="Send message" icon="send" loading={send.isPending} disabled={!message.trim()} onPress={() => void sendMessage()} />
          </Card>
        </View> : null}
      </KeyboardAvoidingView>
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
      {ticketsQuery.isError ? <ErrorState message="Support tickets could not be loaded." error={ticketsQuery.error} onRetry={() => void ticketsQuery.refetch()} /> : null}
      {tickets.length === 0 && !ticketsQuery.isLoading && !ticketsQuery.isError ? <EmptyState title="No tickets yet" body="Tickets you create will appear here with their latest status." /> : null}
      {tickets.map((item, index) => {
        const status = first(item, ['status'], '');
        const id = first(item, ['id'], '');
        return <MotionReveal key={id || String(index)} delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open support ticket ${first(item, ['subject'], 'Support ticket')}`} onPress={() => { setSelectedTicketId(id); setError(''); }}>
        <Card style={{ borderColor: selectedTicketId === id ? colors.primary : colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>{first(item, ['subject', 'title'], 'Support ticket')}</Text>
            <Status value={normalizedTicketStatus(status) || status || '—'} />
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 6 }}>
            {first(item, ['created_at', 'date'], '—')}
          </Text>
          {normalizedTicketStatus(status)
            ? <TicketStatusProgress status={status} />
            : null}
        </Card>
        </Pressable>
        </MotionReveal>;
      })}
      {selectedTicketId ? <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 15 }}>
              {first(selectedTicket, ['subject'], 'Ticket details')}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
              {first(selectedTicket, ['ticket_number'], `Ticket #${selectedTicketId}`)} · {first(selectedTicket, ['status'], 'open')}
            </Text>
          </View>
          <Action title="Close" icon="x" onPress={() => { setSelectedTicketId(''); setTicketReply(''); }} />
        </View>
        {ticketDetailQuery.isLoading ? <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading ticket conversation…</Text> : null}
        {ticketDetailQuery.isError ? <ErrorState message="Ticket details could not be loaded." error={ticketDetailQuery.error} onRetry={() => void ticketDetailQuery.refetch()} /> : null}
        {ticketMessages.map((item, index) => <View key={first(item, ['id'], String(index))} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
            {first(record(item.user), ['name'], 'Support')} · {first(item, ['created_at'], '')}
          </Text>
          <Text style={{ color: colors.foreground, lineHeight: 20, marginTop: 4 }}>{first(item, ['body', 'message'], '')}</Text>
        </View>)}
        <Field label="Reply" value={ticketReply} onChangeText={setTicketReply} placeholder="Add information or reply to support…" multiline />
        <Action title="Send reply" icon="send" loading={replyTicket.isPending} disabled={!ticketReply.trim()} onPress={() => void sendTicketReply()} />
      </Card> : null}
    </> : null}

    <SuccessFeedback
      visible={ticketFeedbackVisible}
      title="Support ticket submitted"
      body="Your ticket was received. Its latest status will appear in ticket history."
      onDismiss={() => setTicketFeedbackVisible(false)}
      testID="support-ticket-success-feedback"
    />
  </Screen>;
}
