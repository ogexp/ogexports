import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../app/(tabs)/_layout.tsx', import.meta.url), 'utf8');

test('native tabs stay whole and let the shared scroll controller hide or reveal them', () => {
  assert.match(layout, /hidden=\{!visible\}/);
  assert.match(layout, /minimizeBehavior="never"/);
  assert.doesNotMatch(layout, /minimizeBehavior="onScrollDown"/);
});
