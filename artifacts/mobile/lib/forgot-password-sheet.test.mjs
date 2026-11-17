import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('forgot password opens as a native bottom sheet over sign in', () => {
  const rootLayout = source('../app/_layout.tsx');
  const login = source('../app/(auth)/login.tsx');
  const publicRoute = source('../app/forgot-password.tsx');

  assert.match(login, /router\.push\('\/forgot-password'\)/);
  assert.match(rootLayout, /publicSegments = new Set\(\[[^\]]*'forgot-password'/);
  assert.match(rootLayout, /name="forgot-password" options=\{\{[\s\S]*?presentation: 'formSheet'[\s\S]*?sheetAllowedDetents: \[0\.82, 1\]/);
  assert.match(rootLayout, /sheetGrabberVisible: true/);
  assert.match(publicRoute, /export \{ default \} from '\.\//);
});

test('email and OTP inputs remain in the same secure recovery flow', () => {
  const recovery = source('../app/(auth)/forgot-password.tsx');

  assert.match(recovery, /request\.mutateAsync\(\{ data: \{ email \} \}\)/);
  assert.match(recovery, /verify\.mutateAsync\(\{ data: \{ email, code \} \}\)/);
  assert.match(recovery, /forgot-password-send-code/);
  assert.match(recovery, /forgot-password-verify-code/);
  assert.match(recovery, /forgot-password-close/);
});
