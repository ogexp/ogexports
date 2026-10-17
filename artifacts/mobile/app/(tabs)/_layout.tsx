import React from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
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
import { MOTION, useMotion } from '@/lib/motion';
import { TabBarBehaviorProvider, useTabBarBehavior } from '@/context/TabBarBehaviorContext';

function NativeLayout() {
  const colors = useColors();
  const { visible } = useTabBarBehavior();
  const { preferences, resolvedAppearance } = useAppPreferences();
  const t = (value: string) => translateUi(value, preferences.language);
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.mutedForeground, selected: colors.primary }}
      labelStyle={{ default: { color: colors.mutedForeground }, selected: { color: colors.primary, fontWeight: '600' } }}
      backgroundColor={colors.card}
      hidden={!visible}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf={{ default: 'house.circle', selected: 'house.circle.fill' }} /><NativeTabs.Trigger.Label>{t('Dashboard')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="opportunities"><NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} /><NativeTabs.Trigger.Label>{t('Opportunities')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="portfolio"><NativeTabs.Trigger.Icon sf={{ default: 'chart.pie', selected: 'chart.pie.fill' }} /><NativeTabs.Trigger.Label>{t('Portfolio')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet"><NativeTabs.Trigger.Icon sf={{ default: 'wallet.bifold', selected: 'wallet.bifold.fill' }} /><NativeTabs.Trigger.Label>{t('Wallet')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile"><NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} /><NativeTabs.Trigger.Label>{t('Profile')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function AnimatedTabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const { reduceMotion } = useMotion();
  const progress = React.useRef(new Animated.Value(focused ? 1 : 0)).current;
  React.useEffect(() => {
    if (reduceMotion) {
      progress.setValue(focused ? 1 : 0);
      return;
    }
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: MOTION.micro,
      useNativeDriver: true,
    }).start();
  }, [focused, progress, reduceMotion]);
  return <Animated.View style={{
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
  }}>{children}</Animated.View>;
}

function ClassicLayout() {
  const colors = useColors();
  const { preferences, resolvedAppearance } = useAppPreferences();
  const t = (value: string) => translateUi(value, preferences.language);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const { visible } = useTabBarBehavior();
  const { reduceMotion } = useMotion();
  const tabBarTranslateY = React.useRef(new Animated.Value(0)).current;
  const tabBarOpacity = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (reduceMotion) {
      tabBarTranslateY.setValue(visible ? 0 : 112);
      tabBarOpacity.setValue(visible ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.timing(tabBarTranslateY, {
        toValue: visible ? 0 : 112,
        duration: visible ? 240 : 190,
        useNativeDriver: true,
      }),
      Animated.timing(tabBarOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 200 : 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, tabBarOpacity, tabBarTranslateY, visible]);
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: {
        position: 'absolute', left: 14, right: 14,
        bottom: isWeb ? 0 : isAndroid ? Math.max(insets.bottom - 4, 8) : Math.max(insets.bottom, 10),
        height: isWeb ? 84 : isAndroid ? 70 : 70,
        paddingTop: isWeb ? 2 : isAndroid ? 0 : 4,
        paddingBottom: isWeb ? 34 : 0,
        borderRadius: isAndroid ? 35 : 0,
        backgroundColor: 'transparent',
        borderWidth: isAndroid ? StyleSheet.hairlineWidth : 0,
        borderColor: colors.border,
        elevation: isAndroid ? 9 : 0,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isAndroid ? 0.16 : 0.08,
        shadowRadius: isAndroid ? 16 : 12,
        opacity: tabBarOpacity,
        transform: [{ translateY: tabBarTranslateY }],
      },
      tabBarItemStyle: { paddingTop: isWeb ? 2 : 0 },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 1 },
      tabBarBackground: () => isAndroid
        ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 35, overflow: 'hidden' }]}>
            <BlurView
              intensity={36}
              tint={resolvedAppearance}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card, opacity: 0.76 }]} />
            <View style={[StyleSheet.absoluteFill, { borderRadius: 35, borderWidth: 1, borderColor: colors.border }]} />
            <View style={{ position: 'absolute', top: 1, left: 28, right: 28, height: StyleSheet.hairlineWidth, backgroundColor: colors.background, opacity: 0.75 }} />
          </View>
        )
        : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Platform.OS === 'ios' ? <BlurView intensity={85} tint={resolvedAppearance} style={[StyleSheet.absoluteFill, { bottom: isWeb ? 34 : 0 }]} /> : null}
            <View style={{
              position: 'absolute', left: 0, right: 0, top: 0, bottom: isWeb ? 34 : 0,
              backgroundColor: colors.card,
              opacity: isWeb ? 1 : 0.84,
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
          tabBarIcon: ({ color, focused }) => <AnimatedTabIcon focused={focused}>
            {Platform.OS === 'ios'
              ? <SymbolView name={focused ? iosSelectedIcon : iosIcon} tintColor={color} size={22} />
              : name === 'wallet'
                ? <MaterialCommunityIcons name={focused ? 'wallet-bifold' : 'wallet-bifold-outline'} size={22} color={color} />
              : Platform.OS === 'android' && name === 'index'
                ? <MaterialCommunityIcons name={focused ? 'home-circle' : 'home-circle-outline'} size={22} color={color} />
              : <Ionicons name={focused ? androidSelectedIcon : androidIcon} size={22} color={color} />}
          </AnimatedTabIcon>,
        }} />
      ))}
      <Tabs.Screen name="trade" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <TabBarBehaviorProvider>
      {isLiquidGlassAvailable() ? <NativeLayout /> : <ClassicLayout />}
    </TabBarBehaviorProvider>
  );
}