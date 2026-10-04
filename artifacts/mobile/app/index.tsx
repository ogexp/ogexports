import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Entry() {
  const { ready, token, onboardingComplete, appUnlocked } = useAuth();
  const colors = useColors();
  const useNativeDriver = Platform.OS !== 'web';
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandScale = useRef(new Animated.Value(0.975)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const reveal = Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.timing(brandScale, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]);
    const subtitleReveal = Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 320,
      delay: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver,
    });
    reveal.start();
    subtitleReveal.start();
    return () => {
      reveal.stop();
      subtitleReveal.stop();
    };
  }, [brandOpacity, brandScale, subtitleOpacity, useNativeDriver]);

  useEffect(() => {
    if (!ready) return;
    const destination = token
      ? appUnlocked ? '/(tabs)' : '/lock'
      : onboardingComplete ? '/(auth)/login' : '/onboarding';
    let cancelFade: (() => void) | undefined;
    const timer = setTimeout(() => {
      const fadeOut = Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      });
      cancelFade = () => fadeOut.stop();
      fadeOut.start(({ finished }) => {
        if (finished) router.replace(destination);
      });
    }, 850);
    return () => {
      clearTimeout(timer);
      cancelFade?.();
    };
  }, [ready, token, onboardingComplete, appUnlocked, screenOpacity, useNativeDriver]);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, opacity: screenOpacity }}>
      <Animated.View style={{ alignItems: 'center', opacity: brandOpacity, transform: [{ scale: brandScale }] }}>
        <Image source={require('../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 148, height: 112 }} />
        <Text style={{ color: colors.primary, fontSize: 27, fontWeight: '700', marginTop: 24 }}>OG Exports</Text>
        <Animated.Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 8, letterSpacing: 0.3, opacity: subtitleOpacity }}>Global Trade. Digital Investment.</Animated.Text>
      </Animated.View>
      <Animated.View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading OG Exports"
        style={{ alignItems: 'center', marginTop: 36, opacity: subtitleOpacity }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 9 }}>Preparing your investor experience</Text>
      </Animated.View>
    </Animated.View>
  );
}