import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAppPreferences } from '@/context/AppPreferencesContext';
import { translateUi } from '@/lib/strings';

function NativeLayout() {
  const colors = useColors();
  const { preferences, resolvedAppearance } = useAppPreferences();
  const t = (value: string) => translateUi(value, preferences.language);
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.mutedForeground, selected: colors.primary }}
      labelStyle={{ default: { color: colors.mutedForeground }, selected: { color: colors.primary, fontWeight: '600' } }}
      backgroundColor={colors.card}
    >
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf={{ default: 'house.circle', selected: 'house.circle.fill' }} /><NativeTabs.Trigger.Label>{t('Dashboard')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="opportunities"><NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} /><NativeTabs.Trigger.Label>{t('Opportunities')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="portfolio"><NativeTabs.Trigger.Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} /><NativeTabs.Trigger.Label>{t('Portfolio')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet"><NativeTabs.Trigger.Icon sf={{ default: 'wallet.bifold', selected: 'wallet.bifold.fill' }} /><NativeTabs.Trigger.Label>{t('Wallet')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile"><NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} /><NativeTabs.Trigger.Label>{t('Profile')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicLayout() {
  const colors = useColors();
  const { preferences, resolvedAppearance } = useAppPreferences();
  const t = (value: string) => translateUi(value, preferences.language);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: {
        position: 'absolute', left: 14, right: 14,
        bottom: isWeb || isAndroid ? 0 : Math.max(insets.bottom, 10),
        height: isWeb ? 84 : isAndroid ? 70 : 70,
        paddingTop: isWeb ? 2 : isAndroid ? 0 : 4,
        paddingBottom: isWeb ? 34 : 0,
        borderRadius: isAndroid ? 35 : 0,
        backgroundColor: isAndroid ? colors.card : 'transparent',
        borderWidth: isAndroid ? StyleSheet.hairlineWidth : 0,
        borderColor: colors.border,
        elevation: isAndroid ? 6 : 0,
      },
      tabBarItemStyle: { paddingTop: isWeb ? 2 : 0 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 1 },
      tabBarBackground: () => isAndroid
        ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.card, borderRadius: 35, overflow: 'hidden' }]} />
        : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Platform.OS === 'ios' ? <BlurView intensity={85} tint={resolvedAppearance} style={[StyleSheet.absoluteFill, { bottom: isWeb ? 34 : 0 }]} /> : null}
            <View style={{
              position: 'absolute', left: 0, right: 0, top: 0, bottom: isWeb ? 34 : 0,
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border, borderRadius: 30,
              ...(isWeb ? { boxShadow: `0 -6px 20px ${colors.shadow}` } : { shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 }),
            }} />
          </View>
        ),
    }}>
      {([
        ['index', t('Dashboard'), 'home-outline', 'home', 'house.circle', 'house.circle.fill'],
        ['opportunities', t('Opportunities'), 'compass-outline', 'compass', 'safari', 'safari.fill'],
        ['portfolio', t('Portfolio'), 'pie-chart-outline', 'pie-chart', 'chart.pie', 'chart.pie.fill'],
        ['wallet', t('Wallet'), 'wallet-outline', 'wallet', 'wallet.bifold', 'wallet.bifold.fill'],
        ['profile', t('Profile'), 'person-circle-outline', 'person-circle', 'person.crop.circle', 'person.crop.circle.fill'],
      ] as const).map(([name, title, androidIcon, androidSelectedIcon, iosIcon, iosSelectedIcon]) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          tabBarIcon: ({ color, focused }) => Platform.OS === 'ios'
            ? <SymbolView name={focused ? iosSelectedIcon : iosIcon} tintColor={color} size={22} />
            : name === 'wallet'
              ? <MaterialCommunityIcons name={focused ? 'wallet-bifold' : 'wallet-bifold-outline'} size={22} color={color} />
            : Platform.OS === 'android' && name === 'index'
              ? <MaterialCommunityIcons name={focused ? 'home-circle' : 'home-circle-outline'} size={22} color={color} />
            : <Ionicons name={focused ? androidSelectedIcon : androidIcon} size={22} color={color} />,
        }} />
      ))}
      <Tabs.Screen name="trade" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeLayout /> : <ClassicLayout />;
}