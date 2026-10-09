import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSegments } from 'expo-router';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useQueryClient } from '@tanstack/react-query';
import { useAppPreferences } from '@/context/AppPreferencesContext';
import { translateUi } from '@/lib/strings';
import { MOTION, MotionReveal, motionHaptic, useMotion } from '@/lib/motion';
import {
  shouldPlayTransactionChime,
  transactionAudioModeForPlatform,
  type TransactionFeedback,
} from '@/lib/transaction-sound';

type IconName = keyof typeof Feather.glyphMap;

function selectionFeedback() {
  motionHaptic('micro');
}

function actionFeedback() {
  motionHaptic('action');
}

export function Screen({ title, subtitle, children, action, scrollable = true, refreshable = false }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  scrollable?: boolean;
  refreshable?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const isHeaderlessTabRoute = segments[0] === '(tabs)';
  const topPadding = Platform.OS === 'web'
    ? 67
    : Platform.OS === 'android'
      ? insets.top
      : isHeaderlessTabRoute ? Math.max(20, insets.top - 4) : 0;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = React.useCallback(async () => {
    if (!refreshable || refreshing) return;
    setRefreshing(true);
    selectionFeedback();
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refreshable, refreshing]);
  const header = (
    <MotionReveal testID="screen-header-reveal">
    <View style={[s.header, Platform.OS === 'ios' ? { marginBottom: 16 } : undefined]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[s.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
    </MotionReveal>
  );
  if (!scrollable) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: topPadding,
        paddingBottom: Platform.OS === 'web' ? 34 : 0,
        paddingHorizontal: 20,
      }}>
        {header}
        <MotionReveal delay={35} style={{ flex: 1 }} testID="screen-content-reveal">{children}</MotionReveal>
      </View>
    );
  }
  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled" bottomOffset={24}
      refreshControl={refreshable ? <RefreshControl
        testID="screen-pull-to-refresh"
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        tintColor={colors.primary}
        colors={[colors.primary]}
        progressBackgroundColor={colors.card}
      /> : undefined}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 104, paddingHorizontal: 20 }}>
      {header}
      <MotionReveal delay={35} testID="screen-content-reveal">{children}</MotionReveal>
    </KeyboardAwareScrollViewCompat>
  );
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: object; testID?: string }) {
  const colors = useColors();
  const cardShadow = Platform.OS === 'web'
    ? { boxShadow: `0 5px 16px ${colors.shadow}` }
    : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 1 };
  return <View testID={testID} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }, cardShadow, style]}>{children}</View>;
}

export function Action({ title, onPress, icon, secondary = false, destructive = false, disabled = false, loading = false, testID }: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const { reduceMotion } = useMotion();
  const buttonSurface = destructive
    ? { backgroundColor: colors.destructive, borderWidth: 1, borderColor: colors.destructive }
    : secondary
    ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
    : { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary };
  const buttonTextColor = secondary ? colors.primary : destructive ? colors.destructiveForeground : colors.primaryForeground;
  return (
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} testID={testID} onPress={() => {
      if (disabled || loading) return;
      if (secondary) selectionFeedback();
      else actionFeedback();
      onPress();
    }} disabled={disabled || loading}
      style={({ pressed }) => [s.button, buttonSurface, {
        opacity: disabled ? 0.48 : pressed ? 0.9 : 1,
         transform: [{ scale: pressed && !reduceMotion ? MOTION.pressScale : 1 }],
      }]}>
      {loading ? <ActivityIndicator color={buttonTextColor} /> : icon ? <Feather name={icon} size={16} color={buttonTextColor} /> : null}
      <Text style={[s.buttonText, { color: buttonTextColor }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'sentences', multiline, autoFocus, maxLength, editable = true }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'phone-pad'; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; multiline?: boolean; autoFocus?: boolean; maxLength?: number; editable?: boolean;
}) {
  const colors = useColors();
  const [focused, setFocused] = React.useState(false);
  const { reduceMotion } = useMotion();
  const focusOpacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (reduceMotion) {
      focusOpacity.setValue(focused ? 1 : 0);
      return;
    }
    const animation = Animated.timing(focusOpacity, {
      toValue: focused ? 1 : 0,
      duration: MOTION.micro,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [focusOpacity, focused, reduceMotion]);
  return (
    <View style={{ gap: 7, marginBottom: 14 }}>
      <Text style={[s.label, { color: colors.foreground }]}>{label}</Text>
      <View>
        <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
          editable={editable}
          autoFocus={autoFocus} maxLength={maxLength}
          secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} multiline={multiline}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          selectionColor={colors.primary} underlineColorAndroid={colors.input}
          style={[s.input, {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.border,
            borderWidth: 1,
            color: colors.foreground,
            outlineWidth: 0,
            opacity: editable ? 1 : 0.65,
          }, multiline ? { minHeight: 92, textAlignVertical: 'top' } : null]} />
        <Animated.View pointerEvents="none" style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: colors.primary,
          opacity: focusOpacity,
        }} />
      </View>
    </View>
  );
}

