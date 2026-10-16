import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(value)) return `rgba(253, 253, 251, ${alpha})`;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function GlassPopupSurface({
  children,
  style,
  testID,
  accessibilityViewIsModal,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityViewIsModal?: boolean;
}) {
  const colors = useColors();
  return <View
    testID={testID}
    accessibilityViewIsModal={accessibilityViewIsModal}
    style={[{ overflow: 'hidden', backgroundColor: 'transparent' }, style]}
  >
    <BlurView
      intensity={42}
      tint="default"
      blurMethod={Platform.OS === 'android' ? 'none' : undefined}
      style={StyleSheet.absoluteFill}
    />
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.card, 0.84) }]}
    />
    {children}
  </View>;
}
