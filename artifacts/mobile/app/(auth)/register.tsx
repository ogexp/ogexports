import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card } from '@/components/InvestorUI';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RegisterFieldProps = {
  label: string;
  icon: 'mail' | 'lock';
  value: string;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address';
  autoComplete?: 'email' | 'new-password';
  textContentType?: 'emailAddress' | 'newPassword';
  secureTextEntry?: boolean;
  trailing?: React.ReactNode;
  hint?: string;
  hintState?: 'neutral' | 'success' | 'error';
};

function RegisterField({
  label,
  icon,
  value,
  placeholder,
  focused,
  onFocus,
  onBlur,
  onChangeText,
  keyboardType = 'default',
  autoComplete,
  textContentType,
  secureTextEntry = false,
  trailing,
  hint,
  hintState = 'neutral',
}: RegisterFieldProps) {
  const colors = useColors();
  const hintColor = hintState === 'success' ? colors.statusSuccess : hintState === 'error' ? colors.destructive : colors.mutedForeground;
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: colors.foreground }]}>{label}</Text>
      <View style={[
        s.inputShell,
        { backgroundColor: colors.card, borderColor: focused ? colors.primary : colors.input },
        focused ? s.inputShellFocused : null,
      ]}>
        <Feather name={icon} size={17} color={focused ? colors.primary : colors.mutedForeground} />
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={secureTextEntry}
          selectionColor={colors.primary}
          style={[s.input, { color: colors.foreground }]}
        />
        {trailing}
      </View>
      {hint ? (
        <View style={s.hintRow}>
          <Feather
            name={hintState === 'success' ? 'check-circle' : hintState === 'error' ? 'alert-circle' : 'info'}
            size={13}
            color={hintColor}
          />
          <Text style={[s.hint, { color: hintColor }]}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function Register() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'confirmPassword' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const confirmationHint = !confirmPassword
    ? 'Enter the password again to confirm.'
    : passwordsMatch
      ? 'Passwords match.'
      : 'Passwords do not match.';

  function submit() {
    setError('');
    setNotice('');
    if (!email.trim()) { setError('Enter your email address.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('The password and confirmation do not match.'); return; }
    setNotice('No account was created and no verification code was sent. Signup is not connected yet.');
  }

  const topInset = Platform.OS === 'web' ? 72 : insets.top + 10;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom + 24;
  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.container, { paddingTop: topInset, paddingBottom: bottomInset }]}
      bottomOffset={72}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
          style={s.backButton}
        >
          <Feather name="arrow-left" size={21} color={colors.primary} />
        </Pressable>
        <View style={s.brand}>
          <Image source={require('../../assets/images/og-logo.png')} resizeMode="contain" style={s.brandLogo} />
          <Text style={[s.brandName, { color: colors.primary }]}>OG Exports</Text>
        </View>
      </View>

      <View style={s.intro}>
        <Text style={[s.eyebrow, { color: colors.tint }]}>INVESTOR ACCESS</Text>
        <Text style={[s.title, { color: colors.primary }]}>Create your account</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          Enter your details to prepare your account. Nothing will be sent until signup is connected.
        </Text>
      </View>

      <View style={[s.verificationNote, { backgroundColor: colors.lightGreen }]}>
        <View style={[s.noteIcon, { backgroundColor: colors.card }]}>
          <Feather name="mail" size={17} color={colors.primary} />
        </View>
        <View style={s.noteCopy}>
          <Text style={[s.noteTitle, { color: colors.primary }]}>Signup is not connected yet</Text>
          <Text style={[s.noteBody, { color: colors.mutedForeground }]}>Your details stay on this screen and won’t be sent.</Text>
        </View>
      </View>

      <Card style={s.formCard}>
        <Text style={[s.formTitle, { color: colors.foreground }]}>Account details</Text>
        <RegisterField
          label="Email address"
          icon="mail"
          value={email}
          onChangeText={value => { setEmail(value); setError(''); setNotice(''); }}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          focused={focusedField === 'email'}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
        />
        <RegisterField
          label="Password"
          icon="lock"
          value={password}
          onChangeText={value => { setPassword(value); setError(''); setNotice(''); }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!showPassword}
          focused={focusedField === 'password'}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          hint={password.length >= 8 ? 'Minimum length met.' : 'Use at least 8 characters.'}
          hintState={password.length >= 8 ? 'success' : 'neutral'}
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={8}
              onPress={() => setShowPassword(value => !value)}
              style={s.visibilityButton}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </Pressable>
          }
        />
        <RegisterField
          label="Confirm password"
          icon="lock"
          value={confirmPassword}
          onChangeText={value => { setConfirmPassword(value); setError(''); setNotice(''); }}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!showConfirmPassword}
          focused={focusedField === 'confirmPassword'}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField(null)}
          hint={confirmationHint}
          hintState={!confirmPassword ? 'neutral' : passwordsMatch ? 'success' : 'error'}
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
              hitSlop={8}
              onPress={() => setShowConfirmPassword(value => !value)}
              style={s.visibilityButton}
            >
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </Pressable>
          }
        />
        {error ? (
          <View style={s.errorRow}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text accessibilityRole="alert" style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}
        {notice ? (
          <View style={s.noticeRow}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[s.errorText, { color: colors.mutedForeground }]}>{notice}</Text>
          </View>
        ) : null}
        <Action
          title="Create account"
          icon="arrow-right"
          disabled={!email.trim() || !password || !confirmPassword}
          onPress={submit}
        />
      </Card>

      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.mutedForeground }]}>Already have an account?</Text>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/(auth)/login')}>
          <Text style={[s.footerLink, { color: colors.primary }]}>Sign in</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { width: 38, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandLogo: { width: 48, height: 34 },
  brandName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  intro: { marginBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 9 },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 9 },
  verificationNote: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 17 },
  noteIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteCopy: { flex: 1, gap: 2 },
  noteTitle: { fontSize: 13, fontWeight: '700' },
  noteBody: { fontSize: 12, lineHeight: 17 },
  formCard: { padding: 18, marginBottom: 12 },
  formTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  field: { gap: 8, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  inputShell: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14 },
  inputShellFocused: { borderWidth: 1.5 },
  input: { flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 15 },
  visibilityButton: { padding: 4 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { fontSize: 11, lineHeight: 16 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 5 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '700' },
});