import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

/**
 * Decorative glass layers for cards. Gradient tints + edge highlight only
 * (no per-card blur) so scrolling lists stay performant on Android.
 * Never interactive, never announced by screen readers.
 */
export function GlassLayers({ tone = 'teal' }: { tone?: 'teal' | 'gold' }) {
  const colors = useColors();
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
    <View style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: colors.glassHighlight }} />
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: colors.glassEdge }} />
  </View>;
}

/** Branded canvas: warm base with soft teal and restrained gold washes behind glass. */
export function BrandBackdrop() {
  const colors = useColors();
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <LinearGradient
      colors={[colors.canvasWashTeal, colors.background, colors.canvasWashGold]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={['transparent', colors.canvasWashMist, 'transparent']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  </View>;
}
