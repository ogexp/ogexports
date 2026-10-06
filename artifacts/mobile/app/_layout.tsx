import React, { useEffect, useRef } from 'react';
import { Platform, StatusBar as NativeStatusBar } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router, Stack, useGlobalSearchParams, usePathname, useSegments } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import type { NotificationResponse } from 'expo-notifications';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppPreferencesProvider, useAppPreferences } from '@/context/AppPreferencesContext';
import { useColors } from '@/hooks/useColors';
import { serializeRouteState } from '@/lib/post-auth-route';
import { notificationHref } from '@/lib/notification-routing';
import { record } from '@/lib/data';
import { translateUi } from '@/lib/strings';
import { MOTION, MotionProvider, useMotion } from '@/lib/motion';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { reduceMotion } = useMotion();
  const { ready, token, user, apiOrigin, appUnlocked } = useAuth();
  const sessionQueryClient = useQueryClient();
  const { isRTL, preferences, resolvedAppearance } = useAppPreferences();
  const colors = useColors();
  const t = (value: string) => translateUi(value, preferences.language);
  const segments = useSegments();
  const isHomeRoute = segments[0] === '(tabs)' && !segments[1];
  const isDarkStatusBar = resolvedAppearance === 'dark';
  const useLightStatusBar = isHomeRoute || isDarkStatusBar;
  const statusBar = Platform.OS === 'android'
    ? <NativeStatusBar barStyle={useLightStatusBar ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
    : <ExpoStatusBar style={useLightStatusBar ? 'light' : 'dark'} />;
  const pathname = usePathname();
  const routeParams = useGlobalSearchParams();
  const returnTo = serializeRouteState(pathname, routeParams);
  const accountId = String(record(user).id ?? record(user).user_id ?? '');
  const sessionScope = token ? `${apiOrigin}|${accountId || 'authenticated'}` : 'signed-out';
  const previousSessionScope = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    // Query keys are shared across accounts; never reuse another investor's cached balances.
    if (previousSessionScope.current !== undefined && previousSessionScope.current !== sessionScope) {
      sessionQueryClient.clear();
    }
    previousSessionScope.current = sessionScope;
  }, [ready, sessionScope, sessionQueryClient]);

  useEffect(() => {
    if (Platform.OS === 'web' || (Platform.OS === 'android' && isRunningInExpoGo())) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    const handledResponses = new Set<string>();
    const handleResponse = (notificationsApi: typeof import('expo-notifications'), response: NotificationResponse) => {
      if (!active) return;
      const request = response.notification.request;
      const responseKey = `${request.identifier}:${response.actionIdentifier}`;
      if (handledResponses.has(responseKey)) return;
      handledResponses.add(responseKey);
      if (handledResponses.size > 10) handledResponses.clear();
      void notificationsApi.clearLastNotificationResponseAsync();
      const data = record(request.content.data);
      router.push(notificationHref(data) ?? '/account/notifications');
    };
    void import('expo-notifications').then(notificationsApi => {
      if (!active) return;
      subscription = notificationsApi.addNotificationResponseReceivedListener(response => handleResponse(notificationsApi, response));
      return notificationsApi.getLastNotificationResponseAsync().then(response => {
        if (response) handleResponse(notificationsApi, response);
      });
    }).catch(() => undefined);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const firstSegment = String(segments[0] ?? '');
    const publicSegments = new Set(['', 'index', 'onboarding', '(auth)']);
    if (token && !appUnlocked && firstSegment !== 'lock' && firstSegment !== '(auth)') {
      router.replace({ pathname: '/lock', params: { returnTo } });
      return;
    }
    if (!token && !publicSegments.has(firstSegment)) {
      router.replace({ pathname: '/(auth)/login', params: { returnTo } });
    }
  }, [ready, token, appUnlocked, segments, returnTo]);

  if (token && !appUnlocked) {
    return <>
      {statusBar}
      <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'fade' : 'slide_from_right', animationDuration: MOTION.page, contentStyle: { backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' } }}>
        <Stack.Screen name="lock" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>;
  }

  return (
    <>
      {statusBar}
      <Stack screenOptions={{
        animation: reduceMotion ? 'fade' : 'slide_from_right',
        animationDuration: MOTION.page,
        gestureEnabled: true,
        headerBackTitle: t('Back'),
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground },
        contentStyle: { backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' },
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="lock" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="project/[id]" options={{ title: t('Opportunity') }} />
        <Stack.Screen name="position/[id]" options={{ title: t('Investment') }} />
        <Stack.Screen name="tracking/[id]" options={{ title: t('Container tracking') }} />
        <Stack.Screen name="account/profile" options={{ title: '' }} />
        <Stack.Screen name="account/portfolio" options={{ title: t('Portfolio') }} />
        <Stack.Screen name="account/transactions" options={{ title: t('Transactions') }} />
        <Stack.Screen name="account/transaction/[id]" options={{ title: t('Transaction details') }} />
        <Stack.Screen name="account/security" options={{ title: t('Security & devices') }} />
        <Stack.Screen name="account/legal/[section]" options={{ title: t('Policies') }} />
        <Stack.Screen name="account/data-preferences" options={{ title: t('Data preferences') }} />
        <Stack.Screen name="wallet/deposit" options={{ title: t('Add funds') }} />
        <Stack.Screen name="wallet/withdraw" options={{ title: t('Withdraw') }} />
        <Stack.Screen name="account/kyc" options={{ title: t('Identity verification') }} />
        <Stack.Screen name="account/reports" options={{ title: t('Reports') }} />
        <Stack.Screen name="account/notifications" options={{ title: t('Notifications') }} />
        <Stack.Screen name="account/messages" options={{ title: t('Support') }} />
        <Stack.Screen name="account/settings" options={{ title: t('Settings') }} />
        <Stack.Screen name="account/analytics" options={{ title: t('Trade Analytics') }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <AppPreferencesProvider>
                  <MotionProvider>
                    <RootLayoutNav />
                  </MotionProvider>
                </AppPreferencesProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
