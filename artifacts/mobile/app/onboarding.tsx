import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Card } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const slides = [
  {
    icon: 'globe' as const,
    title: 'Invest in global agriculture',
    body: 'Follow live opportunities, commodities, locations and project status from OG Exports.',
  },
  {
    icon: 'briefcase' as const,
    title: 'Choose with clarity',
    body: 'Review each opportunity’s available terms and confirm your investment before submitting.',
  },
  {
    icon: 'bar-chart-2' as const,
    title: 'Track your account',
    body: 'See your wallet activity, investments and account updates using values from your investor account.',
  },
];

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const slide = slides[step];

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [step, opacity, translateY]);

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
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>OG Exports</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <Card style={{ minHeight: 210, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.secondary, borderColor: colors.secondary }}>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={slide.icon} size={32} color={colors.primary} />
            </View>
            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginTop: 18, letterSpacing: 1 }}>OG EXPORTS INVESTOR</Text>
          </Card>
          <Text style={{ color: colors.foreground, fontSize: 29, lineHeight: 36, fontWeight: '700', marginTop: 24 }}>{slide.title}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 15, lineHeight: 23, marginTop: 10 }}>{slide.body}</Text>
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