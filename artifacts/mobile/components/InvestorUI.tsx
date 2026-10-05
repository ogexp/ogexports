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
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useAppPreferences } from '@/context/AppPreferencesContext';
import { translateUi } from '@/lib/strings';

type IconName = keyof typeof Feather.glyphMap;

function selectionFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
}

function actionFeedback() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
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
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[s.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
  if (!scrollable) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'web' ? 67 : insets.top + 10,
        paddingBottom: Platform.OS === 'web' ? 34 : 0,
        paddingHorizontal: 20,
      }}>
        {header}
        {children}
      </View>
    );
  }
  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled" bottomOffset={24}
      refreshControl={refreshable ? <RefreshControl
        testID="screen-pull-to-refresh"
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        tintColor={colors.primary}
        colors={[colors.primary]}
        progressBackgroundColor={colors.card}
      /> : undefined}
      contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top + 10, paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 104, paddingHorizontal: 20 }}>
      {header}
      {children}
    </KeyboardAwareScrollViewCompat>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  const cardShadow = Platform.OS === 'web'
    ? { boxShadow: `0 6px 20px ${colors.shadow}` }
    : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 };
  return <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }, cardShadow, style]}>{children}</View>;
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
  const buttonSurface = destructive
    ? { backgroundColor: colors.destructive, borderWidth: 1, borderColor: colors.destructive }
    : secondary
    ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
    : { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary };
  const buttonTextColor = secondary ? colors.primary : destructive ? colors.destructiveForeground : colors.primaryForeground;
  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={() => {
      if (disabled || loading) return;
      if (secondary) selectionFeedback();
      else actionFeedback();
      onPress();
    }} disabled={disabled || loading}
      style={({ pressed }) => [s.button, buttonSurface, {
        opacity: disabled ? 0.48 : pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      }]}>
      {loading ? <ActivityIndicator color={buttonTextColor} /> : icon ? <Feather name={icon} size={16} color={buttonTextColor} /> : null}
      <Text style={[s.buttonText, { color: buttonTextColor }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'sentences', multiline }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'phone-pad'; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; multiline?: boolean;
}) {
  const colors = useColors();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 7, marginBottom: 14 }}>
      <Text style={[s.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
        secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} multiline={multiline}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        selectionColor={colors.primary} underlineColorAndroid={focused ? colors.primary : colors.input}
        style={[s.input, {
          backgroundColor: colors.card,
          borderColor: focused ? colors.primary : colors.input,
          borderWidth: focused ? 1.5 : 1,
          color: colors.foreground,
          outlineWidth: 0,
        }, multiline ? { minHeight: 92, textAlignVertical: 'top' } : null]} />
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
  const approved = /approved|active|complete|paid|verified|success/i.test(value);
  const pending = /pending|review|processing/i.test(value);
  return <View style={[s.status, { backgroundColor: approved ? colors.statusSuccessBackground : pending ? colors.statusPendingBackground : colors.secondary }]}><Text style={{ color: approved ? colors.statusSuccess : pending ? colors.statusPending : colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>{value || '—'}</Text></View>;
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
  return <Card style={{ padding: 18 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
      <Feather name={offline ? 'wifi-off' : 'alert-circle'} size={17} color={offline ? colors.destructive : colors.mutedForeground} />
      {offline ? <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>Connection unavailable</Text> : null}
    </View>
    <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20 }}>
      {offline ? 'Unable to reach OG Exports. Check your internet connection and try again.' : message}
    </Text>
    {onRetry ? <View style={{ marginTop: 14 }}><Action title="Try again" icon="refresh-cw" secondary onPress={onRetry} /></View> : null}
  </Card>;
}

export function EmptyState({ title, body, icon = 'inbox' }: { title: string; body: string; icon?: IconName }) {
  const colors = useColors();
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }] }}>
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
  const opacity = React.useRef(new Animated.Value(0.58)).current;
  React.useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.92, duration: 850, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0.58, duration: 850, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return <Card>
    <View accessibilityRole="progressbar" accessibilityLabel={translateUi(label, preferences.language)} style={{ gap: 12 }}>
      <Animated.View style={{ opacity, width: '40%', height: 13, borderRadius: 7, backgroundColor: colors.secondary }} />
      {Array.from({ length: Math.max(1, lines - 1) }, (_, index) => (
        <Animated.View key={index} style={{
          opacity,
          width: index === lines - 2 ? '58%' : '82%',
          height: 11,
          borderRadius: 6,
          backgroundColor: colors.secondary,
        }} />
      ))}
    </View>
  </Card>;
}

export function SuccessMark({ icon = 'check' }: { icon?: IconName }) {
  const colors = useColors();
  const scale = React.useRef(new Animated.Value(0.72)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [opacity, scale]);
  return <Animated.View style={{
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.statusSuccessBackground,
    opacity,
    transform: [{ scale }],
  }}>
    <Feather name={icon} size={23} color={colors.statusSuccess} />
  </Animated.View>;
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
  return <Modal
    visible={visible}
    transparent
    animationType="slide"
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
  const rtl = preferences.language !== 'en';
  const actionWidth = 92;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const isOpen = React.useRef(false);
  const panResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !disabled && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
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
      Animated.spring(translateX, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
    },
  }), [actionWidth, disabled, rtl, translateX]);
  const close = () => {
    isOpen.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 5 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  button: { minHeight: 50, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { fontWeight: '700', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, minHeight: 48, fontSize: 14 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.15 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  rowValue: { fontSize: 12 },
  status: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
});
