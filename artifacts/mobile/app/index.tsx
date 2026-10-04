import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Entry() {
  const { ready, token } = useAuth();
  const colors = useColors();
  useEffect(() => {
    if (ready) router.replace(token ? '/(tabs)' : '/(auth)/login');
  }, [ready, token]);
  return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
}