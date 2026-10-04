import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function AuthLayout() {
  const colors = useColors();
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back', headerTintColor: colors.primary, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="login" options={{ title: 'OG Exports', headerShown: false }} />
    <Stack.Screen name="register" options={{ title: 'Create account', headerShown: false }} />
    <Stack.Screen name="verify" options={{ title: 'Verification' }} />
    <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
  </Stack>;
}