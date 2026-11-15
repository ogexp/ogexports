import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform, useColorScheme } from 'react-native';
import { isRunningInExpoGo, reloadAppAsync } from 'expo';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetInvestorExchangeRates,
  useGetInvestorProfile,
  useUpdateInvestorProfile,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { configureMoneyDisplay, first, messageOf, record, unwrap } from '@/lib/data';
import { configureUiLanguage, translateUi } from '@/lib/strings';
import { defaultPreferences, parsePreferences, persistPreferences, PreferenceSaveError, readPreferenceSnapshot,
  type AppPreferences, type PreferencePatch } from '@/lib/app-preferences';
export type { AppearancePreference, DisplayCurrency, AppPreferences } from '@/lib/app-preferences';

type PreferencesContextValue = {
  preferences: AppPreferences;
  resolvedAppearance: 'light' | 'dark';
  isRTL: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasPendingSync: boolean;
  error: string;
  rates: Record<string, number>;
  ratesAsOf: string;
  ratesLoading: boolean;
  ratesError: boolean;
  savePreferences: (patch: Partial<AppPreferences>) => Promise<void>;
  clearError: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const preferenceStorageKey = (userId: string) => `og-investor-app-preferences:${userId}`;

function normalizeRates(value: unknown, base: string): Record<string, number> {
  const source = record(value);
  const rates: Record<string, number> = {};
  for (const [currency, rawRate] of Object.entries(source)) {
    const rate = typeof rawRate === 'number' ? rawRate : typeof rawRate === 'string' ? Number(rawRate) : Number.NaN;
    if (Number.isFinite(rate) && rate > 0) rates[currency.toUpperCase()] = rate;
  }
  if (base === 'USD') rates.USD = 1;
  return rates;
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const systemAppearance = useColorScheme();
  const userId = first(record(user), ['id']);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const currentPreferences = useRef<AppPreferences>(defaultPreferences);
  const pendingPreferences = useRef<PreferencePatch>({});
  const savingSession = useRef<string | null>(null);
  const loadedAccount = useRef<string | null>(null);
  const activeSession = `${userId}:${token ?? ''}`;
  const sessionRef = useRef(activeSession);
  sessionRef.current = activeSession;
  const storageWrites = useRef<Promise<void>>(Promise.resolve());
  const store = useCallback((owner: string, next: AppPreferences, pending: PreferencePatch) => {
    const write = storageWrites.current.catch(() => undefined).then(() =>
      AsyncStorage.setItem(preferenceStorageKey(owner), JSON.stringify({ ...next, pendingSync: pending })));
    storageWrites.current = write;
    return write;
  }, []);
  const apply = useCallback((next: AppPreferences, pending: PreferencePatch) => {
    currentPreferences.current = next;
    pendingPreferences.current = pending;
    setPreferences(next);
  }, []);
  const profileQuery = useGetInvestorProfile({
    query: {
      queryKey: ['investor-profile'],
      enabled: Boolean(token && userId),
      staleTime: 60_000,
    },
  });
  const ratesQuery = useGetInvestorExchangeRates({
    query: {
      queryKey: ['investor-display-exchange-rates', userId],
      enabled: Boolean(token && userId),
      staleTime: 300_000,
      retry: 1,
    },
  });
  const { mutateAsync: updateProfile } = useUpdateInvestorProfile({ request: { timeoutMs: 10_000 } });
  const profile = unwrap(profileQuery.data);
  const rateResponse = unwrap(ratesQuery.data);
  const rates = normalizeRates(rateResponse.rates, first(rateResponse, ['base']).toUpperCase());
  const ratesAsOf = first(rateResponse, ['as_of', 'updated_at']);
  const isRTL = preferences.language === 'ur' || preferences.language === 'ar';
  const resolvedAppearance = preferences.appearance === 'system'
    ? systemAppearance === 'dark' ? 'dark' : 'light'
    : preferences.appearance;

  configureMoneyDisplay({
    language: preferences.language,
    currency: preferences.currency,
    rates,
    conversionUnavailableLabel: translateUi('Currency conversion unavailable', preferences.language),
  });
  configureUiLanguage(preferences.language);

  useEffect(() => {
    let active = true;
    apply(defaultPreferences, {});
    loadedAccount.current = null;
    savingSession.current = null;
    setIsSaving(false);
    setPreferencesLoaded(!userId);
    setError('');
    if (!userId) return () => { active = false; };
    void AsyncStorage.getItem(preferenceStorageKey(userId))
      .then(raw => {
        if (!active) return;
        if (raw) {
          try {
            const saved = readPreferenceSnapshot(JSON.parse(raw));
            apply({ ...saved.preferences, ...saved.pending }, saved.pending);
          } catch { setError('Saved app preferences could not be read. Please select your preferences again.'); }
        }
        loadedAccount.current = userId;
        setPreferencesLoaded(true);
      })
      .catch(() => {
        if (active) {
          loadedAccount.current = userId;
          setError('Saved app preferences could not be read from this device.');
          setPreferencesLoaded(true);
        }
      });
    return () => { active = false; };
  }, [userId, apply]);

  useEffect(() => {
    if (!preferencesLoaded || !profileQuery.data || loadedAccount.current !== userId) return;
    if (first(record(profile.user), ['id']) !== userId) return;
    const parsed = parsePreferences(profile.preferences);
    const pending = pendingPreferences.current;
    const next = { ...currentPreferences.current, ...parsed, ...pending };
    apply(next, pending);
    if (!savingSession.current) {
      const ownerSession = activeSession;
      void store(userId, next, pending).catch(() => {
        if (sessionRef.current === ownerSession) setError('Account preferences loaded, but could not be cached on this device.');
      });
    }
  }, [preferencesLoaded, profileQuery.data, userId, apply, store, activeSession]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = preferences.language;
      }
      return;
    }
    // Do not restart an installed app before the new language is stored durably.
    if (isSaving) return;
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRTL);
      // Avoid restarting Expo Go while the authenticated app tree is mounting.
      // The persisted RTL direction will be applied the next time Expo Go is
      // manually reloaded; installed builds can still reload immediately.
      if (!isRunningInExpoGo()) void reloadAppAsync().catch(() => undefined);
    }
  }, [preferencesLoaded, preferences.language, isRTL, isSaving]);

  const savePreferences = useCallback(async (patch: Partial<AppPreferences>) => {
    if (!userId || !token || loadedAccount.current !== userId) {
      const error = new Error('Wait for your account preferences to load before saving.');
      setError(error.message);
      throw error;
    }
    if (savingSession.current === activeSession) return;
    setError('');
    savingSession.current = activeSession;
    setIsSaving(true);
    const isCurrent = () => sessionRef.current === activeSession;
    try {
      await persistPreferences({
        current: currentPreferences.current,
        pending: pendingPreferences.current,
        patch, isCurrent, apply,
        store: (next, pending) => store(userId, next, pending),
        sync: async preferences => {
          await queryClient.cancelQueries({ queryKey: ['investor-profile'] });
          if (!isCurrent()) throw new Error('The signed-in account changed.');
          return updateProfile({ data: { preferences } });
        },
        confirmed: async response => {
          await queryClient.cancelQueries({ queryKey: ['investor-profile'] });
          if (isCurrent()) queryClient.setQueryData(['investor-profile'], response);
        },
      });
    } catch (saveError) {
      if (isCurrent()) {
        const language = currentPreferences.current.language;
        setError(saveError instanceof PreferenceSaveError
          ? `${translateUi(saveError.summary, language)} ${translateUi(saveError.detail, language)}`
          : messageOf(saveError));
      }
      throw saveError;
    } finally {
      if (isCurrent()) {
        savingSession.current = null;
        setIsSaving(false);
      }
    }
  }, [activeSession, apply, queryClient, store, token, updateProfile, userId]);

  useEffect(() => {
    if (preferencesLoaded && token && loadedAccount.current === userId && Object.keys(pendingPreferences.current).length) {
      void savePreferences({}).catch(() => { /* A visible sync error and Retry action are provided by Settings. */ });
    }
  }, [preferencesLoaded, token, userId, savePreferences]);

  const hasPendingSync = Object.keys(pendingPreferences.current).length > 0;

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    resolvedAppearance,
    isRTL,
    isLoading: !preferencesLoaded || Boolean(userId && loadedAccount.current !== userId),
    isSaving,
    hasPendingSync,
    error,
    rates,
    ratesAsOf,
    ratesLoading: ratesQuery.isLoading,
    ratesError: ratesQuery.isError,
    savePreferences,
    clearError: () => setError(''),
  }), [
    preferences, resolvedAppearance, isRTL, preferencesLoaded, isSaving, hasPendingSync, userId, error,
    rates, ratesAsOf, ratesQuery.isLoading, ratesQuery.isError, savePreferences,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useOptionalAppPreferences() {
  return useContext(PreferencesContext);
}

export function useAppPreferences() {
  const value = useOptionalAppPreferences();
  if (!value) throw new Error('useAppPreferences must be used inside AppPreferencesProvider.');
  return value;
}
