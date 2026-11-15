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

/** Effect initialization and a tap arriving during initialization share one bounded read. */
export function createPreferenceHydrator(
  read: (owner: string) => Promise<string | null>,
  settled: (owner: string, session: string, snapshot: ReturnType<typeof readPreferenceSnapshot>, error: string) => void,
  timeoutMs = 2500,
) {
  let current: { owner: string; session: string; promise: Promise<void> } | undefined;
  return {
    invalidate() { current = undefined; },
    load(owner: string, session: string): Promise<void> {
      if (current?.owner === owner && current.session === session) return current.promise;
      const entry = { owner, session, promise: Promise.resolve() };
      current = entry;
      entry.promise = Promise.resolve().then(async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let snapshot = readPreferenceSnapshot(null);
        let error = '';
        try {
          const raw = await Promise.race([
            read(owner),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error('Preference read timed out.')), timeoutMs);
            }),
          ]);
          snapshot = readPreferenceSnapshot(raw ? JSON.parse(raw) : null);
          snapshot.preferences = { ...snapshot.preferences, ...snapshot.pending };
        } catch {
          error = 'Saved app preferences could not be read from this device.';
        } finally {
          if (timer) clearTimeout(timer);
        }
        if (current === entry) settled(owner, session, snapshot, error);
      });
      return entry.promise;
    },
  };
}

/** Recognize old saved user envelopes without trusting an unrelated cached profile. */
export function preferenceAccountId(value: unknown): string {
  const user = object(value);
  const data = object(user.data);
  for (const source of [user, object(user.user), data, object(data.user)]) {
    if (typeof source.id === 'string' && source.id.trim()) return source.id.trim();
    if (typeof source.id === 'number' && Number.isFinite(source.id)) return String(source.id);
  }
  return '';
}

/** Only the newest waiting selection is sent after an earlier request settles. */
export function createPreferenceSyncQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return (isCurrent: () => boolean, sync: () => Promise<unknown>) => {
    const result = tail.catch(() => undefined).then(() => isCurrent() ? sync() : undefined);
    tail = result;
    return result;
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
  stored?: () => void;
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
  options.stored?.();
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
