import React, { useState } from 'react';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { messageOf } from '@/lib/data';
import { useInvestorRegister } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RegisterFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoComplete?: 'name' | 'email' | 'tel' | 'new-password';
  textContentType?: 'name' | 'emailAddress' | 'telephoneNumber' | 'newPassword';
  autoCapitalize?: 'none' | 'words';
  required?: boolean;
  secureTextEntry?: boolean;
  trailing?: React.ReactNode;
};

function RegisterField({
  label,
  value,
  placeholder,
  focused,
  onFocus,
  onBlur,
  onChangeText,
  keyboardType = 'default',
  autoComplete,
  textContentType,
  autoCapitalize = 'none',
  required = false,
  secureTextEntry = false,
  trailing,
}: RegisterFieldProps) {
  const colors = useColors();
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: colors.mutedForeground }]}>
        {label}
        {required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
      </Text>
      <View style={[
        s.inputShell,
        { borderBottomColor: focused ? colors.primary : colors.border },
        focused ? s.inputShellFocused : null,
      ]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={secureTextEntry}
          selectionColor={colors.primary}
          style={[s.input, { color: colors.foreground }]}
        />
        {trailing}
      </View>
    </View>
  );
}

export default function Register() {
  const { apiOrigin, setChallenge } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mutation = useInvestorRegister();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'mobile' | 'password' | 'confirmPassword' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!fullName.trim()) { setError('Enter your full name.'); return; }
    if (!email.trim()) { setError('Enter your email address.'); return; }
    if (!mobile.trim()) { setError('Enter your mobile number.'); return; }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('The password and confirmation do not match.'); return; }
    if (!apiOrigin) {
      setError('The investor API server is not configured for this build. Set EXPO_PUBLIC_API_BASE_URL before creating an account.');
      return;
    }
    try {
      await mutation.mutateAsync({
        data: {
          name: fullName.trim(),
          email: email.trim(),
          phone: mobile.trim(),
          password,
          password_confirmation: confirmPassword,
          account_type: 'investor',
        },
      });
      setChallenge({ email: email.trim(), mode: 'email' });
      router.push('/(auth)/verify');
    } catch (err) {
      setError(messageOf(err));
    }
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
          <Text style={[s.brandTagline, { color: colors.accent }]}>GLOBAL TRADE. SMART INVESTMENT.</Text>
        </View>
      </View>

      <View style={s.intro}>
        <Text style={[s.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          Create your OG Exports investor account.
        </Text>
      </View>

      <View style={s.form}>
        <RegisterField
          label="FULL NAME"
          value={fullName}
          onChangeText={value => { setFullName(value); setError(''); }}
          placeholder="Your full name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          focused={focusedField === 'fullName'}
          onFocus={() => setFocusedField('fullName')}
          onBlur={() => setFocusedField(null)}
          required
        />
        <RegisterField
          label="EMAIL ADDRESS"
          value={email}
          onChangeText={value => { setEmail(value); setError(''); }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          focused={focusedField === 'email'}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          required
        />
        <RegisterField
          label="MOBILE NUMBER"
          value={mobile}
          onChangeText={value => { setMobile(value); setError(''); }}
          placeholder="0300-1234567"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          focused={focusedField === 'mobile'}
          onFocus={() => setFocusedField('mobile')}
          onBlur={() => setFocusedField(null)}
          required
        />
        <RegisterField
          label="PASSWORD"
          value={password}
          onChangeText={value => { setPassword(value); setError(''); }}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!showPassword}
          focused={focusedField === 'password'}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
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
          label="CONFIRM PASSWORD"
          value={confirmPassword}
          onChangeText={value => { setConfirmPassword(value); setError(''); }}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          textContentType="newPassword"
          secureTextEntry={!showConfirmPassword}
          focused={focusedField === 'confirmPassword'}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField(null)}
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
        <Action
          title="Create Account"
          loading={mutation.isPending}
          disabled={!fullName.trim() || !email.trim() || !mobile.trim() || !password || !confirmPassword}
          onPress={() => void submit()}
        />
      </View>

      <View style={s.socialSeparator}>
        <View style={[s.separatorLine, { backgroundColor: colors.border }]} />
        <Text style={[s.separatorText, { color: colors.mutedForeground }]}>or continue with</Text>
        <View style={[s.separatorLine, { backgroundColor: colors.border }]} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Facebook sign-in is not configured"
        onPress={() => Alert.alert('Facebook sign-in unavailable', 'Facebook sign-in is not configured for OG Exports yet.')}
        style={({ pressed }) => [s.facebookButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.75 : 1 }]}
      >
        <FontAwesome name="facebook" size={19} color={colors.primary} />
        <Text style={[s.facebookText, { color: colors.foreground }]}>Facebook</Text>
      </Pressable>
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
  container: { flexGrow: 1, paddingHorizontal: 28 },
  topBar: { minHeight: 128, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  backButton: { position: 'absolute', left: 0, top: 0, width: 42, height: 46, alignItems: 'flex-start', justifyContent: 'center', zIndex: 1 },
  brand: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  brandLogo: { width: 82, height: 60, marginBottom: 2 },
  brandName: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  brandTagline: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, marginTop: 3 },
  intro: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  form: { width: '100%' },
  field: { gap: 5, marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.65 },
  inputShell: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingHorizontal: 4 },
  inputShellFocused: { borderBottomWidth: 1.5 },
  input: { flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 16 },
  visibilityButton: { padding: 5 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  socialSeparator: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 22, marginBottom: 17 },
  separatorLine: { height: 1, flex: 1 },
  separatorText: { fontSize: 13 },
  facebookButton: { minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  facebookText: { fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 25 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '700' },
});