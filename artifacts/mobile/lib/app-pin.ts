import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const APP_PIN_KEY = 'og-investor-app-pin';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

type StoredPin = {
  ownerId: string;
  salt: string;
  digest: string;
  failedAttempts: number;
  lockedUntil: number;
};

export type AppPinCheck = {
  valid: boolean;
  lockedUntil?: number;
};

function parseStoredPin(value: string | null): StoredPin | null {
  if (value === null) return null;
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== 'object' || parsed === null ||
    typeof (parsed as StoredPin).ownerId !== 'string' ||
    typeof (parsed as StoredPin).salt !== 'string' ||
    typeof (parsed as StoredPin).digest !== 'string' ||
    typeof (parsed as StoredPin).failedAttempts !== 'number' ||
    typeof (parsed as StoredPin).lockedUntil !== 'number'
  ) {
    throw new Error('The saved app PIN could not be read safely.');
  }
  return parsed as StoredPin;
}

async function storedPin(): Promise<StoredPin | null> {
  return parseStoredPin(await SecureStore.getItemAsync(APP_PIN_KEY));
}

async function pinDigest(pin: string, salt: string, ownerId: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${ownerId}:${pin}`,
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export async function getAppPinOwner(): Promise<string | null> {
  return (await storedPin())?.ownerId ?? null;
}

export async function hasAppPin(ownerId: string): Promise<boolean> {
  const record = await storedPin();
  return !!record && record.ownerId === ownerId;
}

export async function saveAppPin(pin: string, ownerId: string): Promise<void> {
  if (!/^\d{6}$/.test(pin)) throw new Error('Choose a six-digit app PIN.');
  if (!ownerId) throw new Error('Sign in before setting an app PIN.');
  const salt = toHex(Crypto.getRandomBytes(16));
  const digest = await pinDigest(pin, salt, ownerId);
  const record: StoredPin = { ownerId, salt, digest, failedAttempts: 0, lockedUntil: 0 };
  await SecureStore.setItemAsync(APP_PIN_KEY, JSON.stringify(record));
}

export async function verifyAppPin(pin: string, ownerId: string): Promise<AppPinCheck> {
  const record = await storedPin();
  if (!record || record.ownerId !== ownerId || !/^\d{6}$/.test(pin)) return { valid: false };

  const now = Date.now();
  if (record.lockedUntil > now) return { valid: false, lockedUntil: record.lockedUntil };

  const digest = await pinDigest(pin, record.salt, ownerId);
  if (constantTimeEqual(digest, record.digest)) {
    await SecureStore.setItemAsync(APP_PIN_KEY, JSON.stringify({
      ...record,
      failedAttempts: 0,
      lockedUntil: 0,
    }));
    return { valid: true };
  }

  const failedAttempts = record.failedAttempts + 1;
  const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0;
  await SecureStore.setItemAsync(APP_PIN_KEY, JSON.stringify({
    ...record,
    failedAttempts: lockedUntil ? 0 : failedAttempts,
    lockedUntil,
  }));
  return { valid: false, ...(lockedUntil ? { lockedUntil } : {}) };
}

export async function removeAppPin(): Promise<void> {
  await SecureStore.deleteItemAsync(APP_PIN_KEY);
}