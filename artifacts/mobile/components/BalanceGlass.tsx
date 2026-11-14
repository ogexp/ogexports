import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

/** Hard cap for the combined decorative highlight contribution on balance cards. */
export const BALANCE_GLASS_MAX_OPACITY = 0.1;

// Distributed alpha budget; sheen + edge never overlap at peak, sum stays <= cap.
const SHEEN_OPACITY = 0.06;
const EDGE_OPACITY = 0.04;

/**
 * Static, low-cost glass sheen for the green balance cards. No blur, no
 * animation, no measurement. Decorative only: not touchable, not announced.
 */
export function BalanceGlass() {
  const colors = useColors();
  const tint = colors.balanceCardText;
  return <View testID="balance-glass-overlay" pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <LinearGradient
      pointerEvents="none"
      colors={[tint, 'transparent']}
      locations={[0, 0.55]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 0.6 }}
      style={[StyleSheet.absoluteFill, { opacity: SHEEN_OPACITY }]}
    />
    <LinearGradient
      pointerEvents="none"
      colors={['transparent', tint, 'transparent']}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ position: 'absolute', top: 0, left: 16, right: 16, height: StyleSheet.hairlineWidth * 2, opacity: EDGE_OPACITY }}
    />
  </View>;
}

export default BalanceGlass;
