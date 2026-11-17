import React, { useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Action, Card, Field } from '@/components/InvestorUI';
import { messageOf } from '@/lib/data';
import {
  useInvestorForgotPassword,
  useInvestorResetPassword,
  useInvestorVerifyResetCode,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MOTION, MotionReveal, motionHaptic } from '@/lib/motion';
import { RouteBrandBackdrop } from '@/components/GlassSurface';

export default function ForgotPassword() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const request = useInvestorForgotPassword();
  const verify = useInvestorVerifyResetCode();
  const reset = useInvestorResetPassword();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit() {
    setError('');
    setNotice('');
    try {
      if (step === 0) {
        await request.mutateAsync({ data: { email } });
        Keyboard.dismiss();
        setStep(1);
      } else if (step === 1) {
        await verify.mutateAsync({ data: { email, code } });
        Keyboard.dismiss();
        setStep(2);
      } else {
        if (password.length < 8) {
          setError('Use at least 8 characters for your new password.');
          return;
        }
        if (password !== confirmPassword) {
          setError('The passwords do not match.');
          return;
        }
        await reset.mutateAsync({
          data: {
            email,
            password,
            password_confirmation: confirmPassword,
          },
        });
        Keyboard.dismiss();
        setStep(3);
      }
    } catch (err) {
      motionHaptic('error');
      setError(messageOf(err));
    }
  }

  async function resendCode() {
    setError('');
    setNotice('');
    try {
      const response = await request.mutateAsync({ data: { email } });
      setNotice(
        typeof response === 'object' &&
          response !== null &&
          'message' in response &&
          typeof response.message === 'string'
          ? response.message
          : 'If the account exists, a reset code has been sent to its email address.',
      );
    } catch (err) {
      motionHaptic('error');
      setError(messageOf(err));
    }
  }

  const title = ['Reset your password', 'Enter your email code', 'Choose a new password', 'Password updated'][step];

  const description = step === 0
    ? 'Enter the email address on your account. We’ll send a reset code there.'
    : step === 3
      ? 'You can now sign in with your new password.'
      : `Reset code sent to: ${email}`;

  const iconName = step === 0
    ? 'mail'
    : step === 1
      ? 'shield'
      : step === 2
        ? 'lock'
        : 'check';

  const completedSteps = Math.min(step, 3);
  const isPending = request.isPending || verify.isPending || reset.isPending;
  const isDisabled = step === 0
    ? !email.trim()
    : step === 1
      ? code.length !== 6
      : password.length < 8 || !confirmPassword;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RouteBrandBackdrop />
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 14,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20,
          paddingHorizontal: 20,
          justifyContent: 'center',
        }}
        bottomOffset={72}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 }}>
            SECURE ACCOUNT RECOVERY
          </Text>
          <Pressable
            testID="forgot-password-close"
            accessibilityRole="button"
            accessibilityLabel="Close password recovery"
            hitSlop={10}
            onPress={() => {
              Keyboard.dismiss();
              router.back();
            }}
            style={{ padding: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <MotionReveal
          key={`recovery-content-${step}`}
          style={{ alignSelf: 'stretch' }}
        >
          <View
            accessibilityLabel={title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              marginBottom: 18,
            }}
          >
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 3,
                  backgroundColor: completedSteps > index
                    ? colors.primary
                    : completedSteps === index
                      ? colors.accent
                      : colors.border,
                }}
              />
            ))}
            <Text
              style={{
                minWidth: 48,
                textAlign: 'right',
                color: colors.primary,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1,
                fontVariant: ['tabular-nums'],
              }}
            >
              {step === 3 ? '03 / 03' : `0${step + 1} / 03`}
            </Text>
          </View>

          <View
            accessible={false}
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 17,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.lightGreen,
            }}
          >
            <Feather
              name={iconName}
              size={21}
              color={step === 3 ? colors.statusSuccess : colors.primary}
            />
          </View>

          <Text
            style={{
              color: colors.foreground,
              fontSize: 30,
              lineHeight: 36,
              fontWeight: '600',
              letterSpacing: -0.55,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              marginTop: 9,
              marginBottom: 0,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {description}
          </Text>
        </MotionReveal>

        {step < 3 ? (
          <MotionReveal
            key={`recovery-form-${step}`}
            delay={MOTION.revealStagger}
            style={{ alignSelf: 'stretch' }}
          >
            <Card
              style={{
                padding: 20,
                marginTop: 18,
                marginBottom: 0,
                borderRadius: 22,
              }}
            >
              {step === 0 ? (
                <Field
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : null}
              {step === 1 ? (
                <Field
                  label="Six-digit verification code"
                  value={code}
                  onChangeText={(value) =>
                    setCode(value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
              ) : null}
              {step === 2 ? (
                <>
                  <Field
                    label="New password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 8 characters"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <Field
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Enter the password again"
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              ) : null}
              {step === 2 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: -1,
                    marginBottom: 15,
                  }}
                >
                  <Feather
                    name="shield"
                    size={14}
                    color={colors.statusSuccess}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: colors.mutedForeground,
                      fontSize: 12,
                      lineHeight: 17,
                    }}
                  >
                    Use at least 8 characters for your new password.
                  </Text>
                </View>
              ) : null}
              {notice ? (
                <Text
                  style={{
                    color: colors.statusSuccess,
                    marginBottom: 12,
                    lineHeight: 19,
                  }}
                >
                  {notice}
                </Text>
              ) : null}
              {error ? (
                <Text
                  style={{
                    color: colors.destructive,
                    marginBottom: 12,
                    lineHeight: 19,
                  }}
                >
                  {error}
                </Text>
              ) : null}
              <Action
                title={
                  step === 0
                    ? 'Send code'
                    : step === 1
                      ? 'Verify code'
                      : 'Update password'
                }
                loading={isPending}
                onPress={() => void submit()}
                disabled={isDisabled}
                icon="arrow-right"
                testID={step === 0 ? 'forgot-password-send-code' : step === 1 ? 'forgot-password-verify-code' : 'forgot-password-update-password'}
              />
              {step === 1 ? (
                <Text
                  onPress={() => void resendCode()}
                  style={{
                    color: colors.primary,
                    textAlign: 'center',
                    padding: 14,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  Resend code
                </Text>
              ) : null}
            </Card>
          </MotionReveal>
        ) : (
          <MotionReveal
            key="recovery-complete"
            delay={MOTION.revealStagger}
            style={{ alignSelf: 'stretch' }}
          >
            <Card
              style={{
                padding: 20,
                marginTop: 18,
                marginBottom: 0,
                borderRadius: 22,
              }}
            >
              <Text
                style={{
                  color: colors.mutedForeground,
                  lineHeight: 22,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              >
                Your password has been updated. Sign in with the new password to
                continue.
              </Text>
              <Action
                title="Back to sign in"
                icon="arrow-right"
                onPress={() => router.replace('/(auth)/login')}
              />
            </Card>
          </MotionReveal>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}