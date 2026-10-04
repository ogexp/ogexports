import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useColors } from '@/hooks/useColors';

function NativeLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="opportunities"><NativeTabs.Trigger.Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }} /><NativeTabs.Trigger.Label>Invest</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="trade"><NativeTabs.Trigger.Icon sf={{ default: 'arrow.left.arrow.right', selected: 'arrow.left.arrow.right' }} /><NativeTabs.Trigger.Label>Trade</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet"><NativeTabs.Trigger.Icon sf={{ default: 'wallet.pass', selected: 'wallet.pass.fill' }} /><NativeTabs.Trigger.Label>Wallet</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="account"><NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} /><NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: { position: 'absolute', backgroundColor: isWeb ? colors.background : 'transparent', borderTopWidth: isWeb ? 1 : 0, borderTopColor: colors.border, elevation: 0, ...(isWeb ? { height: 84 } : {}) },
      tabBarBackground: () => Platform.OS === 'ios' ? <BlurView intensity={85} tint="light" style={StyleSheet.absoluteFill} /> : isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} /> : null,
    }}>
      {([
        ['index', 'Home', 'home', 'house'],
        ['opportunities', 'Invest', 'trending-up', 'chart.line.uptrend.xyaxis'],
        ['trade', 'Trade', 'repeat', 'arrow.left.arrow.right'],
        ['wallet', 'Wallet', 'credit-card', 'wallet.pass'],
        ['account', 'Profile', 'user', 'person.crop.circle'],
      ] as const).map(([name, title, feather, symbol]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color }) => Platform.OS === 'ios' ? <SymbolView name={symbol} tintColor={color} size={21} /> : <Feather name={feather} size={20} color={color} /> }} />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeLayout /> : <ClassicLayout />;
}