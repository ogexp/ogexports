import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { loadApiOrigin, loadSavedUser, getSavedToken, saveSession, clearSession, saveApiOrigin } from '@/lib/api-config';
import type { Json } from '@/lib/data';

type Challenge = { email: string; token?: string; mode: 'email' | '2fa' };
type AuthValue = {
  ready: boolean;
  token: string | null;
  user: Json | null;
  apiOrigin: string;
  challenge: Challenge | null;
  setChallenge: (value: Challenge | null) => void;
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  biometricEnabled: boolean;
  appUnlocked: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlockApp: () => void;
  acceptSession: (token: string, user: Json) => Promise<void>;
  signOut: () => Promise<void>;
  updateOrigin: (value: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);
const ONBOARDING_KEY = 'og-investor-onboarding-complete';
const BIOMETRIC_KEY = 'og-investor-biometric-login';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Json | null>(null);
  const [apiOrigin, setApiOrigin] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [appUnlocked, setAppUnlocked] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadApiOrigin().catch(() => ''),
      getSavedToken().catch(() => null),
      loadSavedUser().catch(() => null),
      AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null),
      AsyncStorage.getItem(BIOMETRIC_KEY).catch(() => null),
    ]).then(([origin, savedToken, savedUser, onboardingFlag, biometricFlag]) => {
      if (!mounted) return;
      setApiOrigin(origin);
      setToken(savedToken);
      setUser(savedUser);
      setOnboardingComplete(onboardingFlag === 'complete');
      const protectedByBiometrics = biometricFlag === 'enabled';
      setBiometricEnabledState(protectedByBiometrics);
      setAppUnlocked(!savedToken || !protectedByBiometrics || Platform.OS === 'web');
      setReady(true);
    }).catch(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  const acceptSession = async (nextToken: string, nextUser: Json) => {
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setAppUnlocked(true);
    setChallenge(null);
  };
  const signOut = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setAppUnlocked(true);
    setChallenge(null);
  };
  const updateOrigin = async (value: string) => setApiOrigin(await saveApiOrigin(value));
  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'complete');
    setOnboardingComplete(true);
  };
  const setBiometricEnabled = async (enabled: boolean) => {
    await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? 'enabled' : 'disabled');
    setBiometricEnabledState(enabled);
    setAppUnlocked(true);
  };
  const unlockApp = () => setAppUnlocked(true);

  return (
    <AuthContext.Provider value={{
      ready, token, user, apiOrigin, challenge, setChallenge,
      onboardingComplete, completeOnboarding, biometricEnabled, appUnlocked, setBiometricEnabled, unlockApp,
      acceptSession, signOut, updateOrigin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}