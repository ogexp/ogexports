import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ambientFieldGeometry, canAnimateAmbient } from './ambient-motion-policy.ts';

const activeState = {
  reduceMotion: false,
  motionSettingsReady: true,
  appState: 'active',
  isFocused: true,
  isDocumentVisible: true,
};

test('scrolling backgrounds never allocate content-height SVG colour fields', () => {
  for (const height of [0, 320, 667, 874, 1000, 30000, NaN, Infinity, -10]) {
    const field = ambientFieldGeometry(height);
    assert.ok(Number.isFinite(field.height) && field.height >= 0 && field.height <= 700);
    assert.ok(field.offset <= 0 && field.offset >= -250);
  }
  assert.deepEqual(ambientFieldGeometry(800), { height: 560, offset: -200 });
  const source = readFileSync(new URL('../components/GlassSurface.tsx', import.meta.url), 'utf8');
  assert.match(source, /ambientFieldGeometry\(viewportHeight\)/);
  assert.doesNotMatch(source, /height: '70%'/);
  const home = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
  assert.match(home, /GlassEffectsProvider reflections=\{false\}/, 'the Home feed retains static glass without per-card reflection animations');
});

test('ambient motion runs only with known preferences on an active visible screen', () => {
  for (const appState of ['active', 'inactive', 'background', 'unknown', 'extension', null]) {
    for (const reduceMotion of [true, false]) {
      for (const motionSettingsReady of [true, false]) {
        for (const isFocused of [true, false]) {
          for (const isDocumentVisible of [true, false]) {
            const state = { appState, reduceMotion, motionSettingsReady, isFocused, isDocumentVisible };
            const expected = appState === 'active' && !reduceMotion && motionSettingsReady && isFocused && isDocumentVisible;
            assert.equal(canAnimateAmbient(state), expected, JSON.stringify(state));
          }
        }
      }
    }
  }
});

test('ambient motion pauses and can resume without changing account or screen state', () => {
  assert.equal(canAnimateAmbient(activeState), true);
  for (const pausedState of [
    { reduceMotion: true }, { motionSettingsReady: false },
    { appState: 'background' }, { appState: null }, { isFocused: false },
    { isDocumentVisible: false },
  ]) {
    assert.equal(canAnimateAmbient({ ...activeState, ...pausedState }), false);
    assert.equal(canAnimateAmbient(activeState), true);
  }
  assert.deepEqual(activeState, {
    reduceMotion: false, motionSettingsReady: true, appState: 'active',
    isFocused: true, isDocumentVisible: true,
  });
});

test('decorative animations never hold list-rendering interactions and clean up listeners', () => {
  const source = readFileSync(new URL('../components/GlassSurface.tsx', import.meta.url), 'utf8');
  const timings = [...source.matchAll(/Animated\.timing\([\s\S]*?\}\)/g)];
  assert.ok(timings.length >= 3, 'card reflection, field fade and drift timing configurations exist');
  for (const [timing] of timings) {
    assert.match(timing, /isInteraction:\s*false/);
    assert.match(timing, /useNativeDriver:\s*nativeDriver/);
  }
  assert.equal([...source.matchAll(/resetBeforeIteration:\s*false/g)].length, 2, 'both drifting fields resume without resetting');
  assert.match(source, /sub\.remove\(\)/);
  assert.match(source, /removeEventListener\('visibilitychange', onVis\)/);
  assert.match(source, /return \(\) => \{ loopA\.stop\(\); loopB\.stop\(\); \}/);
  assert.doesNotMatch(source, /setInterval|requestAnimationFrame/);
});

test('recovery popup glass stays static when the motion provider is unavailable', () => {
  const source = readFileSync(new URL('../components/GlassSurface.tsx', import.meta.url), 'utf8');
  const glass = source.slice(source.indexOf('export function GlassLayers'), source.indexOf('export function BrandBackdrop'));
  assert.match(glass, /useOptionalMotion\(\)/);
  assert.match(glass, /motion\?\.motionSettingsReady/);
  assert.doesNotMatch(glass, /const .* = useMotion\(\)/);
});
