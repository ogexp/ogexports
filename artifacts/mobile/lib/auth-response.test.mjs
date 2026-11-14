import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTwoFactorVerifyPayload, normalizeAuthResponse, readEmailVerificationChallenge, readTwoFactorLoginChallenge } from './auth-response.ts';

test('recognizes Laravel pending-email verification responses, direct or enveloped', () => {
  for (const flag of ['requires_verification', 'requires_email_verification']) {
    const payload = { [flag]: true, email: ' investor@example.com ', message: 'Please verify your email before signing in.' };
    for (const value of [payload, { data: payload }]) {
      assert.deepEqual(readEmailVerificationChallenge(value), {
        email: 'investor@example.com',
        message: 'Please verify your email before signing in.',
      });
    }
  }
});

test('does not redirect verified accounts or malformed challenges to email verification', () => {
  assert.equal(readEmailVerificationChallenge({ token: 'session-token', user: { id: '1' } }), null);
  assert.equal(readEmailVerificationChallenge({ requires_verification: false, email: 'investor@example.com' }), null);
  assert.equal(readEmailVerificationChallenge({ requires_verification: true, email: ' ' }), null);
});

test('recognizes the direct two-factor login response', () => {
  assert.deepEqual(
    readTwoFactorLoginChallenge({
      requires_2fa: true,
      email: 'investor@example.com',
      message: 'A sign-in code was sent.',
      token: 'temporary-login-challenge',
    }),
    {
      email: 'investor@example.com',
      message: 'A sign-in code was sent.',
      challengeToken: 'temporary-login-challenge',
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
        token: 'wrapped-login-challenge',
      },
    }),
    {
      email: 'investor@example.com',
      message: 'A sign-in code was sent.',
      challengeToken: 'wrapped-login-challenge',
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

test('includes the temporary challenge token with the six-digit verification code', () => {
  assert.deepEqual(
    buildTwoFactorVerifyPayload(
      { email: 'investor@example.com', challengeToken: 'temporary-login-challenge' },
      ' 123456 ',
    ),
    {
      email: 'investor@example.com',
      code: '123456',
      device_name: 'OG Exports mobile',
      token: 'temporary-login-challenge',
    },
  );
});
