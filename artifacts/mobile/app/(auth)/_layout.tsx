import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back', headerTintColor: '#1f6d4c', contentStyle: { backgroundColor: '#f7f7f1' } }}>
    <Stack.Screen name="login" options={{ title: 'OG Exports' }} />
    <Stack.Screen name="register" options={{ title: 'Create account' }} />
    <Stack.Screen name="verify" options={{ title: 'Verification' }} />
    <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
  </Stack>;
}