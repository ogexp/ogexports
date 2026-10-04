import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { loadApiOrigin, loadSavedUser, getSavedToken, saveSession, clearSession, saveApiOrigin } from '@/lib/api-config';
import { first, record, type Json } from '@/lib/data';
import { getAppPinOwner, hasAppPin, removeAppPin } from '@/lib/app-pin';

type Challenge = { email: string; mode: 'email' | '2fa'; message?: string; returnTo?: string };
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
  appPinEnabled: boolean;
  appUnlocked: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setAppPinEnabled: (enabled: boolean) => Promise<void>;
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
  const [appPinEnabled, setAppPinEnabledState] = useState(false);
  const [appUnlocked, setAppUnlocked] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      loadApiOrigin().catch(() => ''),
      getSavedToken().catch(() => null),
      loadSavedUser().catch(() => null),
      AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null),
      AsyncStorage.getItem(BIOMETRIC_KEY).catch(() => null),
      Platform.OS === 'web' ? Promise.resolve(null) : getAppPinOwner(),
    ]).then(async ([origin, savedToken, savedUser, onboardingFlag, biometricFlag, pinOwner]) => {
      if (!mounted) return;
      const savedUserId = first(record(savedUser), ['id'], '');
      const savedPinEnabled = Platform.OS !== 'web' && !!savedToken && !!savedUserId && pinOwner === savedUserId;
      if (Platform.OS !== 'web' && pinOwner && !savedPinEnabled) await removeAppPin();
      setApiOrigin(origin);
      setToken(savedToken);
      setUser(savedUser);
      setOnboardingComplete(onboardingFlag === 'complete');
      const protectedByBiometrics = biometricFlag === 'enabled';
      setBiometricEnabledState(protectedByBiometrics);
      setAppPinEnabledState(savedPinEnabled);
      setAppUnlocked(!savedToken || (!protectedByBiometrics && !savedPinEnabled) || Platform.OS === 'web');
      setReady(true);
    }).catch(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background' && token && (biometricEnabled || appPinEnabled)) {
        setAppUnlocked(false);
      }
    });
    return () => subscription.remove();
  }, [token, biometricEnabled, appPinEnabled]);

  const acceptSession = async (nextToken: string, nextUser: Json) => {
    const nextUserId = first(record(nextUser), ['id'], '');
    const pinOwner = Platform.OS === 'web' ? null : await getAppPinOwner();
    const nextAppPinEnabled = !!nextUserId && pinOwner === nextUserId && await hasAppPin(nextUserId);
    if (Platform.OS !== 'web' && pinOwner && !nextAppPinEnabled) await removeAppPin();
    await saveSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setAppPinEnabledState(nextAppPinEnabled);
    setAppUnlocked(true);
    setChallenge(null);
  };
  const signOut = async () => {
    await clearSession();
    if (Platform.OS !== 'web') await removeAppPin();
    setToken(null);
    setUser(null);
    setAppPinEnabledState(false);
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
  const setAppPinEnabled = async (enabled: boolean) => {
    if (Platform.OS === 'web') throw new Error('App PIN is available in the mobile app only.');
    if (!enabled) {
      await removeAppPin();
      setAppPinEnabledState(false);
      setAppUnlocked(true);
      return;
    }
    const userId = first(record(user), ['id'], '');
    if (!userId || !(await hasAppPin(userId))) throw new Error('Set an app PIN before enabling this lock.');
    setAppPinEnabledState(true);
    setAppUnlocked(true);
  };
  const unlockApp = () => setAppUnlocked(true);

  return (
    <AuthContext.Provider value={{
      ready, token, user, apiOrigin, challenge, setChallenge,
      onboardingComplete, completeOnboarding, biometricEnabled, appPinEnabled, appUnlocked,
      setBiometricEnabled, setAppPinEnabled, unlockApp,
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