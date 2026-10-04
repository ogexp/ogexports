import React, { useEffect, useRef } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Entry() {
  const { ready, token, onboardingComplete, appUnlocked } = useAuth();
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    if (!ready) return;
    const destination = token
      ? appUnlocked ? '/(tabs)' : '/lock'
      : onboardingComplete ? '/(auth)/login' : '/onboarding';
    const timer = setTimeout(() => router.replace(destination), 850);
    return () => clearTimeout(timer);
  }, [ready, token, onboardingComplete, appUnlocked]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <Image source={require('../assets/images/icon.png')} style={{ width: 112, height: 112, borderRadius: 28 }} />
        <Text style={{ color: colors.primary, fontSize: 27, fontWeight: '700', marginTop: 24 }}>OG Exports</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 8, letterSpacing: 0.5 }}>Global Trade. Smart Investment.</Text>
      </Animated.View>
    </View>
  );
}