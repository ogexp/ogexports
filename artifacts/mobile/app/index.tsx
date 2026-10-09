import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, useMotion } from '@/lib/motion';

const INTRO_MIN_DURATION = 6000;
const ORBIT_SPIN_DURATION = 2400;
const OUTER_ORBIT_SPIN_DURATION = 3600;

export default function Entry() {
  const { ready, token, onboardingComplete, appUnlocked } = useAuth();
  const colors = useColors();
  const { reduceMotion, motionSettingsReady } = useMotion();
  const useNativeDriver = Platform.OS !== 'web';
  const logoReveal = useRef(new Animated.Value(0)).current;
  const orbitReveal = useRef(new Animated.Value(0)).current;
  const orbitSpin = useRef(new Animated.Value(0)).current;
  const outerOrbitReveal = useRef(new Animated.Value(0)).current;
  const outerOrbitSpin = useRef(new Animated.Value(0)).current;
  const haloReveal = useRef(new Animated.Value(0)).current;
  const wordmarkReveal = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const introStartedAt = useRef(Date.now());
  const [introDurationElapsed, setIntroDurationElapsed] = useState(false);

  useEffect(() => {
    if (!motionSettingsReady || reduceMotion) return;

    logoReveal.setValue(0);
    orbitReveal.setValue(0);
    orbitSpin.setValue(0);
    outerOrbitReveal.setValue(0);
    outerOrbitSpin.setValue(0);
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
          duration: MOTION.modal * 4 + MOTION.micro * 2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(MOTION.micro),
        Animated.timing(outerOrbitReveal, {
          toValue: 1,
          duration: MOTION.modal * 4 + MOTION.micro * 2,
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
          duration: MOTION.modal * 3 + MOTION.micro * 2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(MOTION.modal + MOTION.micro),
        Animated.timing(wordmarkReveal, {
          toValue: 1,
          duration: MOTION.modal + MOTION.micro,
          easing: Easing.out(Easing.cubic),
          useNativeDriver,
        }),
      ]),
      Animated.sequence([
        Animated.delay(MOTION.modal * 2 + MOTION.micro),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: MOTION.component + MOTION.micro,
          easing: Easing.out(Easing.quad),
          useNativeDriver,
        }),
      ]),
    ]);
    const orbitLoop = Animated.loop(Animated.timing(orbitSpin, {
      toValue: 1,
      duration: ORBIT_SPIN_DURATION,
      easing: Easing.linear,
      useNativeDriver,
    }));
    const outerOrbitLoop = Animated.loop(Animated.timing(outerOrbitSpin, {
      toValue: 1,
      duration: OUTER_ORBIT_SPIN_DURATION,
      easing: Easing.linear,
      useNativeDriver,
    }));
    reveal.start();
    orbitLoop.start();
    outerOrbitLoop.start();
    return () => {
      reveal.stop();
      orbitLoop.stop();
      outerOrbitLoop.stop();
    };
  }, [haloReveal, logoReveal, motionSettingsReady, orbitReveal, orbitSpin, outerOrbitReveal, outerOrbitSpin, reduceMotion, subtitleOpacity, useNativeDriver, wordmarkReveal]);

  useEffect(() => {
    if (!motionSettingsReady) return;
    if (reduceMotion) {
      setIntroDurationElapsed(true);
      return;
    }
    const remainingDuration = Math.max(
      0,
      INTRO_MIN_DURATION - (Date.now() - introStartedAt.current),
    );
    if (remainingDuration === 0) {
      setIntroDurationElapsed(true);
      return;
    }
    setIntroDurationElapsed(false);
    const timer = setTimeout(() => setIntroDurationElapsed(true), remainingDuration);
    return () => clearTimeout(timer);
  }, [introStartedAt, motionSettingsReady, reduceMotion]);

  useEffect(() => {
    if (!ready || !motionSettingsReady) return;
    if (!reduceMotion && !introDurationElapsed) return;
    const destination = token
      ? appUnlocked ? '/(tabs)' : '/lock'
      : onboardingComplete ? '/(auth)/login' : '/onboarding';
    router.replace(destination);
  }, [ready, motionSettingsReady, introDurationElapsed, token, onboardingComplete, appUnlocked, reduceMotion]);

  const playIntroMotion = motionSettingsReady && !reduceMotion;
  const showStaticIntro = !motionSettingsReady || reduceMotion;
  const logoScale = logoReveal.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] });
  const logoLift = logoReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const logoTilt = logoReveal.interpolate({ inputRange: [0, 1], outputRange: ['-13deg', '0deg'] });
  const orbitOpacity = orbitReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.48] });
  const orbitScale = orbitReveal.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const orbitRotation = orbitSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const outerOrbitOpacity = outerOrbitReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });
  const outerOrbitScale = outerOrbitReveal.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const outerOrbitRotation = outerOrbitSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const haloOpacity = haloReveal.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.13, 0.035] });
  const haloScale = haloReveal.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.2] });
  const wordmarkOpacity = wordmarkReveal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const wordmarkLift = wordmarkReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const subtitleLift = subtitleOpacity.interpolate({ inputRange: [0, 1], outputRange: [5, 0] });

  return (
    <Animated.View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 220, height: 186, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Animated.View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              width: 154,
              height: 154,
              borderRadius: 77,
              backgroundColor: colors.lightGreen,
              opacity: playIntroMotion ? haloOpacity : showStaticIntro ? 0.035 : 0,
              transform: [{ scale: playIntroMotion ? haloScale : 1 }],
            }}
          />
          <Animated.View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              width: 208,
              height: 208,
              borderRadius: 104,
              borderWidth: 1,
              borderColor: colors.accent,
              opacity: playIntroMotion ? outerOrbitOpacity : showStaticIntro ? 0.28 : 0,
              transform: [
                { scale: playIntroMotion ? outerOrbitScale : 1 },
                { rotate: playIntroMotion ? outerOrbitRotation : '0deg' },
              ],
            }}
          >
            <View style={{ position: 'absolute', left: 101, top: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <View style={{ position: 'absolute', right: 12, bottom: 50, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.65 }} />
            <View style={{ position: 'absolute', left: 12, bottom: 50, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.65 }} />
          </Animated.View>
          <Animated.View
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              width: 176,
              height: 176,
              borderRadius: 88,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: playIntroMotion ? orbitOpacity : showStaticIntro ? 0.48 : 0,
              transform: [
                { scale: playIntroMotion ? orbitScale : 1 },
                { rotate: playIntroMotion ? orbitRotation : '0deg' },
              ],
            }}
          >
            <View style={{ position: 'absolute', top: -3, left: 85, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <View style={{ position: 'absolute', right: 8, bottom: 40, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.65 }} />
            <View style={{ position: 'absolute', left: 10, bottom: 40, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, opacity: 0.65 }} />
          </Animated.View>
          <Animated.Image
            accessible={false}
            source={require('../assets/images/og-logo.png')}
            resizeMode="contain"
            style={{
              width: 148,
              height: 112,
              opacity: playIntroMotion ? logoReveal : showStaticIntro ? 1 : 0,
              transform: [
                { perspective: 900 },
                { rotateY: playIntroMotion ? logoTilt : '0deg' },
                { translateY: playIntroMotion ? logoLift : 0 },
                { scale: playIntroMotion ? logoScale : 1 },
              ],
            }}
          />
        </View>
        <Animated.View style={{
          alignItems: 'center',
          opacity: playIntroMotion ? wordmarkOpacity : showStaticIntro ? 1 : 0,
          transform: [{ translateY: playIntroMotion ? wordmarkLift : 0 }],
        }}>
          <Text style={{ color: colors.primary, fontSize: 27, fontWeight: '700' }}>OG Exports</Text>
          <Animated.Text style={{
            color: colors.mutedForeground,
            fontSize: 14,
            marginTop: 8,
            letterSpacing: 0.3,
            opacity: playIntroMotion ? subtitleOpacity : showStaticIntro ? 1 : 0,
            transform: [{ translateY: playIntroMotion ? subtitleLift : 0 }],
          }}>Global Trade. Digital Investment.</Animated.Text>
          {!ready && motionSettingsReady ? <>
            <View accessibilityRole="progressbar" accessibilityLabel="Preparing your investor experience" style={{ width: 72, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.secondary, marginTop: 24 }}>
              <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 8 }}>Preparing your investor experience</Text>
          </> : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}