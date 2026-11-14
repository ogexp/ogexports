import React from 'react';
import { Animated, AppState, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { useFocusEffect } from 'expo-router';
import { useMotion, useOptionalMotion } from '@/lib/motion';
import { ambientFieldGeometry, canAnimateAmbient } from '@/lib/ambient-motion-policy';

const nativeDriver = Platform.OS !== 'web';
const GlassReflectionsContext = React.createContext(true);

/** Keep the Home feed's glass appearance without animating every card at once. */
export function GlassEffectsProvider({ children, reflections = true }: { children: React.ReactNode; reflections?: boolean }) {
  return <GlassReflectionsContext.Provider value={reflections}>{children}</GlassReflectionsContext.Provider>;
}

/** Live app state (null until known) and browser document visibility. */
function useAmbientLifecycle() {
  const [appState, setAppState] = React.useState<string | null>(() => AppState.currentState ?? null);
  const [docVisible, setDocVisible] = React.useState(() =>
    Platform.OS !== 'web' || typeof document === 'undefined' || document.visibilityState !== 'hidden');
  React.useEffect(() => {
    setAppState(AppState.currentState ?? null);
    const sub = AppState.addEventListener('change', state => setAppState(state));
    let detach: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVis = () => setDocVisible(document.visibilityState !== 'hidden');
      onVis();
      document.addEventListener('visibilitychange', onVis);
      detach = () => document.removeEventListener('visibilitychange', onVis);
    }
    return () => { sub.remove(); detach?.(); };
  }, []);
  return { appState, docVisible };
}

/**
 * Decorative glass layers for cards. Gradient tints + refined edge highlights
 * (no per-card blur, no continuous loop). A single bounded reflection sweep
 * plays once on mount when motion is allowed. Never interactive or announced.
 */
export function GlassLayers({ tone = 'teal' }: { tone?: 'teal' | 'gold' }) {
  const colors = useColors();
  // ErrorFallback also uses these layers after MotionProvider has unmounted.
  const motion = useOptionalMotion();
  const reflections = React.useContext(GlassReflectionsContext);
  const allowSweep = Boolean(reflections && motion?.motionSettingsReady && !motion.reduceMotion);
  const sweep = React.useRef(new Animated.Value(0)).current;
  const played = React.useRef(false);
  React.useEffect(() => {
    if (!allowSweep) { sweep.stopAnimation(); sweep.setValue(0); return; }
    if (played.current) return;
    played.current = true;
    const anim = Animated.timing(sweep, { toValue: 1, duration: 1100, delay: 160, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    anim.start(() => sweep.setValue(0));
    return () => { anim.stop(); sweep.setValue(0); };
  }, [allowSweep, sweep]);
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <LinearGradient
      colors={tone === 'gold'
        ? [colors.glassTintGold, colors.glassFill, colors.glassTintTeal]
        : [colors.glassTintTeal, colors.glassFill, colors.glassTintGold]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={[colors.glassHighlight, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.35 }}
      style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
    />
    {/* Static specular corner: soft diagonal reflection, top-left only. */}
    <LinearGradient
      colors={[colors.glassHighlight, 'transparent']}
      locations={[0, 0.6]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.45, y: 0.3 }}
      style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}
    />
    {allowSweep ? <Animated.View style={[styles.sweep, {
      opacity: sweep.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.32, 0.32, 0] }),
      transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-160, 520] }) }, { rotate: '18deg' }],
    }]}>
      <LinearGradient colors={['transparent', colors.glassHighlight, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View> : null}
    {/* Hairline top edge fades out at the corners like real glass. */}
    <LinearGradient
      colors={['transparent', colors.glassHighlight, colors.glassHighlight, 'transparent']}
      locations={[0, 0.18, 0.82, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 1 }}
    />
    <LinearGradient
      colors={[colors.glassHighlight, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ position: 'absolute', top: 10, bottom: 18, left: 0, width: 1, opacity: 0.6 }}
    />
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: colors.glassEdge }} />
  </View>;
}

