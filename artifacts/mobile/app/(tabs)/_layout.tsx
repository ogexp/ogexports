import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

function NativeLayout() {
  const colors = useColors();
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.mutedForeground, selected: colors.primary }}
      labelStyle={{ default: { color: colors.mutedForeground }, selected: { color: colors.primary, fontWeight: '700' } }}
      backgroundColor={colors.card}
    >
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="opportunities"><NativeTabs.Trigger.Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }} /><NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="portfolio"><NativeTabs.Trigger.Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} /><NativeTabs.Trigger.Label>Portfolio</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet"><NativeTabs.Trigger.Icon sf={{ default: 'wallet.pass', selected: 'wallet.pass.fill' }} /><NativeTabs.Trigger.Label>Wallet</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: {
        position: 'absolute', left: 14, right: 14, bottom: isWeb ? 0 : Math.max(insets.bottom, 10),
        height: isWeb ? 84 : 70, paddingTop: 4, paddingBottom: isWeb ? 34 : 0,
        backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0,
      },
      tabBarItemStyle: { paddingTop: isWeb ? 2 : 0 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 1 },
      tabBarBackground: () => (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Platform.OS === 'ios' ? <BlurView intensity={85} tint="light" style={[StyleSheet.absoluteFill, { bottom: isWeb ? 34 : 0 }]} /> : null}
          <View style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: isWeb ? 34 : 0,
            backgroundColor: isWeb ? colors.card : 'rgba(255,255,255,0.94)',
            borderWidth: 1, borderColor: colors.border, borderRadius: 30,
            ...(isWeb ? { boxShadow: `0 -6px 20px ${colors.shadow}` } : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 }),
          }} />
        </View>
      ),
    }}>
      {([
        ['index', 'Home', 'home', 'house'],
        ['opportunities', 'Explore', 'trending-up', 'chart.line.uptrend.xyaxis'],
        ['portfolio', 'Portfolio', 'pie-chart', 'chart.pie'],
        ['wallet', 'Wallet', 'credit-card', 'wallet.pass'],
      ] as const).map(([name, title, feather, symbol]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color }) => Platform.OS === 'ios' ? <SymbolView name={symbol} tintColor={color} size={21} /> : <Feather name={feather} size={20} color={color} /> }} />
      ))}
      <Tabs.Screen name="trade" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeLayout /> : <ClassicLayout />;
}