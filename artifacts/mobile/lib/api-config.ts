import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';

const ORIGIN_KEY = 'og-investor-api-origin';
const TOKEN_KEY = 'og-investor-session-token';
const USER_KEY = 'og-investor-session-user';

function cleanOrigin(input: string): string {
  return input.trim().replace(/\/+$/, '').replace(/\/api$/i, '');
}

export function validOrigin(input: string): boolean {
  try {
    const parsed = new URL(cleanOrigin(input));
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function configureApiOrigin(input: string): string {
  const origin = cleanOrigin(input);
  if (!validOrigin(origin)) throw new Error('Enter a valid API address, such as https://api.example.com');
  setBaseUrl(origin);
  return origin;
}

export async function loadApiOrigin(): Promise<string> {
  const saved = await AsyncStorage.getItem(ORIGIN_KEY);
  const fromEnvironment = process.env.EXPO_PUBLIC_API_BASE_URL
    ?? (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '');
  const origin = saved || fromEnvironment;
  if (!origin) return '';
  try {
    return configureApiOrigin(origin);
  } catch {
    return '';
  }
}

export async function saveApiOrigin(input: string): Promise<string> {
  const origin = configureApiOrigin(input);
  await AsyncStorage.setItem(ORIGIN_KEY, origin);
  return origin;
}

export async function getSavedToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveSession(token: string, user: Record<string, unknown>): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}

export async function loadSavedUser(): Promise<Record<string, unknown> | null> {
  const value = await AsyncStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

setAuthTokenGetter(getSavedToken);