/** Feather to transparent on every edge; no moving rectangular gradient seams. */
function SoftColourField({ colour }: { colour: string }) {
  const gradientId = `og-ambient-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
    <Defs>
      <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor={colour} />
        <Stop offset="55%" stopColor={colour} stopOpacity={0.4} />
        <Stop offset="100%" stopColor={colour} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Rect width={100} height={100} fill={`url(#${gradientId})`} />
  </Svg>;
}

/**
 * Branded canvas: warm base with teal, gold and mist washes. When motion is
 * allowed, two oversized wash fields drift slowly (native transforms only) and
 * pause whenever the app/document is hidden or `active` is false.
 */
export function BrandBackdrop({ active = false }: { active?: boolean }) {
  const colors = useColors();
  const { height: viewportHeight } = useWindowDimensions();
  const field = ambientFieldGeometry(viewportHeight);
  const { reduceMotion, motionSettingsReady } = useMotion();
  const { appState, docVisible } = useAmbientLifecycle();
  const animate = motionSettingsReady && !reduceMotion;
  const running = canAnimateAmbient({ reduceMotion, motionSettingsReady, appState, isFocused: active, isDocumentVisible: docVisible });
  const driftA = React.useRef(new Animated.Value(0)).current;
  const driftB = React.useRef(new Animated.Value(0)).current;
  const fieldsIn = React.useRef(new Animated.Value(0)).current;
  const fieldsIntroduced = React.useRef(false);

  // Gentle one-time fade of the moving fields once motion is known to be allowed.
  React.useEffect(() => {
    if (!animate) {
      fieldsIn.stopAnimation();
      fieldsIn.setValue(0);
      fieldsIntroduced.current = false;
      return;
    }
    if (!running) { fieldsIn.stopAnimation(); return; }
    if (fieldsIntroduced.current) return;
    const fade = Animated.timing(fieldsIn, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    fade.start(({ finished }) => { if (finished) fieldsIntroduced.current = true; });
    return () => fade.stop();
  }, [animate, running, fieldsIn]);

  React.useEffect(() => {
    if (!animate) { driftA.stopAnimation(); driftB.stopAnimation(); driftA.setValue(0); driftB.setValue(0); return; }
    if (!running) { driftA.stopAnimation(); driftB.stopAnimation(); return; } // freeze in place while hidden/unfocused
    const leg = (value: Animated.Value, to: number, duration: number) =>
      Animated.timing(value, { toValue: to, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false });
    const loopA = Animated.loop(Animated.sequence([leg(driftA, 1, 14000), leg(driftA, 0, 14000)]), { iterations: -1, resetBeforeIteration: false });
    const loopB = Animated.loop(Animated.sequence([leg(driftB, 1, 19000), leg(driftB, 0, 19000)]), { iterations: -1, resetBeforeIteration: false });
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, [animate, running, driftA, driftB]);

  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    <LinearGradient
      colors={[colors.canvasWashTeal, colors.background, colors.canvasWashGold]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    {animate ? <Animated.View style={[StyleSheet.absoluteFill, { opacity: fieldsIn }]}>
      <Animated.View style={[styles.fieldA, { top: field.offset, height: field.height,
        transform: [
          { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [-40, 70] }) },
          { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [-20, 90] }) },
          { scale: driftA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }]}>
        <SoftColourField colour={colors.canvasWashTeal} />
      </Animated.View>
      <Animated.View style={[styles.fieldB, { bottom: field.offset, height: field.height,
        transform: [
          { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [50, -60] }) },
          { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [30, -80] }) },
          { scale: driftB.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.96] }) },
        ],
      }]}>
        <SoftColourField colour={colors.canvasWashGold} />
      </Animated.View>
    </Animated.View> : null}
    <LinearGradient
      colors={['transparent', colors.canvasWashMist, 'transparent']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  </View>;
}

const styles = StyleSheet.create({
  sweep: { position: 'absolute', top: -40, bottom: -40, left: 0, width: 70 },
  fieldA: { position: 'absolute', left: '-30%', width: '95%', opacity: 0.75 },
  fieldB: { position: 'absolute', right: '-30%', width: '95%', opacity: 0.7 },
});

/** Route-screen backdrop: animates only while this route is focused. Use only inside a navigator. */
export function RouteBrandBackdrop() {
  const [focused, setFocused] = React.useState(false);
  useFocusEffect(React.useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  return <BrandBackdrop active={focused} />;
}
