import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { Feather } from '@expo/vector-icons';
import { Card, Section, Status } from '@/components/InvestorUI';
import { first, messageOf, type Json } from '@/lib/data';
import { useColors } from '@/hooks/useColors';
import { shareInvestorFile } from '@/lib/file-download';
import { MOTION, MotionReveal } from '@/lib/motion';

function updateTime(event: Json): number | null {
  const value = first(event, ['occurred_at']);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function TradeTimeline({
  events,
  apiOrigin,
  title = 'Trade updates',
}: {
  events: Json[];
  apiOrigin?: string | null;
  title?: string;
}) {
  const colors = useColors();
  const [attachmentBusy, setAttachmentBusy] = useState('');
  const [attachmentError, setAttachmentError] = useState<{ key: string; message: string } | null>(null);
  const orderedEvents = events
    .map((event, index) => ({ event, index, time: updateTime(event) }))
    .sort((left, right) => {
      if (left.time == null && right.time == null) return left.index - right.index;
      if (left.time == null) return 1;
      if (right.time == null) return -1;
      return left.time - right.time || left.index - right.index;
    });

  async function openAttachment(event: Json, key: string) {
    setAttachmentError(null);
    setAttachmentBusy(key);
    try {
      const url = first(event, ['attachment_url']);
      if (!url) throw new Error('This update has no supporting file.');
      if (!apiOrigin) throw new Error('Set the OG Exports investor server address in Settings before opening this file.');

      const resolved = new URL(url, apiOrigin);
      if (resolved.origin !== new URL(apiOrigin).origin) {
        throw new Error('For your security, update files must be hosted by the OG Exports investor server.');
      }

      const name = first(event, ['attachment_name'], 'trade-update-file');
      const mimeType = first(event, ['attachment_mime'], 'application/octet-stream');
      const extension = name.includes('.') ? name.split('.').pop() ?? 'bin' : 'bin';
      await shareInvestorFile(resolved.href, name, apiOrigin, mimeType, extension);
    } catch (error) {
      setAttachmentError({ key, message: messageOf(error) });
    } finally {
      setAttachmentBusy('');
    }
  }

  return <>
    <Section title={title} />
    <Card>
      {orderedEvents.length === 0 ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 19 }}>
          OG Exports has not published any trade updates for this project yet.
        </Text>
      ) : orderedEvents.map(({ event, index }) => {
        const key = first(event, ['id', 'event_id'], String(index));
        const status = first(event, ['status'], '—');
        const description = first(event, ['description']);
        const rawDateTime = first(event, ['occurred_at']);
        const attachmentUrl = first(event, ['attachment_url']);
        const attachmentName = first(event, ['attachment_name'], 'Supporting file');
        const attachmentMime = first(event, ['attachment_mime']);
        const isImage = attachmentMime.toLowerCase().startsWith('image/');

        return <MotionReveal
          key={key}
          delay={Math.min(index * MOTION.revealStagger, MOTION.staggerCap)}
        >
          <View testID={`trade-update-${key}`} style={{ paddingVertical: 13, borderBottomWidth: index < orderedEvents.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center' }}>
              <Feather name="clock" size={13} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 11, flexShrink: 1 }}>
                {formatDateTime(rawDateTime)}
              </Text>
            </View>
            <Status value={status} />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, marginTop: 8 }}>
            {description || '—'}
          </Text>
          {attachmentUrl ? <Pressable
            testID={`trade-update-attachment-${key}`}
            accessibilityRole="button"
            accessibilityLabel={`${isImage ? 'Open image' : 'Open document'}: ${attachmentName}`}
            onPress={() => void openAttachment(event, key)}
            disabled={attachmentBusy === key}
            style={{
              minHeight: 42,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              paddingHorizontal: 11,
              borderRadius: 10,
              backgroundColor: colors.secondary,
            }}
          >
            <Feather name={isImage ? 'image' : 'file-text'} size={15} color={colors.primary} />
            <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 11, fontWeight: '600', flex: 1 }}>
              {attachmentBusy === key ? 'Preparing file…' : attachmentName}
            </Text>
            <Feather name="arrow-down-circle" size={16} color={colors.primary} />
          </Pressable> : null}
          {attachmentError?.key === key && attachmentBusy === '' ? (
            <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 11, marginTop: 6 }}>
              {attachmentError.message}
            </Text>
          ) : null}
          </View>
        </MotionReveal>;
      })}
      <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 16, marginTop: 8 }}>
        Update times, statuses, descriptions, and supporting files are provided by OG Exports.
      </Text>
    </Card>
  </>;
}