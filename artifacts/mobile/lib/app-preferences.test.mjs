import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createPreferenceHydrator, createPreferenceSyncQueue, defaultPreferences, parsePreferences,
  persistPreferences, preferenceAccountId, readPreferenceSnapshot,
} from './app-preferences.ts';

function harness(overrides = {}) {
  const events = [];
  const state = { preferences: defaultPreferences, pending: {}, events };
  const options = {
    current: defaultPreferences, pending: {}, patch: { appearance: 'dark' },
    isCurrent: () => true,
    apply: (preferences, pending) => { state.preferences = preferences; state.pending = pending; events.push('apply'); },
    store: async (preferences, pending) => { state.stored = { ...preferences, pendingSync: pending }; events.push('store'); },
    sync: async patch => {
      state.sent = patch;
      events.push('sync');
      return { data: { preferences: { ...defaultPreferences, ...patch } } };
    },
    confirmed: async response => { state.response = response; events.push('confirmed'); },
    ...overrides,
  };
  return { state, options };
}

test('preferences accept all supported options and migrate legacy theme/device snapshots', () => {
  for (const language of ['en', 'ur', 'ar']) assert.equal(parsePreferences({ language }).language, language);
  for (const currency of ['USD', 'PKR', 'EUR', 'GBP']) assert.equal(parsePreferences({ currency }).currency, currency);
  for (const appearance of ['light', 'dark', 'system']) assert.equal(parsePreferences({ appearance }).appearance, appearance);
  assert.deepEqual(parsePreferences({ language: 'invalid', currency: 'bad', theme: 'dark' }), { appearance: 'dark' });
  assert.equal(readPreferenceSnapshot({ language: 'ur', currency: 'PKR' }).preferences.language, 'ur');
  assert.deepEqual(readPreferenceSnapshot({ pendingSync: { currency: 'GBP' } }).pending, { currency: 'GBP' });
});

test('selection applies immediately, then stores before network, and clears pending only after confirmation', async () => {
  const { state, options } = harness();
  const saving = persistPreferences(options);
  assert.equal(state.preferences.appearance, 'dark');
  assert.deepEqual(state.events, ['apply', 'store']);
  await saving;
  assert.deepEqual(state.sent, { appearance: 'dark', theme: 'dark' });
  assert.deepEqual(state.events, ['apply', 'store', 'sync', 'confirmed', 'store', 'apply']);
  assert.deepEqual(state.pending, {});
  assert.deepEqual(state.stored.pendingSync, {});
});

test('failed sync preserves local selection and durable pending changes for retry/restart', async () => {
  const { state, options } = harness({ sync: async () => { throw new Error('offline'); } });
  await assert.rejects(persistPreferences(options), error => error.stage === 'account' && /Saved on this device/.test(error.message));
  assert.equal(state.preferences.appearance, 'dark');
  const restored = readPreferenceSnapshot(state.stored);
  assert.deepEqual(restored.pending, { appearance: 'dark' });
  assert.equal(restored.preferences.appearance, 'dark');
});

test('retry combines previous pending fields and changes without replacing unrelated profile preferences', async () => {
  const { state, options } = harness({
    current: { ...defaultPreferences, currency: 'PKR' },
    pending: { currency: 'PKR' }, patch: { language: 'ur' },
  });
  await persistPreferences(options);
  assert.deepEqual(state.sent, { currency: 'PKR', language: 'ur' });
  assert.equal(state.preferences.currency, 'PKR');
  assert.equal(state.preferences.language, 'ur');
});

test('device write failure rolls back UI, retains earlier pending changes, and makes no server call', async () => {
  const { state, options } = harness({ pending: { language: 'ar' }, store: async () => { throw new Error('disk full'); } });
  await assert.rejects(persistPreferences(options), error => error.stage === 'device');
  assert.deepEqual(state.preferences, defaultPreferences);
  assert.deepEqual(state.pending, { language: 'ar' });
  assert.equal(state.sent, undefined);
});