export function Section({ title, right }: { title: string; right?: React.ReactNode }) {
  const colors = useColors();
  return <View style={s.section}><Text style={[s.sectionTitle, { color: colors.foreground }]}>{title}</Text>{right}</View>;
}

export function Row({ label, value, icon, onPress }: { label: string; value?: string; icon?: IconName; onPress?: () => void }) {
  const colors = useColors();
  const content = (
    <>
      {icon ? <View style={[s.rowIcon, { backgroundColor: colors.lightGreen }]}><Feather name={icon} size={16} color={colors.primary} /></View> : null}
      <Text style={[s.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {value ? <Text style={[s.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </>
  );
  return <Pressable onPress={onPress} disabled={!onPress} style={[s.row, { borderBottomColor: colors.border }]}>{content}</Pressable>;
}

export function Status({ value }: { value: string }) {
  const colors = useColors();
  const language = useAppPreferences().preferences.language;
  const label = value.trim() || '—';
  const normalized = label.toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const successStatuses = new Set(['approved', 'active', 'complete', 'completed', 'paid', 'verified', 'success', 'successful', 'settled', 'delivered', 'distributed', 'released', 'disbursed']);
  const pendingStatuses = new Set(['pending', 'pending review', 'review', 'under review', 'processing', 'submitted', 'initiated', 'awaiting', 'awaiting review', 'awaiting update', 'in transit', 'shipped', 'scheduled', 'queued', 'in progress']);
  const errorStatuses = new Set(['rejected', 'failed', 'error', 'declined', 'cancelled', 'canceled', 'expired', 'blocked', 'suspended', 'overdue', 'returned']);
  const tone = successStatuses.has(normalized) ? 'success'
    : pendingStatuses.has(normalized) ? 'pending'
      : errorStatuses.has(normalized) ? 'error'
        : 'neutral';
  const foreground = tone === 'success' ? colors.statusSuccess
    : tone === 'pending' ? colors.statusPending
      : tone === 'error' ? colors.destructive
        : colors.mutedForeground;
  const background = tone === 'success' ? colors.statusSuccessBackground
    : tone === 'pending' ? colors.statusPendingBackground
      : colors.secondary;
  const icon = tone === 'success' ? 'checkmark-circle'
    : tone === 'pending' ? 'time-outline'
      : tone === 'error' ? 'close-circle'
        : 'information-circle-outline';
  const accessibleLabel = `${translateUi('Status', language)}: ${translateUi(label, language)}`;
  return <MotionReveal key={`${tone}:${label}`} style={{ alignSelf: 'flex-start' }}>
    <View accessible accessibilityRole="text" accessibilityLabel={accessibleLabel}
    style={[s.status, { backgroundColor: background, flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 190 }]}>
    <Ionicons name={icon} size={13} color={foreground} />
    <Text numberOfLines={1} style={{ color: foreground, fontSize: 11, fontWeight: '700', flexShrink: 1 }}>{label}</Text>
    </View>
  </MotionReveal>;
}

function isOfflineFailure(error: unknown, message: string) {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const details = [message, source.message, source.name, source.code]
    .filter(value => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return /network request failed|failed to fetch|networkerror|network error|offline|internet connection|connection (?:refused|lost|unavailable)|econn(?:refused|reset|aborted)|err_network|timed? ?out/.test(details);
}

export function ErrorState({ message, onRetry, error }: { message: string; onRetry?: () => void; error?: unknown }) {
  const colors = useColors();
  const offline = isOfflineFailure(error, message);
  return <MotionReveal>
  <Card style={{ padding: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
      <Feather name={offline ? 'wifi-off' : 'alert-circle'} size={17} color={offline ? colors.destructive : colors.mutedForeground} />
      {offline ? <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>Connection unavailable</Text> : null}
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20 }}>
      {offline ? 'Unable to reach OG Exports. Check your internet connection and try again.' : message}
    </Text>
    {onRetry ? <View style={{ marginTop: 14 }}><Action title="Try again" icon="refresh-cw" secondary onPress={onRetry} /></View> : null}
  </Card>
  </MotionReveal>;
}

export function EmptyState({ title, body, icon = 'inbox' }: { title: string; body: string; icon?: IconName }) {
  const colors = useColors();
  const { reduceMotion } = useMotion();
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [opacity, reduceMotion]);
  return <Animated.View style={{ opacity }}>
    <Card style={{ alignItems: 'center', padding: 24 }}>
      <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={{ color: colors.foreground, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 5, lineHeight: 20 }}>{body}</Text>
    </Card>
  </Animated.View>;
}

export function LoadingCard({ label = 'Loading…', lines = 3 }: { label?: string; lines?: number }) {
  const colors = useColors();
  const { preferences } = useAppPreferences();
  return <Card>
    <View accessibilityRole="progressbar" accessibilityLabel={translateUi(label, preferences.language)} style={{ gap: 12 }}>
      <View style={{ opacity: 0.72, width: '40%', height: 13, borderRadius: 7, backgroundColor: colors.secondary }} />
      {Array.from({ length: Math.max(1, lines - 1) }, (_, index) => (
        <View key={index} style={{
          opacity: 0.72,
          width: index === lines - 2 ? '58%' : '82%',
          height: 11,
          borderRadius: 6,
          backgroundColor: colors.secondary,
        }} />
      ))}
    </View>
  </Card>;
}

export function SuccessMark({ icon, feedback = 'success' }: { icon?: IconName; feedback?: 'success' | 'approved' | 'ack' | 'attention' | 'none' }) {
  const colors = useColors();
  const { reduceMotion } = useMotion();
  const opacity = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const feedbackFired = React.useRef(false);
  const isAcknowledgement = feedback === 'ack';
  const isAttention = feedback === 'attention';
  const isPendingTone = isAcknowledgement || feedback === 'approved';
  const markColor = isAttention ? colors.destructive : isPendingTone ? colors.statusPending : colors.statusSuccess;
  const markBackground = isAttention ? `${colors.destructive}1A` : isPendingTone ? colors.statusPendingBackground : colors.statusSuccessBackground;
  React.useEffect(() => {
    if (!feedbackFired.current) {
      feedbackFired.current = true;
      if (feedback !== 'none') motionHaptic(feedback === 'success' ? 'success' : feedback === 'attention' ? 'error' : 'micro');
    }
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const entrance = Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.micro,
      useNativeDriver: Platform.OS !== 'web',
    });
    entrance.start();
    return () => entrance.stop();
  }, [feedback, opacity, reduceMotion]);
  return <View style={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={{
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: markBackground,
      opacity,
    }}>
      <Feather name={icon || (isAttention ? 'alert-circle' : isAcknowledgement ? 'clock' : 'check')} size={23} color={markColor} />
    </Animated.View>
  </View>;
}

export function SuccessFeedback({
  visible,
  title,
  body,
  onDismiss,
  feedback = 'ack',
  status,
  reference,
  testID,
}: {
  visible: boolean;
  title: string;
  body: string;
  onDismiss: () => void;
  feedback?: 'success' | 'approved' | 'ack' | 'attention';
  status?: string;
  reference?: string;
  testID?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotion();
  const opacity = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const transition = React.useRef<Animated.CompositeAnimation | null>(null);
  const dismissing = React.useRef(false);
  const successChime = useAudioPlayer(require('../assets/sounds/transaction-complete.mp3'));
  const successChimeStatus = useAudioPlayerStatus(successChime);
  const playedSuccessChime = React.useRef(false);

  React.useEffect(() => {
    if (!visible) {
      playedSuccessChime.current = false;
      return;
    }
    if (
      !shouldPlayTransactionChime(visible, feedback as TransactionFeedback)
      || !successChimeStatus.isLoaded
      || playedSuccessChime.current
    ) return;
    playedSuccessChime.current = true;
    void (async () => {
      try {
        await setAudioModeAsync(transactionAudioModeForPlatform(Platform.OS));
        successChime.volume = 0.92;
        await successChime.seekTo(0);
        successChime.play();
      } catch (error) {
        console.warn('Transaction confirmation chime could not play.', error);
        // Audio feedback is optional; the visual confirmation and haptic remain authoritative.
      }
    })();
  }, [feedback, successChime, successChimeStatus.isLoaded, visible]);

  const handleDismiss = React.useCallback(() => {
    if (dismissing.current) return;
    if (reduceMotion) {
      onDismiss();
      return;
    }
    dismissing.current = true;
    transition.current?.stop();
    const exit = Animated.timing(opacity, {
      toValue: 0,
      duration: MOTION.micro,
      useNativeDriver: Platform.OS !== 'web',
    });
    transition.current = exit;
    exit.start(({ finished }) => {
      if (transition.current === exit) transition.current = null;
      dismissing.current = false;
      if (finished) onDismiss();
    });
  }, [onDismiss, opacity, reduceMotion]);

  React.useEffect(() => {
    if (!visible) {
      dismissing.current = false;
      transition.current?.stop();
      transition.current = null;
      opacity.setValue(0);
      return;
    }
    dismissing.current = false;
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const entrance = Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.component,
      useNativeDriver: Platform.OS !== 'web',
    });
    transition.current = entrance;
    entrance.start(() => {
      if (transition.current === entrance) transition.current = null;
    });
    return () => {
      entrance.stop();
      if (transition.current === entrance) transition.current = null;
    };
  }, [opacity, reduceMotion, visible]);

  return <Modal
    visible={visible}
    transparent
    animationType="none"
    statusBarTranslucent
    onRequestClose={handleDismiss}
  >
    {visible ? <Animated.View
      testID={testID}
      accessibilityViewIsModal
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        backgroundColor: 'rgba(8, 18, 13, 0.32)',
        opacity: reduceMotion ? 1 : opacity,
      }}
    >
      <Pressable
        accessible={false}
        importantForAccessibility="no"
        onPress={handleDismiss}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        accessibilityRole="alert"
        style={{
          width: '100%',
          maxWidth: 390,
          padding: 23,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          alignItems: 'center',
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.16,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
          elevation: 14,
        }}
      >
        <SuccessMark feedback={feedback} />
        <Text style={{ color: colors.foreground, fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 15 }}>
          {title}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 }}>
          {body}
        </Text>
        {status?.trim() || reference?.trim() ? <View style={{
          alignSelf: 'stretch',
          marginTop: 17,
          paddingHorizontal: 13,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}>
          {status?.trim() ? <View style={{
            minHeight: 41,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottomWidth: reference?.trim() ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Status</Text>
            <Text style={{
              color: feedback === 'success' ? colors.statusSuccess : feedback === 'attention' ? colors.destructive : colors.statusPending,
              fontSize: 14,
              fontWeight: '700',
              textAlign: 'right',
              flexShrink: 1,
            }}>{status.trim()}</Text>
          </View> : null}
          {reference?.trim() ? <View style={{
            minHeight: 41,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Reference</Text>
            <Text selectable style={{
              color: colors.foreground,
              fontSize: 13,
              fontWeight: '700',
              textAlign: 'right',
              flexShrink: 1,
            }}>{reference.trim()}</Text>
          </View> : null}
        </View> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          testID={testID ? `${testID}-dismiss` : undefined}
          onPress={handleDismiss}
          style={({ pressed }) => ({
            minHeight: 48,
            alignSelf: 'stretch',
            marginTop: 20,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed && !reduceMotion ? MOTION.pressScale : 1 }],
          })}
        >
          <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '700' }}>Continue</Text>
        </Pressable>
      </Animated.View>
    </Animated.View> : null}
  </Modal>;
}

export function ConfirmationSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
  testID,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useMotion();
  return <Modal
    visible={visible}
    transparent
    animationType={reduceMotion ? 'none' : 'slide'}
    statusBarTranslucent
    onRequestClose={loading ? undefined : onCancel}
  >
    <View testID={testID} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 18, 13, 0.40)' }}>
      <Pressable
        accessible={false}
        importantForAccessibility="no"
        onPress={loading ? undefined : onCancel}
        style={StyleSheet.absoluteFill}
      />
      <View style={{
        alignSelf: 'center',
        width: '100%',
        maxWidth: 560,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 22,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 18) + 12,
      }}>
        <View style={{ width: 38, height: 4, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ color: colors.foreground, fontSize: 19, lineHeight: 25, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 20, fontSize: 14, lineHeight: 21 }}>{body}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Action title={cancelLabel} secondary disabled={loading} onPress={onCancel} />
          </View>
          <View style={{ flex: 1 }}>
            <Action title={confirmLabel} icon={destructive ? 'log-out' : 'check'} destructive={destructive} loading={loading} onPress={onConfirm} testID={testID ? `${testID}-confirm` : undefined} />
          </View>
        </View>
      </View>
    </View>
  </Modal>;
}

