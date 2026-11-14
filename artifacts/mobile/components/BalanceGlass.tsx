import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

/** Hard cap for the combined decorative contribution on balance cards. */
export const BALANCE_GLASS_MAX_OPACITY = 0.1;

// Distributed alpha budget: frost 0.07 + outline 0.03 = 0.10 even where stacked.
const FROST_OPACITY = 0.07;
const OUTLINE_OPACITY = 0.03;

type BalanceGlassProps = {
  /** Corner radius of the parent card. */
  radius?: number;
  /** Parent has square top corners and rounded bottom corners (Home hero). */
  bottomOnly?: boolean;
};

/**
 * Static frosted finish for the green balance cards: a uniform soft tint and a
 * very quiet outline that follows the card's real corners. No gradients, blur,
 * animation or measurement. Decorative only: not touchable, not announced.
 */
export function BalanceGlass({ radius = 22, bottomOnly = false }: BalanceGlassProps) {
  const colors = useColors();
  const tint = colors.balanceCardText;
  const corners = bottomOnly
    ? { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }
    : { borderRadius: radius };
  return <View testID="balance-glass-overlay" pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <View testID="balance-glass-frost" pointerEvents="none"
      style={[StyleSheet.absoluteFill, corners, { backgroundColor: tint, opacity: FROST_OPACITY }]} />
    <View testID="balance-glass-outline" pointerEvents="none"
      style={[StyleSheet.absoluteFill, corners, {
        borderWidth: StyleSheet.hairlineWidth,
        borderTopWidth: bottomOnly ? 0 : StyleSheet.hairlineWidth,
        borderColor: tint,
        opacity: OUTLINE_OPACITY,
      }]} />
  </View>;
}

export default BalanceGlass;
