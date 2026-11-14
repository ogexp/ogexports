import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useColors } from '@/hooks/useColors';

/** One consistent, compact brand lockup for sign-in and registration. */
export function AuthBrandHeader() {
  const colors = useColors();
  return (
    <View testID="auth-brand-header" pointerEvents="box-none" style={styles.container}>
      <BrandMark width={120} />
      <Text accessibilityRole="header" style={[styles.name, { color: colors.primary }]}>OG Exports</Text>
      <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Global Trade. Digital Investment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: '100%', paddingHorizontal: 8 },
  name: { marginTop: 8, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' },
  tagline: { marginTop: 4, fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2, textAlign: 'center' },
});
