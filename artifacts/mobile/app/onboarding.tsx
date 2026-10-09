import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Card } from '@/components/InvestorUI';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { MOTION, MotionProgress, motionHaptic, useMotion } from '@/lib/motion';

const slides = [
  {
    illustration: 'container' as const,
    title: 'Invest in Real-World Trade',
    body: 'Participate in selected import and export trade opportunities connected to real cargo.',
  },
  {
    illustration: 'shipment' as const,
    title: 'Track Every Trade',
    body: 'Follow each trade from cargo preparation through shipment and arrival at its destination.',
  },
  {
    illustration: 'portfolio' as const,
    title: 'Manage Your Portfolio',
    body: 'Review investments, wallet balance, returns and distributions, and trade performance in one place.',
  },
];

type IllustrationKind = (typeof slides)[number]['illustration'];
type IllustrationStage = 'A' | 'B' | 'C';
type IllustrationPoint = { x: number; y: number };

const travelRoutes: Record<IllustrationKind, { points: IllustrationPoint[]; radius: number }> = {
  container: {
    points: [
      { x: 35, y: 57 },
      { x: 82, y: 36 },
      { x: 142, y: 31 },
      { x: 202, y: 42 },
      { x: 253, y: 68 },
    ],
    radius: 5,
  },
  shipment: {
    points: [{ x: 49, y: 39 }, { x: 251, y: 39 }],
    radius: 5,
  },
  portfolio: {
    points: [
      { x: 165, y: 164 },
      { x: 179, y: 155 },
      { x: 190, y: 160 },
      { x: 205, y: 143 },
      { x: 218, y: 148 },
      { x: 232, y: 135 },
    ],
    radius: 3.5,
  },
};