test('a server ignoring a preference is not reported as successfully synced', async () => {
  const { state, options } = harness({ sync: async () => ({ data: { preferences: defaultPreferences } }) });
  await assert.rejects(persistPreferences(options), /did not confirm/);
  assert.equal(state.preferences.appearance, 'dark');
  assert.deepEqual(state.pending, { appearance: 'dark' });
});

test('logout/account switch during local storage prevents dispatching into the next account', async () => {
  let active = true;
  const { state, options } = harness({ isCurrent: () => active, store: async () => { active = false; } });
  await persistPreferences(options);
  assert.equal(state.sent, undefined);
});

test('late response after account switch cannot change cache or acknowledge another account', async () => {
  let active = true;
  const { state, options } = harness({
    isCurrent: () => active,
    sync: async () => { active = false; return { data: { preferences: { appearance: 'dark' } } }; },
  });
  await persistPreferences(options);
  assert.equal(state.response, undefined);
  assert.deepEqual(state.pending, { appearance: 'dark' });
});

test('profile ingestion preserves pending fields, saves are bounded, and failures are next to the controls', () => {
  const provider = readFileSync(new URL('../context/AppPreferencesContext.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../app/account/settings.tsx', import.meta.url), 'utf8');
  assert.match(provider, /\.\.\.currentPreferences\.current, \.\.\.parsed, \.\.\.pending/);
  assert.match(provider, /timeoutMs: 10_000/);
  assert.match(provider, /first\(record\(profile\.user\), \['id'\]\) !== userId/);
  assert.match(provider, /isLoading: Boolean\(token\) && \(!userId \|\| !preferencesLoaded\)/);
  assert.doesNotMatch(provider, /invalidateQueries\(\)|await profileQuery\.refetch/);
  assert.match(provider, /if \(isSaving \|\| isSyncing\) return/);
  assert.match(provider, /if \(!isRunningInExpoGo\(\)\)/);
  const error = settings.indexOf('testID="app-preferences-save-error"');
  assert.ok(error > settings.indexOf('>App preferences</Text>') && error < settings.indexOf('>In-app alert preferences</Text>'));
  assert.match(settings, /title="Retry saving preferences"/);
  assert.match(settings, /reduce-motion-toggle/);
  assert.match(settings, /router\.push\('\/account\/data-preferences'/);
});

test('initialization and an early save await the same account read and apply it once', async () => {
  let finish;
  let reads = 0;
  const applied = [];
  const hydration = createPreferenceHydrator(
    () => { reads += 1; return new Promise(resolve => { finish = resolve; }); },
    (...args) => applied.push(args),
  );
  const initial = hydration.load('42', 'session-a');
  const earlySave = hydration.load('42', 'session-a');
  assert.equal(initial, earlySave);
  await Promise.resolve();
  finish(JSON.stringify({ appearance: 'dark', pendingSync: { language: 'ur' } }));
  await earlySave;
  assert.equal(reads, 1);
  assert.equal(applied.length, 1);
  assert.equal(applied[0][2].preferences.appearance, 'dark');
  assert.equal(applied[0][2].preferences.language, 'ur');
  await hydration.load('42', 'session-a');
  assert.equal(applied.length, 1, 'later selections must not reapply the initial saved snapshot');
});

test('a stalled storage read settles instead of permanently locking all preference controls', async () => {
  let finish;
  const applied = [];
  const hydration = createPreferenceHydrator(
    () => new Promise(resolve => { finish = resolve; }),
    (...args) => applied.push(args),
    5,
  );
  await hydration.load('42', 'session-a');
  assert.equal(applied.length, 1);
  assert.equal(applied[0][2].preferences.appearance, 'light');
  assert.match(applied[0][3], /could not be read/);
  finish(JSON.stringify({ appearance: 'dark' }));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(applied.length, 1, 'a late read cannot reset a newer selection');
});

test('corrupt cached preferences do not prevent initialization from completing', async () => {
  const applied = [];
  const hydration = createPreferenceHydrator(async () => '{bad json', (...args) => applied.push(args));
  await hydration.load('42', 'session-a');
  assert.equal(applied.length, 1);
  assert.deepEqual(applied[0][2].preferences, defaultPreferences);
  assert.ok(applied[0][3]);
});

test('a late initialization result cannot replace the next account preferences', async () => {
  let finishOld;
  const applied = [];
  const hydration = createPreferenceHydrator(
    owner => owner === '42' ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve('{"language":"ar"}'),
    (...args) => applied.push(args),
  );
  const old = hydration.load('42', 'session-a');
  await Promise.resolve();
  hydration.invalidate();
  await hydration.load('43', 'session-b');
  finishOld('{"language":"ur"}');
  await old;
  assert.deepEqual(applied.map(entry => entry[0]), ['43']);
  assert.equal(applied[0][2].preferences.language, 'ar');
});

test('saved-session account IDs are recognized in flat and legacy user envelopes', () => {
  assert.equal(preferenceAccountId({ id: 42 }), '42');
  assert.equal(preferenceAccountId({ user: { id: '00000042' } }), '00000042');
  assert.equal(preferenceAccountId({ data: { id: 42 } }), '42');
  assert.equal(preferenceAccountId({ data: { user: { id: 42 } } }), '42');
  assert.equal(preferenceAccountId({ profile: { id: 99 } }), '', 'profile IDs are not user IDs');
});

test('rapid theme, language and currency selections remain responsive and the last server write wins', async () => {
  const queue = createPreferenceSyncQueue();
  const state = { preferences: defaultPreferences, pending: {}, stored: 0 };
  let revision = 1;
  let release;
  const firstResponse = new Promise(resolve => { release = resolve; });
  const sent = [];
  const save = (patch, ownRevision) => persistPreferences({
    current: state.preferences, pending: state.pending, patch,
    isCurrent: () => ownRevision === revision,
    apply: (preferences, pending) => { state.preferences = preferences; state.pending = pending; },
    store: async () => {},
    stored: () => { state.stored += 1; },
    sync: preferences => queue(() => ownRevision === revision, async () => {
      sent.push(preferences);
      if (ownRevision === 1) await firstResponse;
      return { data: { preferences: { ...defaultPreferences, ...preferences } } };
    }),
    confirmed: async () => {},
  });
  const dark = save({ appearance: 'dark' }, 1);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(state.stored, 1, 'local saving finishes before the server replies');
  revision = 2;
  const urdu = save({ language: 'ur' }, 2);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  revision = 3;
  const currency = save({ currency: 'PKR' }, 3);
  assert.equal(state.preferences.appearance, 'dark');
  assert.equal(state.preferences.language, 'ur');
  assert.equal(state.preferences.currency, 'PKR');
  release();
  await Promise.all([dark, urdu, currency]);
  assert.equal(sent.length, 2, 'superseded waiting selections are coalesced');
  assert.deepEqual(sent.at(-1), { appearance: 'dark', language: 'ur', currency: 'PKR', theme: 'dark' });
  assert.deepEqual(state.pending, {});
  assert.equal(state.preferences.language, 'ur', 'old responses cannot reset the last choice');
});

test('settings no longer reject selections using the stale readiness ref or block on account sync', () => {
  const provider = readFileSync(new URL('../context/AppPreferencesContext.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../app/account/settings.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(provider, /loadedAccount|Wait for your account preferences to load before saving/);
  assert.match(provider, /await hydration\.load\(userId, activeSession\)/);
  assert.match(provider, /queueSync\(isCurrent/);
  assert.match(provider, /stored:.*setIsSaving\(false\)/);
  assert.match(provider, /getInvestorProfile\(\{ timeoutMs: 8000 \}\)/);
  assert.match(settings, /testID="app-preferences-syncing"/);
  assert.match(settings, /title="Retry loading preferences"/);
  assert.doesNotMatch(settings, /disabled=\{appPreferences\.isSyncing/);
});
