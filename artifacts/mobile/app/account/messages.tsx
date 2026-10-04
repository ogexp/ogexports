import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useGetInvestorAdminConversation, useGetInvestorConversationMessages, useSendInvestorConversationMessage, useGetInvestorSupportTickets, useCreateInvestorSupportTicket } from '@workspace/api-client-react';
import { Action, Card, EmptyState, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Messages() {
  const { token } = useAuth();
  const colors = useColors();
  const [mode, setMode] = useState<'messages' | 'tickets'>('messages');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [error, setError] = useState('');
  const conversationQuery = useGetInvestorAdminConversation({ query: { queryKey: ['investor-admin-conversation'], enabled: !!token } });
  const conversation = unwrap(conversationQuery.data);
  const conversationId = first(conversation, ['id', 'conversation_id'], '');
  const messagesQuery = useGetInvestorConversationMessages(conversationId, { query: { queryKey: ['investor-conversation-messages', conversationId], enabled: Boolean(token && conversationId) } });
  const send = useSendInvestorConversationMessage();
  const ticketsQuery = useGetInvestorSupportTickets({ query: { queryKey: ['investor-support-tickets'], enabled: !!token } });
  const createTicket = useCreateInvestorSupportTicket();
  const messages = list(messagesQuery.data);
  const tickets = list(ticketsQuery.data);

  async function sendMessage() {
    setError('');
    if (!conversationId || !message.trim()) return;
    try {
      await send.mutateAsync({ conversation: conversationId, data: { message: message.trim() } });
      setMessage('');
      void messagesQuery.refetch();
    } catch (err) { setError(messageOf(err)); }
  }
  async function openTicket() {
    setError('');
    if (!subject.trim() || !ticketBody.trim()) { setError('Add a subject and describe your issue.'); return; }
    try {
      await createTicket.mutateAsync({ data: { subject, message: ticketBody } });
      setSubject(''); setTicketBody('');
      Alert.alert('Support request created', 'Your support ticket has been sent.');
      void ticketsQuery.refetch();
    } catch (err) { setError(messageOf(err)); }
  }
  return <Screen title="Messages & support" subtitle="Contact the OG Exports investor support team">
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>{(['messages', 'tickets'] as const).map(value => <Pressable key={value} onPress={() => setMode(value)} style={{ borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: mode === value ? colors.primary : colors.secondary }}><Text style={{ color: mode === value ? colors.primaryForeground : colors.foreground, fontWeight: '700', textTransform: 'capitalize', fontSize: 12 }}>{value === 'messages' ? 'Conversation' : 'Support tickets'}</Text></Pressable>)}</View>
    {error ? <Text style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
    {mode === 'messages' ? <>
      {conversationQuery.isError ? <ErrorState message="Your support conversation could not be opened." onRetry={() => void conversationQuery.refetch()} /> : null}
      {messagesQuery.isError ? <ErrorState message="Messages could not be loaded." onRetry={() => void messagesQuery.refetch()} /> : null}
      {messages.length === 0 && !messagesQuery.isLoading ? <EmptyState title="Start a conversation" body="Send a message to the investor support team. Replies will appear here." /> : null}
      {messages.map((item, index) => {
        const own = /investor|user/i.test(first(record(item.sender), ['role', 'type'], first(item, ['sender_type', 'role'], '')));
        return <Card key={first(item, ['id'], String(index))} style={{ backgroundColor: own ? colors.secondary : colors.card, alignSelf: own ? 'flex-end' : 'stretch', width: own ? '88%' : '100%' }}>
          <Text style={{ color: colors.foreground, lineHeight: 20 }}>{first(item, ['message', 'body', 'content'], '')}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 7 }}>{first(item, ['created_at', 'date'], '')}</Text>
        </Card>;
      })}
      <Card><Field label="Message" value={message} onChangeText={setMessage} placeholder="Write to investor support…" multiline /><Action title="Send message" icon="send" loading={send.isPending} disabled={!message.trim() || !conversationId} onPress={() => void sendMessage()} /></Card>
    </> : <>
      <Card><Text style={{ color: colors.foreground, fontWeight: '700', marginBottom: 10 }}>Create a ticket</Text><Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" /><Field label="Details" value={ticketBody} onChangeText={setTicketBody} placeholder="Describe the issue" multiline /><Action title="Submit support ticket" icon="help-circle" loading={createTicket.isPending} disabled={!subject.trim() || !ticketBody.trim()} onPress={() => void openTicket()} /></Card>
      {ticketsQuery.isError ? <ErrorState message="Support tickets could not be loaded." onRetry={() => void ticketsQuery.refetch()} /> : null}
      {tickets.length === 0 && !ticketsQuery.isLoading ? <EmptyState title="No open tickets" body="Tickets you create will show here with their latest status." /> : null}
      {tickets.map((item, index) => <Card key={first(item, ['id'], String(index))}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text style={{ color: colors.foreground, fontWeight: '700', flex: 1 }}>{first(item, ['subject', 'title'], 'Support ticket')}</Text><Status value={first(item, ['status'], 'Open')} /></View><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>{first(item, ['created_at', 'date'], '')}</Text></Card>)}
    </>}
  </Screen>;
}