import assert from 'node:assert/strict';
import test from 'node:test';
import { absoluteFileUri } from './absolute-file-uri.ts';

test('keeps an absolute file URI unchanged', () => {
  assert.equal(absoluteFileUri('file:///data/user/0/app/logo.png'), 'file:///data/user/0/app/logo.png');
});

test('converts an absolute Android filesystem path to a file URI', () => {
  assert.equal(absoluteFileUri('/data/user/0/app/cache/logo.png'), 'file:///data/user/0/app/cache/logo.png');
});

test('normalizes a single-slash file URI', () => {
  assert.equal(absoluteFileUri('file:/data/user/0/app/cache/logo.png'), 'file:///data/user/0/app/cache/logo.png');
});

test('rejects a relative path with a useful error', () => {
  assert.throws(() => absoluteFileUri('cache/logo.png'), /not an absolute local URI/);
});
