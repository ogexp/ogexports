import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getLocalTimeGreeting, greetingForLocalHour } from './time-greeting.ts';

const homeSource = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');

test('home greeting follows local morning, afternoon, and evening time ranges', () => {
  for (const hour of [5, 6, 11]) assert.equal(greetingForLocalHour(hour), 'Good morning');
  for (const hour of [12, 13, 16]) assert.equal(greetingForLocalHour(hour), 'Good afternoon');
  for (const hour of [0, 4, 17, 18, 23]) assert.equal(greetingForLocalHour(hour), 'Good evening');
  assert.throws(() => greetingForLocalHour(24), /integer from 0 to 23/);
});

test('home greeting uses the device local hour and refreshes while the screen stays open', () => {
  const localAfternoon = new Date(2026, 10, 17, 13, 0, 0);
  assert.equal(getLocalTimeGreeting(localAfternoon), 'Good afternoon');
  assert.match(homeSource, /useState\(\(\) => getLocalTimeGreeting\(\)\)/);
  assert.match(homeSource, /setInterval\(refreshGreeting, 60_000\)/);
  assert.match(homeSource, /\{timeGreeting\}/);
  assert.doesNotMatch(homeSource, /<Text[^>]*>Good morning<\/Text>/);
});
