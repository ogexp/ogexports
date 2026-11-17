import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settings = readFileSync(new URL('../app/account/settings.tsx', import.meta.url), 'utf8');
const authContext = readFileSync(new URL('../context/AuthContext.tsx', import.meta.url), 'utf8');
const apiConfig = readFileSync(new URL('./api-config.ts', import.meta.url), 'utf8');

test('investor settings do not expose or let users change the API server address', () => {
  assert.doesNotMatch(settings, /Investor API server|Server address|Save server address|updateOrigin/);
  assert.doesNotMatch(authContext, /updateOrigin|saveApiOrigin/);
  assert.match(apiConfig, /EXPO_PUBLIC_API_BASE_URL/);
});
