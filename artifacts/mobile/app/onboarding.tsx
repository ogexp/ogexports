import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Card } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const slides = [
  {
    illustration: 'trade' as const,
    title: 'Invest in Real Trade',
    body: 'Access investment opportunities connected to real-world commodities, global trade and business.',
  },
  {
    illustration: 'portfolio' as const,
    title: 'Grow With Opportunity',
    body: 'Discover carefully structured opportunities and monitor your investments from one secure platform.',
  },
  {
    illustration: 'trust' as const,
    title: 'Built Around Trust',
    body: 'Secure verification, transparent information and professional investment management — all in one place.',
  },
];

function OnboardingIllustration({ kind }: { kind: (typeof slides)[number]['illustration'] }) {
  const colors = useColors();
  return <Svg width="100%" height="100%" viewBox="0 0 300 220" accessibilityRole="image">
    {kind === 'trade' ? <>
      <Path d="M36 154 C74 146 92 74 135 60 C182 45 207 98 264 53" fill="none" stroke={colors.tint} strokeWidth="2" strokeDasharray="5 6" />
      <Circle cx="36" cy="154" r="7" fill={colors.accent} />
      <Circle cx="264" cy="53" r="7" fill={colors.primary} />
      <Circle cx="150" cy="108" r="55" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Ellipse cx="150" cy="108" rx="24" ry="55" fill="none" stroke={colors.primary} strokeOpacity="0.45" strokeWidth="1.5" />
      <Path d="M96 108 H204 M104 85 C130 96 170 96 196 85 M104 131 C130 120 170 120 196 131" fill="none" stroke={colors.primary} strokeOpacity="0.4" strokeWidth="1.5" />
      <Circle cx="184" cy="83" r="4" fill={colors.accent} />
    </> : null}
    {kind === 'portfolio' ? <>
      <Rect x="43" y="34" width="214" height="152" rx="20" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Rect x="62" y="54" width="58" height="7" rx="3.5" fill={colors.lightGreen} />
      <Circle cx="229" cy="57" r="4" fill={colors.accent} />
      <Path d="M62 72 H238" stroke={colors.border} strokeWidth="1" />
      <Circle cx="82" cy="98" r="17" fill={colors.lightGreen} />
      <Circle cx="82" cy="98" r="8" fill={colors.card} stroke={colors.primary} strokeWidth="1.5" />
      <Rect x="111" y="89" width="105" height="7" rx="3.5" fill={colors.primary} fillOpacity="0.35" />
      <Rect x="111" y="103" width="71" height="5" rx="2.5" fill={colors.border} />
      <Path d="M62 121 H238" stroke={colors.border} strokeWidth="1" />
      <Circle cx="82" cy="148" r="17" fill={colors.lightGreen} />
      <Circle cx="82" cy="148" r="5" fill={colors.tint} />
      <Rect x="111" y="139" width="91" height="7" rx="3.5" fill={colors.primary} fillOpacity="0.24" />
      <Rect x="111" y="153" width="57" height="5" rx="2.5" fill={colors.border} />
    </> : null}
    {kind === 'trust' ? <>
      <Circle cx="150" cy="108" r="78" fill={colors.lightGreen} />
      <Circle cx="150" cy="108" r="62" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Path d="M150 54 L193 70 V105 C193 132 175 151 150 165 C125 151 107 132 107 105 V70 Z" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="3" strokeLinejoin="round" />
      <Path d="M130 108 L144 122 L171 93" fill="none" stroke={colors.tint} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="219" cy="65" r="5" fill={colors.accent} />
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 }}>
        <Image source={require('../assets/images/icon.png')} style={{ width: 36, height: 36, borderRadius: 10 }} />
        <View><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>OG Exports</Text><Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 1 }}>Global Trade. Smart Investment.</Text></View>
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
        title={step === slides.length - 1 ? 'Get started' : 'Continue'}
        icon={step === slides.length - 1 ? 'arrow-right' : undefined}
        onPress={() => step === slides.length - 1 ? void finish('/(auth)/register') : setStep(value => value + 1)}
      />
      <Pressable onPress={() => void finish('/(auth)/login')} style={{ alignSelf: 'center', paddingVertical: 18, paddingHorizontal: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Already have an account? Sign in</Text>
      </Pressable>
    </SafeAreaView>
  );
}