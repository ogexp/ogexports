import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { defaultPreferences, parsePreferences, persistPreferences, readPreferenceSnapshot } from './app-preferences.ts';

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
  assert.match(provider, /isLoading: !preferencesLoaded \|\| Boolean\(userId && loadedAccount\.current !== userId\)/);
  assert.doesNotMatch(provider, /invalidateQueries\(\)|await profileQuery\.refetch/);
  assert.match(provider, /if \(isSaving\) return/);
  assert.match(provider, /if \(!isRunningInExpoGo\(\)\)/);
  const error = settings.indexOf('testID="app-preferences-save-error"');
  assert.ok(error > settings.indexOf('>App preferences</Text>') && error < settings.indexOf('>In-app alert preferences</Text>'));
  assert.match(settings, /title="Retry saving preferences"/);
  assert.match(settings, /reduce-motion-toggle/);
  assert.match(settings, /router\.push\('\/account\/data-preferences'/);
});
