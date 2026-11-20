import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, useMotion } from '@/lib/motion';
import * as SplashScreen from 'expo-splash-screen';

const INTRO_MIN_DURATION = 5000;
const MARK_ASPECT = 490 / 560;

export default function Entry() {
  const { ready, token, onboardingComplete, appUnlocked } = useAuth();
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const footerBottom = Math.max(28, Math.min(64, height * 0.07)) + insets.bottom;
  const { reduceMotion, motionSettingsReady } = useMotion();
  const useNativeDriver = Platform.OS !== 'web';
  const textBlockWidth = Math.min(Math.max(width - 48, 0), 400);
  const wordmarkFontSize = Math.min(26, Math.max(17, Math.round(textBlockWidth / 14)));
  const wordmarkLetterSpacing = Math.min(7, Math.max(2, textBlockWidth / 58));
  const taglineLetterSpacing = Math.min(4, Math.max(1.5, textBlockWidth / 100));
  const markReveal = useRef(new Animated.Value(0)).current;
  const textReveal = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const introStartedAt = useRef(Date.now());
  const [introDurationElapsed, setIntroDurationElapsed] = useState(false);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!motionSettingsReady || reduceMotion) return;
    markReveal.setValue(0);
    textReveal.setValue(0);
    progress.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(markReveal, { toValue: 1, duration: MOTION.modal * 3, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.sequence([
        Animated.delay(MOTION.modal * 2),
        Animated.timing(textReveal, { toValue: 1, duration: MOTION.modal * 2, easing: Easing.out(Easing.cubic), useNativeDriver }),
      ]),
      Animated.timing(progress, { toValue: 1, duration: INTRO_MIN_DURATION, easing: Easing.inOut(Easing.quad), useNativeDriver }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [markReveal, motionSettingsReady, progress, reduceMotion, textReveal, useNativeDriver]);

  useEffect(() => {
    if (!motionSettingsReady) return;
    // Reduced motion disables animation, not the required five-second splash.
    const remainingDuration = Math.max(0, INTRO_MIN_DURATION - (Date.now() - introStartedAt.current));
    if (remainingDuration === 0) {
      setIntroDurationElapsed(true);
      return;
    }
    setIntroDurationElapsed(false);
    const timer = setTimeout(() => setIntroDurationElapsed(true), remainingDuration);
    return () => clearTimeout(timer);
  }, [introStartedAt, motionSettingsReady]);

  useEffect(() => {
    if (!ready || !motionSettingsReady) return;
    if (!introDurationElapsed) return;
    const destination = token
      ? appUnlocked ? '/(tabs)' : '/lock'
      : onboardingComplete ? '/(auth)/login' : '/onboarding';
    router.replace(destination);
  }, [ready, motionSettingsReady, introDurationElapsed, token, onboardingComplete, appUnlocked]);

  const animate = motionSettingsReady && !reduceMotion;
  const staticShown = !motionSettingsReady || reduceMotion;
  const markWidth = Math.min(width * 0.86, 400, height * 0.4 / MARK_ASPECT);
  const barWidth = Math.min(width * 0.38, 150);
  const markOpacity = animate ? markReveal : staticShown ? 1 : 0;
  const markScale = markReveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const textOpacity = animate ? textReveal : staticShown ? 1 : 0;
  const textLift = textReveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const barScale = animate ? progress : staticShown ? 1 : 0;

  return (
    <View
      style={[styles.root, { backgroundColor: colors.splashEnd }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel="OG Exports. Import, Export. Welcome to OG Exports"
    >
      <LinearGradient
        colors={[colors.splashStart, colors.splashMid, colors.splashEnd]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.center}>
        <Animated.View style={{ opacity: markOpacity, transform: [{ scale: animate ? markScale : 1 }] }}>
          <Image
            accessible={false}
            source={require('../assets/images/og-splash-mark.png')}
            resizeMode="contain"
            style={{ width: markWidth, height: markWidth * MARK_ASPECT }}
          />
        </Animated.View>
        <Animated.View style={[styles.textBlock, { width: textBlockWidth, opacity: textOpacity, transform: [{ translateY: animate ? textLift : 0 }] }]}>
          <Animated.Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.wordmark, { color: colors.splashText, fontSize: wordmarkFontSize, letterSpacing: wordmarkLetterSpacing }]}
          >
            OG EXPORTS
          </Animated.Text>
          <View style={[styles.rule, { backgroundColor: colors.accent }]} />
          <Animated.Text
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.tagline, { color: colors.splashMuted, letterSpacing: taglineLetterSpacing }]}
          >
            IMPORT · EXPORT
          </Animated.Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.footer, { bottom: footerBottom, opacity: textOpacity }]}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading OG Exports"
          style={[styles.track, { width: barWidth, backgroundColor: colors.splashTrack }]}
        >
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: colors.accent, transform: [{ translateX: -barWidth / 2 }, { scaleX: barScale }, { translateX: barWidth / 2 }] }]} />
        </View>
        <Animated.Text
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
          style={[styles.welcome, { color: colors.splashMuted }]}
        >
          Welcome to OG Exports
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  center: { alignItems: 'center', width: '100%', marginTop: -24 },
  textBlock: { alignItems: 'center', marginTop: 4 },
  wordmark: { width: '100%', flexShrink: 1, fontFamily: 'Inter_500Medium', fontSize: 26, letterSpacing: 7, textAlign: 'center' },
  rule: { width: 150, height: StyleSheet.hairlineWidth * 2, marginTop: 22, opacity: 0.7 },
  tagline: { width: '100%', fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 4, marginTop: 20, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  track: { height: 2, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2 },
  welcome: { fontFamily: 'Inter_400Regular', fontSize: 14, letterSpacing: 0.6, marginTop: 18 },
});
