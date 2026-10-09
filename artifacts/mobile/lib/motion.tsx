import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export const MOTION = {
  micro: 130,
  component: 210,
  modal: 300,
  page: 280,
  easeOut: (value: number) => 1 - Math.pow(1 - value, 3),
  pressScale: 0.985,
  revealY: 8,
  revealStagger: 24,
  staggerCap: 120,
  modalScale: 0.98,
  spring: { damping: 22, stiffness: 220 },
  successSpring: { damping: 16, stiffness: 190 },
  haptics: { micro: 'selection', action: 'light', success: 'success', error: 'error' },
} as const;

export function motionHaptic(kind: 'micro' | 'action' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
  const feedback = kind === 'micro'
    ? Haptics.selectionAsync()
    : kind === 'action'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  void feedback.catch(() => undefined);
}

type MotionContextValue = {
  reduceMotion: boolean;
  motionSettingsReady: boolean;
  setReduceMotionPreference: (value: boolean) => Promise<void>;
  reduceMotionPreference: boolean;
};

const MotionContext = createContext<MotionContextValue | null>(null);
const storageKey = 'og-investor-reduce-motion';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduceMotionPreference, setPreference] = useState(false);
  const [preferenceKnown, setPreferenceKnown] = useState(false);
  const [systemSetting, setSystemSetting] = useState(false);
  const [systemSettingKnown, setSystemSettingKnown] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then(value => {
      if (active) {
        setPreference(value === 'true');
        setPreferenceKnown(true);
      }
    }).catch(() => { if (active) setPreferenceKnown(true); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) {
        setSystemSetting(value);
        setSystemSettingKnown(true);
      }
    }).catch(() => { if (active) setSystemSettingKnown(true); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      setSystemSetting(value);
      setSystemSettingKnown(true);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo<MotionContextValue>(() => ({
    reduceMotion: Boolean(!systemSettingKnown || !preferenceKnown || systemSetting || reduceMotionPreference),
    motionSettingsReady: systemSettingKnown && preferenceKnown,
    reduceMotionPreference,
    setReduceMotionPreference: async (enabled: boolean) => {
      setPreference(enabled);
      try {
        await AsyncStorage.setItem(storageKey, String(enabled));
      } catch {
        // The preference still applies for this session if device storage is unavailable.
      }
    },
  }), [systemSetting, systemSettingKnown, preferenceKnown, reduceMotionPreference]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion() {
  const value = useContext(MotionContext);
  if (!value) throw new Error('useMotion must be used inside MotionProvider.');
  return value;
}

export function MotionReveal({ children, delay = 0, style, testID }: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  testID?: string;
}) {
  const { reduceMotion } = useMotion();
  const opacity = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.component,
      delay,
      easing: MOTION.easeOut,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, reduceMotion]);

  return <Animated.View testID={testID} style={[style, { opacity }]}>{children}</Animated.View>;
}

export function MotionProgress({ value, height = 6, color, trackColor, style, accessibilityLabel }: {
  value: number;
  height?: number;
  color: string;
  trackColor: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const { reduceMotion } = useMotion();
  const colors = useColors();
  const bounded = Math.max(0, Math.min(100, value));
  const progress = React.useRef(new Animated.Value(0)).current;
  const previous = React.useRef<number | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web' || reduceMotion) {
      progress.setValue(bounded / 100);
      previous.current = bounded;
      return;
    }
    const from = previous.current ?? 0;
    progress.setValue(from / 100);
    const animation = Animated.timing(progress, {
      toValue: bounded / 100,
      duration: MOTION.component,
      easing: MOTION.easeOut,
      useNativeDriver: true,
    });
    animation.start();
    previous.current = bounded;
    return () => animation.stop();
  }, [bounded, progress, reduceMotion]);
  return <View accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: bounded }}
    style={[{ height, borderRadius: height, backgroundColor: trackColor || colors.border, overflow: 'hidden' }, style]}>
    {Platform.OS === 'web' || reduceMotion
      ? <View style={{ width: `${bounded}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
      : <Animated.View style={{
          width: '100%',
          height: '100%',
          borderRadius: height,
          backgroundColor: color,
          transformOrigin: 'left center',
          transform: [{ scaleX: progress }],
        }} />}
  </View>;
}
