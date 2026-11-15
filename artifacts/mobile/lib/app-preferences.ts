import type { AppLanguage } from './strings';

export type AppearancePreference = 'light' | 'dark' | 'system';
export type DisplayCurrency = 'USD' | 'PKR' | 'EUR' | 'GBP';
export type AppPreferences = {
  language: AppLanguage;
  currency: DisplayCurrency;
  appearance: AppearancePreference;
};
export type PreferencePatch = Partial<AppPreferences>;
export const defaultPreferences: AppPreferences = { language: 'en', currency: 'USD', appearance: 'light' };
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function parsePreferences(value: unknown): PreferencePatch {
  const source = object(value);
  const next: PreferencePatch = {};
  if (source.language === 'en' || source.language === 'ur' || source.language === 'ar') next.language = source.language;
  const currency = typeof source.currency === 'string' ? source.currency.toUpperCase() : '';
  if (currency === 'USD' || currency === 'PKR' || currency === 'EUR' || currency === 'GBP') next.currency = currency;
  const appearance = source.appearance ?? source.theme;
  if (appearance === 'light' || appearance === 'dark' || appearance === 'system') next.appearance = appearance;
  return next;
}

export function readPreferenceSnapshot(value: unknown) {
  const source = object(value);
  return {
    preferences: { ...defaultPreferences, ...parsePreferences(source) },
    pending: parsePreferences(source.pendingSync),
  };
}

export class PreferenceSaveError extends Error {
  readonly stage: 'device' | 'account' | 'marker';
  readonly summary: string;
  readonly detail: string;
  constructor(stage: 'device' | 'account' | 'marker', cause: unknown) {
    const detail = cause instanceof Error ? cause.message : 'Please try again.';
    const summary = stage === 'device'
      ? 'Could not save preferences on this device.'
      : stage === 'account'
        ? 'Saved on this device. Account sync failed.'
        : 'Preferences reached your account, but the device sync status could not be saved.';
    super(`${summary} ${detail}`);
    this.name = 'PreferenceSaveError';
    this.stage = stage;
    this.summary = summary;
    this.detail = detail;
  }
}

/** Local choices survive failed sync and stale profile reads, without replacing unrelated server settings. */
export async function persistPreferences(options: {
  current: AppPreferences;
  pending: PreferencePatch;
  patch: PreferencePatch;
  isCurrent: () => boolean;
  apply: (preferences: AppPreferences, pending: PreferencePatch) => void;
  store: (preferences: AppPreferences, pending: PreferencePatch) => Promise<void>;
  sync: (preferences: Record<string, string>) => Promise<unknown>;
  confirmed: (response: unknown) => Promise<void>;
}) {
  const { current, pending, isCurrent, apply, store, sync, confirmed } = options;
  const patch = parsePreferences(options.patch);
  const dirty = { ...pending, ...patch };
  const next = { ...current, ...dirty };
  if (!isCurrent() || !Object.keys(dirty).length) return;
  apply(next, dirty);
  try {
    await store(next, dirty);
  } catch (error) {
    if (isCurrent()) apply(current, pending);
    throw new PreferenceSaveError('device', error);
  }
  if (!isCurrent()) return;
  const serverPatch: Record<string, string> = { ...dirty };
  if (dirty.appearance) serverPatch.theme = dirty.appearance;
  let saved: AppPreferences;
  try {
    const response = await sync(serverPatch);
    if (!isCurrent()) return;
    const outer = object(response);
    const profile = object(outer.data ?? outer);
    const echoed = parsePreferences(profile.preferences);
    if (Object.entries(dirty).some(([key, value]) => echoed[key as keyof AppPreferences] !== value)) {
      throw new Error('The server did not confirm the selected preferences.');
    }
    saved = { ...next, ...echoed };
    await confirmed(response);
  } catch (error) {
    throw new PreferenceSaveError('account', error);
  }
  if (!isCurrent()) return;
  try {
    await store(saved, {});
  } catch (error) {
    throw new PreferenceSaveError('marker', error);
  }
  if (isCurrent()) apply(saved, {});
}
