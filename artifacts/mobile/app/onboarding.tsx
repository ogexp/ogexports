import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Card } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const slides = [
  {
    illustration: 'container' as const,
    title: 'Invest in Real-World Trade',
    body: 'Participate in selected import and export trade opportunities connected to real cargo.',
  },
  {
    illustration: 'shipment' as const,
    title: 'Track Every Trade',
    body: 'Follow each trade from cargo preparation through shipment and arrival at its destination.',
  },
  {
    illustration: 'portfolio' as const,
    title: 'Manage Your Portfolio',
    body: 'Review investments, wallet balance, returns and distributions, and trade performance in one place.',
  },
];

function OnboardingIllustration({ kind }: { kind: (typeof slides)[number]['illustration'] }) {
  const colors = useColors();
  const accessibleLabel = kind === 'container'
    ? 'Shipping container connected to a global trade route'
    : kind === 'shipment'
      ? 'Cargo ship moving through cargo preparation, shipment and destination milestones'
      : 'Digital investor portfolio with trade investments, wallet and performance'
  return <Svg width="100%" height="100%" viewBox="0 0 300 220" accessibilityRole="image" accessibilityLabel={accessibleLabel}>
    {kind === 'container' ? <>
      <Circle cx="148" cy="112" r="79" fill={colors.lightGreen} fillOpacity="0.58" />
      <Path d="M35 57 C86 17 197 23 253 68" fill="none" stroke={colors.tint} strokeWidth="1.5" strokeDasharray="4 6" />
      <Circle cx="35" cy="57" r="5" fill={colors.accent} />
      <Circle cx="253" cy="68" r="5" fill={colors.primary} />
      <Path d="M48 82 L76 62 H216 L189 82 Z" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M189 82 L216 62 V137 L189 158 Z" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Rect x="48" y="82" width="141" height="76" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.8" />
      <Path d="M60 88 V151 M72 86 V153 M84 85 V155 M96 84 V156 M108 83 V157 M120 83 V158 M132 83 V158 M144 83 V158 M156 83 V158 M168 83 V158 M180 83 V158" stroke={colors.tint} strokeOpacity="0.58" strokeWidth="1.5" />
      <Path d="M119 83 V158 M113 112 H116 M123 112 H126" stroke={colors.primary} strokeWidth="1.5" />
      <Rect x="77" y="115" width="28" height="15" rx="3" fill={colors.secondary} />
      <Path d="M83 120 H99 M83 125 H95" stroke={colors.primary} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M197 77 V150 M206 70 V145" stroke={colors.tint} strokeOpacity="0.65" strokeWidth="1.4" />
      <Path d="M211 158 C222 150 226 144 229 136" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="3 4" />
      <Circle cx="251" cy="116" r="25" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Ellipse cx="251" cy="116" rx="11" ry="25" fill="none" stroke={colors.tint} strokeWidth="1.2" />
      <Path d="M227 116 H275 M232 104 C243 109 259 109 270 104 M232 128 C243 123 259 123 270 128" fill="none" stroke={colors.tint} strokeWidth="1.2" />
      <Circle cx="262" cy="105" r="3.5" fill={colors.accent} />
    </> : null}
    {kind === 'shipment' ? <>
      <Circle cx="150" cy="115" r="83" fill={colors.lightGreen} fillOpacity="0.48" />
      <Path d="M49 39 H251" fill="none" stroke={colors.border} strokeWidth="2" />
      <Path d="M49 39 H150" fill="none" stroke={colors.primary} strokeWidth="2" />
      <Circle cx="49" cy="39" r="7" fill={colors.accent} />
      <Circle cx="150" cy="39" r="7" fill={colors.primary} />
      <Circle cx="251" cy="39" r="7" fill={colors.card} stroke={colors.primary} strokeWidth="1.5" />
      <Rect x="83" y="55" width="37" height="33" rx="3" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="122" y="55" width="37" height="33" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="65" y="90" width="37" height="36" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="104" y="90" width="37" height="36" rx="3" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="143" y="90" width="37" height="36" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.4" />
      <Path d="M73 95 V121 M80 93 V123 M88 93 V123 M96 93 V123 M112 95 V121 M120 93 V123 M128 93 V123 M151 95 V121 M159 93 V123 M167 93 V123 M91 60 V83 M99 58 V85 M130 60 V83 M138 58 V85" stroke={colors.tint} strokeOpacity="0.72" strokeWidth="1" />
      <Path d="M181 91 L193 78 H225 L238 91 V127 H181 Z" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Rect x="190" y="97" width="9" height="10" rx="1" fill={colors.card} />
      <Rect x="204" y="97" width="9" height="10" rx="1" fill={colors.card} />
      <Rect x="218" y="97" width="9" height="10" rx="1" fill={colors.card} />
      <Path d="M34 130 H265 L239 169 C235 176 230 179 219 179 H78 C64 179 58 174 52 163 Z" fill={colors.primary} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M52 151 H251" stroke={colors.accent} strokeOpacity="0.7" strokeWidth="2" />
      <Path d="M39 190 C58 184 73 196 93 190 C113 184 128 196 149 190 C170 184 187 196 207 190 C227 184 243 196 261 190" fill="none" stroke={colors.tint} strokeWidth="2" strokeLinecap="round" />
      <Path d="M55 199 C74 194 88 204 108 199 M192 199 C211 194 225 204 245 199" fill="none" stroke={colors.border} strokeWidth="1.5" strokeLinecap="round" />
    </> : null}
    {kind === 'portfolio' ? <>
      <Rect x="42" y="29" width="216" height="163" rx="18" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Circle cx="61" cy="49" r="4" fill={colors.primary} />
      <Rect x="73" y="46" width="69" height="6" rx="3" fill={colors.tint} fillOpacity="0.55" />
      <Rect x="203" y="39" width="40" height="23" rx="6" fill={colors.lightGreen} stroke={colors.border} strokeWidth="1" />
      <Path d="M210 46 H235 M210 52 H223" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
      <Rect x="57" y="72" width="186" height="42" rx="10" fill={colors.secondary} />
      <Rect x="68" y="84" width="22" height="17" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.3" />
      <Path d="M73 86 V99 M78 85 V100 M83 85 V100" stroke={colors.tint} strokeWidth="1" />
      <Rect x="99" y="82" width="75" height="6" rx="3" fill={colors.primary} fillOpacity="0.6" />
      <Rect x="99" y="94" width="51" height="5" rx="2.5" fill={colors.border} />
      <Circle cx="225" cy="93" r="7" fill={colors.lightGreen} />
      <Path d="M221 93 L224 96 L229 90" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="57" y="124" width="84" height="53" rx="9" fill={colors.lightGreen} />
      <Circle cx="75" cy="150" r="11" fill={colors.card} />
      <Path d="M69 150 H80 M77 146 L81 150 L77 154" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="92" y="137" width="37" height="5" rx="2.5" fill={colors.tint} fillOpacity="0.6" />
      <Rect x="92" y="147" width="29" height="5" rx="2.5" fill={colors.border} />
      <Rect x="153" y="124" width="90" height="53" rx="9" fill={colors.secondary} />
      <Path d="M165 164 L179 155 L190 160 L205 143 L218 148 L232 135" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="232" cy="135" r="3" fill={colors.accent} />
      <Path d="M164 167 H233" stroke={colors.border} strokeWidth="1" />
    </> : null}
  </Svg>;
}

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const slide = slides[step];

  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [step, opacity, translateX]);

  async function finish(destination: '/(auth)/register' | '/(auth)/login') {
    setError('');
    try {
      await completeOnboarding();
      router.replace(destination);
    } catch {
      setError('Onboarding could not be saved on this device. Please try again.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: Platform.OS === 'ios' ? 0 : 10 }}>
        <Image source={require('../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 45, height: 36 }} />
        <View><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>OG Exports</Text><Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 1 }}>Global Trade. Digital Investment.</Text></View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View style={{ opacity, transform: [{ translateX }] }}>
          <Card style={{ height: 218, padding: 0, overflow: 'hidden', backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 23 }}>
            <OnboardingIllustration kind={slide.illustration} />
          </Card>
          <Text style={{ color: colors.primary, fontSize: 29, lineHeight: 36, fontWeight: '700', marginTop: 4, textAlign: 'center', letterSpacing: -0.4 }}>{slide.title}</Text>
          <Text style={{ color: colors.foreground, opacity: 0.78, fontSize: 15, lineHeight: 23, marginTop: 10, textAlign: 'center' }}>{slide.body}</Text>
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {slides.map((item, index) => <View key={item.title} style={{ width: index === step ? 22 : 7, height: 7, borderRadius: 5, backgroundColor: index === step ? colors.primary : colors.border }} />)}
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{step + 1} of {slides.length}</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 10 }}>{error}</Text> : null}
      <Action
        title={step === slides.length - 1 ? 'Get Started' : 'Continue'}
        icon={step === slides.length - 1 ? 'arrow-right' : undefined}
        onPress={() => step === slides.length - 1 ? void finish('/(auth)/register') : setStep(value => value + 1)}
      />
      <Pressable onPress={() => void finish('/(auth)/login')} style={{ alignSelf: 'center', paddingVertical: 18, paddingHorizontal: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Already have an account? Sign In</Text>
      </Pressable>
    </SafeAreaView>
  );
}