function TravelingMarker({ kind, progress, width, height }: {
  kind: IllustrationKind;
  progress: Animated.Value;
  width: number;
  height: number;
}) {
  const colors = useColors();
  const route = travelRoutes[kind];
  const start = route.points[0];
  const scale = Math.min(width / 300, height / 220);
  const renderedWidth = 300 * scale;
  const renderedHeight = 220 * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  const inputRange = route.points.map((_, index) => index / (route.points.length - 1));
  const translateX = progress.interpolate({
    inputRange,
    outputRange: route.points.map(point => (point.x - start.x) * scale),
  });
  const translateY = progress.interpolate({
    inputRange,
    outputRange: route.points.map(point => (point.y - start.y) * scale),
  });
  const diameter = route.radius * 2 * scale;

  return (
    <Animated.View
      accessible={false}
      style={{
        position: 'absolute',
        left: offsetX + start.x * scale - diameter / 2,
        top: offsetY + start.y * scale - diameter / 2,
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: colors.accent,
        pointerEvents: 'none',
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

function MovingWater({ progress, reveal, width, height }: {
  progress: Animated.Value;
  reveal: Animated.Value;
  width: number;
  height: number;
}) {
  const colors = useColors();
  const scale = Math.min(width / 300, height / 220);
  const renderedWidth = 300 * scale;
  const renderedHeight = 220 * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -60 * scale] });

  return (
    <View
      style={{
        position: 'absolute',
        left: offsetX,
        top: offsetY,
        width: renderedWidth,
        height: renderedHeight,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <Animated.View
        style={{
          width: 360 * scale,
          height: renderedHeight,
          opacity: reveal,
          transform: [{ translateX }],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 360 220">
          <Path
            d="M-30 190 C-10 184 10 196 30 190 C50 184 70 196 90 190 C110 184 130 196 150 190 C170 184 190 196 210 190 C230 184 250 196 270 190 C290 184 310 196 330 190 C350 184 370 196 390 190"
            fill="none"
            stroke={colors.tint}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M-30 199 C-10 194 10 204 30 199 C50 194 70 204 90 199 C110 194 130 204 150 199 C170 194 190 204 210 199 C230 194 250 204 270 199 C290 194 310 204 330 199 C350 194 370 204 390 199"
            fill="none"
            stroke={colors.border}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function IllustrationLayer({ kind, stage, progress }: {
  kind: IllustrationKind;
  stage: IllustrationStage;
  progress: Animated.Value;
}) {
  const colors = useColors();
  const entranceX = progress.interpolate({ inputRange: [0, 1], outputRange: [stage === 'C' ? 4 : -4, 0] });
  const entranceY = progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const entranceScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: progress,
          pointerEvents: 'none',
          transform: [
            { translateX: entranceX },
            { translateY: entranceY },
            { scale: entranceScale },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 220">
        {kind === 'container' && stage === 'A' ? <>
        <Circle cx="148" cy="112" r="79" fill={colors.lightGreen} fillOpacity="0.58" />
        <Path d="M35 57 C86 17 197 23 253 68" fill="none" stroke={colors.tint} strokeWidth="1.5" strokeDasharray="4 6" />
        <Circle cx="253" cy="68" r="5" fill={colors.primary} />
        </> : null}
        {kind === 'container' && stage === 'B' ? <>
      <Path d="M48 82 L76 62 H216 L189 82 Z" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M189 82 L216 62 V137 L189 158 Z" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Rect x="48" y="82" width="141" height="76" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.8" />
      <Path d="M60 88 V151 M72 86 V153 M84 85 V155 M96 84 V156 M108 83 V157 M120 83 V158 M132 83 V158 M144 83 V158 M156 83 V158 M168 83 V158 M180 83 V158" stroke={colors.tint} strokeOpacity="0.58" strokeWidth="1.5" />
      <Path d="M119 83 V158 M113 112 H116 M123 112 H126" stroke={colors.primary} strokeWidth="1.5" />
      <Rect x="77" y="115" width="28" height="15" rx="3" fill={colors.secondary} />
      <Path d="M83 120 H99 M83 125 H95" stroke={colors.primary} strokeWidth="1.2" strokeLinecap="round" />
        </> : null}
        {kind === 'container' && stage === 'C' ? <>
      <Path d="M197 77 V150 M206 70 V145" stroke={colors.tint} strokeOpacity="0.65" strokeWidth="1.4" />
      <Path d="M211 158 C222 150 226 144 229 136" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="3 4" />
      <Circle cx="251" cy="116" r="25" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Ellipse cx="251" cy="116" rx="11" ry="25" fill="none" stroke={colors.tint} strokeWidth="1.2" />
      <Path d="M227 116 H275 M232 104 C243 109 259 109 270 104 M232 128 C243 123 259 123 270 128" fill="none" stroke={colors.tint} strokeWidth="1.2" />
      <Circle cx="262" cy="105" r="3.5" fill={colors.accent} />
        </> : null}
        {kind === 'shipment' && stage === 'A' ? <>
      <Circle cx="150" cy="115" r="83" fill={colors.lightGreen} fillOpacity="0.48" />
      <Path d="M49 39 H251" fill="none" stroke={colors.border} strokeWidth="2" />
      <Path d="M49 39 H150" fill="none" stroke={colors.primary} strokeWidth="2" />
      <Circle cx="150" cy="39" r="7" fill={colors.primary} />
      <Circle cx="251" cy="39" r="7" fill={colors.card} stroke={colors.primary} strokeWidth="1.5" />
        </> : null}
        {kind === 'shipment' && stage === 'B' ? <>
      <Rect x="83" y="55" width="37" height="33" rx="3" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="122" y="55" width="37" height="33" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="65" y="90" width="37" height="36" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="104" y="90" width="37" height="36" rx="3" fill={colors.lightGreen} stroke={colors.primary} strokeWidth="1.4" />
      <Rect x="143" y="90" width="37" height="36" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.4" />
      <Path d="M73 95 V121 M80 93 V123 M88 93 V123 M96 93 V123 M112 95 V121 M120 93 V123 M128 93 V123 M151 95 V121 M159 93 V123 M167 93 V123 M91 60 V83 M99 58 V85 M130 60 V83 M138 58 V85" stroke={colors.tint} strokeOpacity="0.72" strokeWidth="1" />
      <Path d="M181 91 L193 78 H225 L238 91 V127 H181 Z" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Rect x="190" y="97" width="9" height="10" rx="1" fill={colors.card} />
      <Rect x="204" y="97" width="9" height="10" rx="1" fill={colors.card} />
      <Rect x="218" y="97" width="9" height="10" rx="1" fill={colors.card} />
        </> : null}
        {kind === 'shipment' && stage === 'C' ? <>
      <Path d="M34 130 H265 L239 169 C235 176 230 179 219 179 H78 C64 179 58 174 52 163 Z" fill={colors.primary} stroke={colors.primary} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M52 151 H251" stroke={colors.accent} strokeOpacity="0.7" strokeWidth="2" />
        </> : null}
        {kind === 'portfolio' && stage === 'A' ? <>
      <Rect x="42" y="29" width="216" height="163" rx="18" fill={colors.card} stroke={colors.border} strokeWidth="1.5" />
      <Circle cx="61" cy="49" r="4" fill={colors.primary} />
      <Rect x="73" y="46" width="69" height="6" rx="3" fill={colors.tint} fillOpacity="0.55" />
      <Rect x="203" y="39" width="40" height="23" rx="6" fill={colors.lightGreen} stroke={colors.border} strokeWidth="1" />
      <Path d="M210 46 H235 M210 52 H223" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
        </> : null}
        {kind === 'portfolio' && stage === 'B' ? <>
      <Rect x="57" y="72" width="186" height="42" rx="10" fill={colors.secondary} />
      <Rect x="68" y="84" width="22" height="17" rx="3" fill={colors.card} stroke={colors.primary} strokeWidth="1.3" />
      <Path d="M73 86 V99 M78 85 V100 M83 85 V100" stroke={colors.tint} strokeWidth="1" />
      <Rect x="99" y="82" width="75" height="6" rx="3" fill={colors.primary} fillOpacity="0.6" />
      <Rect x="99" y="94" width="51" height="5" rx="2.5" fill={colors.border} />
      <Circle cx="225" cy="93" r="7" fill={colors.lightGreen} />
      <Path d="M221 93 L224 96 L229 90" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </> : null}
        {kind === 'portfolio' && stage === 'C' ? <>
      <Rect x="57" y="124" width="84" height="53" rx="9" fill={colors.lightGreen} />
      <Circle cx="75" cy="150" r="11" fill={colors.card} />
      <Path d="M69 150 H80 M77 146 L81 150 L77 154" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="92" y="137" width="37" height="5" rx="2.5" fill={colors.tint} fillOpacity="0.6" />
      <Rect x="92" y="147" width="29" height="5" rx="2.5" fill={colors.border} />
      <Rect x="153" y="124" width="90" height="53" rx="9" fill={colors.secondary} />
      <Path d="M165 164 L179 155 L190 160 L205 143 L218 148 L232 135" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M164 167 H233" stroke={colors.border} strokeWidth="1" />
        </> : null}
      </Svg>
    </Animated.View>
  );
}

function OnboardingIllustration({ kind, stageA, stageB, stageC, reduceMotion }: {
  kind: IllustrationKind;
  stageA: Animated.Value;
  stageB: Animated.Value;
  stageC: Animated.Value;
  reduceMotion: boolean;
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const travelProgress = useRef(new Animated.Value(0)).current;
  const accessibleLabel = kind === 'container'
    ? 'Shipping container connected to a global trade route'
    : kind === 'shipment'
      ? 'Cargo ship moving through cargo preparation, shipment and destination milestones'
      : 'Digital investor portfolio with trade investments, wallet and performance';

  useEffect(() => {
    travelProgress.setValue(0);
    if (reduceMotion || viewport.width <= 0 || viewport.height <= 0) return;

    const travelLoop = Animated.loop(Animated.timing(travelProgress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    }));
    travelLoop.start();
    return () => travelLoop.stop();
  }, [kind, reduceMotion, travelProgress, viewport.height, viewport.width]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibleLabel}
      style={{ flex: 1, width: '100%', height: '100%' }}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setViewport(current => current.width === width && current.height === height ? current : { width, height });
      }}
    >
      <IllustrationLayer kind={kind} stage="A" progress={stageA} />
      <IllustrationLayer kind={kind} stage="B" progress={stageB} />
      <IllustrationLayer kind={kind} stage="C" progress={stageC} />
      {kind === 'shipment' && viewport.width > 0 && viewport.height > 0 ? (
        <MovingWater progress={travelProgress} reveal={stageC} width={viewport.width} height={viewport.height} />
      ) : null}
      {viewport.width > 0 && viewport.height > 0 ? (
        <TravelingMarker kind={kind} progress={travelProgress} width={viewport.width} height={viewport.height} />
      ) : null}
    </View>
  );
}

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const colors = useColors();
  const { reduceMotion } = useMotion();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const illustrationScale = useRef(new Animated.Value(0.96)).current;
  const illustrationStages = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyOffset = useRef(new Animated.Value(10)).current;
  const swipeDirection = useRef(1);
  const slide = slides[step];

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateX.setValue(0);
      return;
    }
    opacity.setValue(0.82);
    translateX.setValue(MOTION.revealY * swipeDirection.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: MOTION.component, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateX, { toValue: 0, duration: MOTION.component, easing: MOTION.easeOut, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [step, opacity, reduceMotion, translateX]);

  useEffect(() => {
    if (reduceMotion) {
      illustrationOpacity.setValue(1);
      illustrationScale.setValue(1);
      illustrationStages.forEach(stage => stage.setValue(1));
      copyOpacity.setValue(1);
      copyOffset.setValue(0);
      return;
    }
    illustrationOpacity.setValue(0);
    illustrationScale.setValue(0.96);
    illustrationStages.forEach(stage => stage.setValue(0));
    copyOpacity.setValue(0);
    copyOffset.setValue(10);
    const useNativeDriver = Platform.OS !== 'web';
    const illustrationReveal = Animated.stagger(105, illustrationStages.map(stage => Animated.timing(stage, {
      toValue: 1,
      duration: 115,
      easing: MOTION.easeOut,
      useNativeDriver,
    })));
    const reveal = Animated.stagger(45, [
      Animated.parallel([
        Animated.timing(illustrationOpacity, {
          toValue: 1,
          duration: MOTION.component,
          easing: MOTION.easeOut,
          useNativeDriver,
        }),
        Animated.spring(illustrationScale, {
          toValue: 1,
          ...MOTION.successSpring,
          useNativeDriver,
        }),
      ]),
      Animated.parallel([
        Animated.timing(copyOpacity, {
          toValue: 1,
          duration: MOTION.component,
          easing: MOTION.easeOut,
          useNativeDriver,
        }),
        Animated.timing(copyOffset, {
          toValue: 0,
          duration: MOTION.component,
          easing: MOTION.easeOut,
          useNativeDriver,
        }),
      ]),
    ]);
    illustrationReveal.start();
    reveal.start();
    return () => {
      reveal.stop();
      illustrationReveal.stop();
    };
  }, [copyOffset, copyOpacity, illustrationOpacity, illustrationScale, illustrationStages, reduceMotion, step]);

  const swipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !reduceMotion && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      translateX.setValue(Math.max(-90, Math.min(90, gesture.dx * 0.42)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) < 54 || Math.abs(gesture.dx) < Math.abs(gesture.dy) * 1.25) {
        Animated.spring(translateX, { toValue: 0, ...MOTION.spring, useNativeDriver: Platform.OS !== 'web' }).start();
        return;
      }
      const next = gesture.dx < 0 ? Math.min(slides.length - 1, step + 1) : Math.max(0, step - 1);
      if (next === step) {
        Animated.spring(translateX, { toValue: 0, ...MOTION.spring, useNativeDriver: Platform.OS !== 'web' }).start();
        return;
      }
      motionHaptic('micro');
      swipeDirection.current = gesture.dx < 0 ? 1 : -1;
      setStep(next);
    },
    onPanResponderTerminate: () => {
      if (reduceMotion) translateX.setValue(0);
      else Animated.spring(translateX, { toValue: 0, ...MOTION.spring, useNativeDriver: Platform.OS !== 'web' }).start();
    },
  }), [reduceMotion, step, translateX]);

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: Platform.OS === 'ios' ? 0 : 10 }}>
        <Image source={require('../assets/images/og-logo.png')} resizeMode="contain" style={{ width: 45, height: 36 }} />
        <View><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>OG Exports</Text><Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 1 }}>Global Trade. Digital Investment.</Text></View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View {...swipeResponder.panHandlers} style={{ opacity, transform: [{ translateX }] }}>
          <Animated.View style={{ opacity: illustrationOpacity, transform: [{ scale: illustrationScale }] }}>
            <Card style={{ height: 218, padding: 0, overflow: 'hidden', backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 23 }}>
              <OnboardingIllustration kind={slide.illustration} stageA={illustrationStages[0]} stageB={illustrationStages[1]} stageC={illustrationStages[2]} reduceMotion={reduceMotion} />
            </Card>
          </Animated.View>
          <Animated.View style={{ opacity: copyOpacity, transform: [{ translateY: copyOffset }] }}>
            <Text style={{ color: colors.primary, fontSize: 29, lineHeight: 36, fontWeight: '700', marginTop: 4, textAlign: 'center', letterSpacing: -0.4 }}>{slide.title}</Text>
            <Text style={{ color: colors.foreground, opacity: 0.78, fontSize: 15, lineHeight: 23, marginTop: 10, textAlign: 'center' }}>{slide.body}</Text>
          </Animated.View>
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{step + 1} of {slides.length}</Text>
      </View>
      <MotionProgress value={((step + 1) / slides.length) * 100} height={4} color={colors.primary} trackColor={colors.secondary} style={{ marginBottom: 16 }} accessibilityLabel={`Onboarding step ${step + 1} of ${slides.length}`} />
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 10 }}>{error}</Text> : null}
      <Action
        title={step === slides.length - 1 ? 'Get Started' : 'Continue'}
        icon={step === slides.length - 1 ? 'arrow-right' : undefined}
        onPress={() => step === slides.length - 1 ? void finish('/(auth)/register') : setStep(value => value + 1)}
      />
      <Pressable onPress={() => void finish('/(auth)/login')} style={{ alignSelf: 'center', paddingVertical: 18, paddingHorizontal: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>Already have an account? Sign In</Text>
      </Pressable>
    </SafeAreaView>
  );
}