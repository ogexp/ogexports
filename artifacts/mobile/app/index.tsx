import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Entry() {
  const { ready, token, onboardingComplete, appUnlocked } = useAuth();
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.9)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 130, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(glowOpacity, { toValue: 1, duration: 780, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(glowScale, { toValue: 1, damping: 18, stiffness: 90, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    Animated.timing(taglineOpacity, { toValue: 1, duration: 320, delay: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [opacity, scale, glowOpacity, glowScale, taglineOpacity]);

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
      <Animated.View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: glowOpacity, transform: [{ scale: glowScale }], overflow: 'hidden' }}>
        <LinearGradient colors={[colors.glow, colors.lightGreen, colors.background]} locations={[0, 0.58, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <Image source={require('../assets/images/icon.png')} style={{ width: 112, height: 112, borderRadius: 28 }} />
        <Text style={{ color: colors.primary, fontSize: 27, fontWeight: '700', marginTop: 24 }}>OG Exports</Text>
        <Animated.Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 8, letterSpacing: 0.5, opacity: taglineOpacity }}>Global Trade. Smart Investment.</Animated.Text>
      </Animated.View>
    </View>
  );
}