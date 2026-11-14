import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  ApiRequestTimeoutError,
  customFetch,
  setAuthTokenGetter,
} from '../../../lib/api-client-react/src/custom-fetch.ts';

test('auth deadlines settle even when a native fetch ignores abort, without retrying', async t => {
  let signal;
  const mock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  await assert.rejects(customFetch('/api/auth/mobile/login', { timeoutMs: 20 }), ApiRequestTimeoutError);
  assert.equal(signal.aborted, true);
  assert.equal(mock.mock.callCount(), 1);
});

test('auth deadline includes reading the response body', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => new Promise(() => {}),
    // Native responses may expose no ReadableStream body property.
  }));
  await assert.rejects(customFetch('/api/auth/register', { timeoutMs: 20, responseType: 'json' }), ApiRequestTimeoutError);
});

test('normal native JSON auth responses still return the complete session', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.match(options.headers.get('accept'), /application\/json/);
    return {
      ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
      text: async () => JSON.stringify({ token: 'test-session', user: { id: '1' } }),
    };
  });
  assert.deepEqual(await customFetch('/api/auth/mobile/login', { timeoutMs: 1000, responseType: 'json' }), {
    token: 'test-session', user: { id: '1' },
  });
});

test('pending verification and validation responses retain their JSON error details', async t => {
  const payload = { requires_verification: true, email: 'investor@example.com' };
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(payload), {
    status: 403, headers: { 'Content-Type': 'application/json' },
  }));
  await assert.rejects(customFetch('/api/auth/mobile/login', { timeoutMs: 1000, responseType: 'json' }), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.deepEqual(error.data, payload);
    return true;
  });
});

test('caller cancellation is preserved instead of reported as a server timeout', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => new Promise(() => {}));
  const request = customFetch('/api/auth/mobile/login', { timeoutMs: 1000, signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
});

test('auth deadline also bounds an unavailable native secure-token lookup', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  setAuthTokenGetter(() => new Promise(() => {}));
  try {
    await assert.rejects(customFetch('/api/auth/mobile/login', { timeoutMs: 20 }), ApiRequestTimeoutError);
    assert.equal(mock.mock.callCount(), 0);
  } finally {
    setAuthTokenGetter(null);
  }
});