export function SwipeAction({ children, label, onAction, disabled = false }: {
  children: React.ReactNode;
  label: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const { preferences } = useAppPreferences();
  const { reduceMotion } = useMotion();
  const rtl = preferences.language !== 'en';
  const actionWidth = 92;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const isOpen = React.useRef(false);
  const panResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && !reduceMotion && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      const progress = Math.max(0, Math.min(actionWidth, (isOpen.current ? actionWidth : 0) + (rtl ? gesture.dx : -gesture.dx)));
      translateX.setValue(rtl ? progress : -progress);
    },
    onPanResponderRelease: (_, gesture) => {
      const directed = rtl ? gesture.dx : -gesture.dx;
      const shouldOpen = isOpen.current ? directed > -40 : directed > 44;
      isOpen.current = shouldOpen;
      if (shouldOpen) selectionFeedback();
      Animated.spring(translateX, {
        toValue: shouldOpen ? (rtl ? actionWidth : -actionWidth) : 0,
        damping: 22,
        stiffness: 220,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    },
    onPanResponderTerminate: () => {
      isOpen.current = false;
      if (reduceMotion) translateX.setValue(0);
      else Animated.spring(translateX, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    },
  }), [actionWidth, disabled, reduceMotion, rtl, translateX]);
  const close = () => {
    isOpen.current = false;
    if (reduceMotion) translateX.setValue(0);
    else Animated.spring(translateX, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  return <View style={{ overflow: 'hidden', borderRadius: 18, marginBottom: 14 }}>
    <View style={[StyleSheet.absoluteFill, { alignItems: rtl ? 'flex-start' : 'flex-end', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colors.lightGreen }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translateUi(label, preferences.language)}
        disabled={disabled}
        onPress={() => { close(); onAction(); }}
        style={{ width: actionWidth - 8, alignItems: 'center', justifyContent: 'center', gap: 5 }}
      >
        <Feather name="check-circle" size={19} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
      </Pressable>
    </View>
    <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  </View>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '600', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 5 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontWeight: '600', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, minHeight: 48, fontSize: 14 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.15 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  rowValue: { fontSize: 12 },
  status: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
});
