import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

type IconName = keyof typeof Feather.glyphMap;

export function Screen({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled" bottomOffset={24}
      contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? 67 : insets.top + 10, paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 104, paddingHorizontal: 20 }}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
           <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? <Text style={[s.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
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

export function Action({ title, onPress, icon, secondary = false, disabled = false, loading = false, testID }: { title: string; onPress: () => void; icon?: IconName; secondary?: boolean; disabled?: boolean; loading?: boolean; testID?: string }) {
  const colors = useColors();
  const buttonSurface = secondary
    ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
    : { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary };
  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [s.button, buttonSurface, { opacity: disabled ? 0.48 : pressed ? 0.84 : 1 }]}>
      {loading ? <ActivityIndicator color={secondary ? colors.primary : colors.primaryForeground} /> : icon ? <Feather name={icon} size={16} color={secondary ? colors.primary : colors.primaryForeground} /> : null}
      <Text style={[s.buttonText, { color: secondary ? colors.primary : colors.primaryForeground }]}>{title}</Text>
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

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useColors();
  return <Card style={{ padding: 18 }}><Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 21 }}>{message}</Text>{onRetry ? <Pressable onPress={onRetry} style={{ marginTop: 12 }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Try again</Text></Pressable> : null}</Card>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const colors = useColors();
  return <Card style={{ alignItems: 'center', padding: 24 }}><Feather name="inbox" size={22} color={colors.mutedForeground} /><Text style={{ color: colors.foreground, fontWeight: '700', marginTop: 10 }}>{title}</Text><Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 5, lineHeight: 20 }}>{body}</Text></Card>;
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