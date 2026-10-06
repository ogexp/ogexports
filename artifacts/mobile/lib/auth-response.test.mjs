import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuthResponse, readTwoFactorLoginChallenge } from './auth-response.ts';

test('recognizes the direct two-factor login response', () => {
  assert.deepEqual(
    readTwoFactorLoginChallenge({
      requires_2fa: true,
      email: 'investor@example.com',
      message: 'A sign-in code was sent.',
    }),
    {
      email: 'investor@example.com',
      message: 'A sign-in code was sent.',
    },
  );
});

test('recognizes a two-factor challenge inside the API data envelope', () => {
  assert.deepEqual(
    readTwoFactorLoginChallenge({
      data: {
        requires_2fa: true,
        email: ' investor@example.com ',
        message: 'A sign-in code was sent.',
      },
    }),
    {
      email: 'investor@example.com',
      message: 'A sign-in code was sent.',
    },
  );
});

test('unwraps either direct or enveloped session responses', () => {
  const session = { token: 'session-token', user: { id: 'investor-1' } };
  assert.deepEqual(normalizeAuthResponse(session), session);
  assert.deepEqual(normalizeAuthResponse({ data: session }), session);
});

test('does not treat incomplete or non-2FA responses as a challenge', () => {
  assert.equal(readTwoFactorLoginChallenge({ requires_2fa: false, email: 'investor@example.com' }), null);
  assert.equal(readTwoFactorLoginChallenge({ data: { requires_2fa: true, email: '' } }), null);
});
