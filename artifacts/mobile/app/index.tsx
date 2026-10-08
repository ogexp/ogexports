import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, useMotion } from '@/lib/motion';

export default function Entry() {
  const { ready, token, onboardingComplete, appUnlocked } = useAuth();
  const colors = useColors();
  const { reduceMotion } = useMotion();
  const useNativeDriver = Platform.OS !== 'web';
  const logoReveal = useRef(new Animated.Value(0)).current;
  const orbitReveal = useRef(new Animated.Value(0)).current;
  const haloReveal = useRef(new Animated.Value(0)).current;
  const wordmarkReveal = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const progressOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    logoReveal.setValue(0);
    orbitReveal.setValue(0);
    haloReveal.setValue(0);
    wordmarkReveal.setValue(0);
    subtitleOpacity.setValue(0);

    const reveal = Animated.parallel([
      Animated.spring(logoReveal, {
        toValue: 1,
        ...MOTION.successSpring,
        useNativeDriver,
      }),
      Animated.sequence([
        Animated.delay(55),
        Animated.timing(orbitReveal, {
          toValue: 1,
          duration: MOTION.modal * 2 + MOTION.micro,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(35),
        Animated.timing(haloReveal, {
          toValue: 1,
          duration: MOTION.micro * 2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
        Animated.timing(haloReveal, {
          toValue: 0.12,
          duration: MOTION.modal + MOTION.component,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(MOTION.micro),
        Animated.timing(wordmarkReveal, {
          toValue: 1,
          duration: MOTION.component + MOTION.micro,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(MOTION.modal),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: MOTION.component,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
      ]),
    ]);
    reveal.start();
    return () => reveal.stop();
  }, [haloReveal, logoReveal, orbitReveal, reduceMotion, subtitleOpacity, useNativeDriver, wordmarkReveal]);

  useEffect(() => {
    if (ready || reduceMotion) {
      progressOffset.setValue(0);
      return;
    }
    const progress = Animated.loop(Animated.sequence([
      Animated.timing(progressOffset, { toValue: 22, duration: 560, easing: Easing.inOut(Easing.quad), useNativeDriver }),
      Animated.timing(progressOffset, { toValue: -22, duration: 560, easing: Easing.inOut(Easing.quad), useNativeDriver }),
    ]));
    progress.start();
    return () => progress.stop();
  }, [progressOffset, ready, reduceMotion, useNativeDriver]);

  useEffect(() => {
    if (!ready) return;
    const destination = token
      ? appUnlocked ? '/(tabs)' : '/lock'
      : onboardingComplete ? '/(auth)/login' : '/onboarding';
    if (reduceMotion) {
      router.replace(destination);
      return;
    }
    const fadeOut = Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 100,
      easing: Easing.in(Easing.quad),
      useNativeDriver,
    });
    fadeOut.start(({ finished }) => {
      if (finished) router.replace(destination);
    });
    return () => {
      fadeOut.stop();
    };
  }, [ready, token, onboardingComplete, appUnlocked, reduceMotion, screenOpacity, useNativeDriver]);

  const logoScale = logoReveal.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] });
  const logoLift = logoReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const logoTilt = logoReveal.interpolate({ inputRange: [0, 1], outputRange: ['-13deg', '0deg'] });
  const orbitOpacity = orbitReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.48] });
  const orbitScale = orbitReveal.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const orbitRotation = orbitReveal.interpolate({ inputRange: [0, 1], outputRange: ['-48deg', '18deg'] });
  const haloOpacity = haloReveal.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.13, 0.035] });
  const haloScale = haloReveal.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.2] });
  const wordmarkOpacity = wordmarkReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const wordmarkLift = wordmarkReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const subtitleLift = subtitleOpacity.interpolate({ inputRange: [0, 1], outputRange: [5, 0] });

  return (
    <Animated.View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28, opacity: screenOpacity }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 220, height: 144, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Animated.View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: colors.lightGreen,
              opacity: reduceMotion ? 0.035 : haloOpacity,
              transform: [{ scale: reduceMotion ? 1 : haloScale }],
            }}
          />
          <Animated.View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              width: 176,
              height: 176,
              borderRadius: 88,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: reduceMotion ? 0.48 : orbitOpacity,
              transform: [
                { scale: reduceMotion ? 1 : orbitScale },
                { rotate: reduceMotion ? '0deg' : orbitRotation },
              ],
            }}
          >
            <View style={{ position: 'absolute', top: -3, left: 85, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <View style={{ position: 'absolute', right: 24, bottom: 17, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.65 }} />
          </Animated.View>
          <Animated.Image
            accessible={false}
            source={require('../assets/images/og-logo.png')}
            resizeMode="contain"
            style={{
              width: 148,
              height: 112,
              opacity: reduceMotion ? 1 : logoReveal,
              transform: [
                { perspective: 900 },
                { rotateY: reduceMotion ? '0deg' : logoTilt },
                { translateY: reduceMotion ? 0 : logoLift },
                { scale: reduceMotion ? 1 : logoScale },
              ],
            }}
          />
        </View>
        <Animated.View style={{
          alignItems: 'center',
          opacity: reduceMotion ? 1 : wordmarkOpacity,
          transform: [{ translateY: reduceMotion ? 0 : wordmarkLift }],
        }}>
          <Text style={{ color: colors.primary, fontSize: 27, fontWeight: '700' }}>OG Exports</Text>
          <Animated.Text style={{
            color: colors.mutedForeground,
            fontSize: 14,
            marginTop: 8,
            letterSpacing: 0.3,
            opacity: reduceMotion ? 1 : subtitleOpacity,
            transform: [{ translateY: reduceMotion ? 0 : subtitleLift }],
          }}>Global Trade. Digital Investment.</Animated.Text>
          {!ready ? <>
            <View accessibilityRole="progressbar" accessibilityLabel="Preparing your investor experience" style={{ width: 72, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.secondary, marginTop: 24 }}>
              <Animated.View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: colors.primary, transform: [{ translateX: progressOffset }] }} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 8 }}>Preparing your investor experience</Text>
          </> : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}