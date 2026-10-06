import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform, useColorScheme } from 'react-native';
import { reloadAppAsync } from 'expo';
import {
  useGetInvestorExchangeRates,
  useGetInvestorProfile,
  useGetInvestorWallet,
  useUpdateInvestorProfile,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { configureMoneyDisplay, first, record, unwrap, type Json } from '@/lib/data';
import { configureUiLanguage, translateUi } from '@/lib/strings';
import type { AppLanguage } from '@/lib/strings';

export type AppearancePreference = 'light' | 'dark' | 'system';
export type DisplayCurrency = 'USD' | 'PKR' | 'EUR' | 'GBP';

export type AppPreferences = {
  language: AppLanguage;
  currency: DisplayCurrency;
  appearance: AppearancePreference;
};

type PreferencesContextValue = {
  preferences: AppPreferences;
  resolvedAppearance: 'light' | 'dark';
  isRTL: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  rates: Record<string, number>;
  ratesAsOf: string;
  ratesLoading: boolean;
  ratesError: boolean;
  walletCurrency: string;
  savePreferences: (patch: Partial<AppPreferences>) => Promise<void>;
  clearError: () => void;
};

const defaultPreferences: AppPreferences = {
  language: 'en',
  currency: 'USD',
  appearance: 'light',
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const preferenceStorageKey = (userId: string) => `og-investor-app-preferences:${userId}`;

function parsePreferences(value: unknown): Partial<AppPreferences> {
  const source = record(value);
  const next: Partial<AppPreferences> = {};
  if (source.language === 'en' || source.language === 'ur' || source.language === 'ar') {
    next.language = source.language;
  }
  const currency = typeof source.currency === 'string' ? source.currency.toUpperCase() : '';
  if (currency === 'USD' || currency === 'PKR' || currency === 'EUR' || currency === 'GBP') {
    next.currency = currency;
  }
  const appearance = source.appearance ?? source.theme;
  if (appearance === 'light' || appearance === 'dark' || appearance === 'system') {
    next.appearance = appearance;
  }
  return next;
}

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
  const systemAppearance = useColorScheme();
  const userId = first(record(user), ['id']);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const profileQuery = useGetInvestorProfile({
    query: {
      queryKey: ['investor-profile'],
      enabled: Boolean(token && userId),
      staleTime: 60_000,
    },
  });
  const walletQuery = useGetInvestorWallet({
    query: {
      queryKey: ['investor-wallet'],
      enabled: Boolean(token && userId),
      staleTime: 30_000,
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
  const updateProfile = useUpdateInvestorProfile();
  const profile = unwrap(profileQuery.data);
  const wallet = unwrap(walletQuery.data);
  const rateResponse = unwrap(ratesQuery.data);
  const rates = normalizeRates(rateResponse.rates, first(rateResponse, ['base']).toUpperCase());
  const walletCurrency = first(wallet, ['currency', 'default_currency']).toUpperCase();
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
    setPreferences(defaultPreferences);
    setPreferencesLoaded(!userId);
    setError('');
    if (!userId) return () => { active = false; };
    void AsyncStorage.getItem(preferenceStorageKey(userId))
      .then(raw => {
        if (!active) return;
        if (raw) {
          try {
            setPreferences(current => ({ ...current, ...parsePreferences(JSON.parse(raw)) }));
          } catch {
            setPreferences(current => ({ ...current }));
          }
        }
        setPreferencesLoaded(true);
      })
      .catch(() => {
        if (active) setPreferencesLoaded(true);
      });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!preferencesLoaded || !profileQuery.data) return;
    const serverPreferences = record(profile.preferences);
    const parsed = parsePreferences(serverPreferences);
    if (Object.keys(parsed).length) {
      setPreferences(current => ({ ...current, ...parsed }));
      if (userId) {
        void AsyncStorage.setItem(
          preferenceStorageKey(userId),
          JSON.stringify({ ...defaultPreferences, ...parsed }),
        ).catch(() => undefined);
      }
    }
  }, [preferencesLoaded, profileQuery.data, userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = preferences.language;
      }
      return;
    }
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRTL);
      void reloadAppAsync().catch(() => undefined);
    }
  }, [preferencesLoaded, preferences.language, isRTL]);

  const savePreferences = useCallback(async (patch: Partial<AppPreferences>) => {
    if (!userId || !token) throw new Error('Sign in before saving app preferences.');
    setError('');
    setIsSaving(true);
    const next = { ...preferences, ...patch };
    const serverPatch: Json = {};
    if (patch.language !== undefined) serverPatch.language = patch.language;
    if (patch.currency !== undefined) serverPatch.currency = patch.currency;
    if (patch.appearance !== undefined) {
      serverPatch.appearance = patch.appearance;
      serverPatch.theme = patch.appearance;
    }
    try {
      const currentProfile = profileQuery.data
        ? profile
        : unwrap((await profileQuery.refetch()).data);
      const currentPreferences = record(currentProfile.preferences);
      const preferencesToSave: Json = { ...currentPreferences, ...serverPatch };
      await updateProfile.mutateAsync({ data: { preferences: preferencesToSave } });
      await AsyncStorage.setItem(preferenceStorageKey(userId), JSON.stringify(next));
      setPreferences(next);
      void profileQuery.refetch();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'App preferences could not be saved.');
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [preferences, profile, profileQuery, token, updateProfile, userId]);

  const value = useMemo<PreferencesContextValue>(() => ({
    preferences,
    resolvedAppearance,
    isRTL,
    isLoading: !preferencesLoaded,
    isSaving,
    error,
    rates,
    ratesAsOf,
    ratesLoading: ratesQuery.isLoading,
    ratesError: ratesQuery.isError,
    walletCurrency,
    savePreferences,
    clearError: () => setError(''),
  }), [
    preferences, resolvedAppearance, isRTL, preferencesLoaded, isSaving, error,
    rates, ratesAsOf, ratesQuery.isLoading, ratesQuery.isError, walletCurrency, savePreferences,
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
