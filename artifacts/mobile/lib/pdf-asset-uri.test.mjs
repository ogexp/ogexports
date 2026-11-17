import assert from 'node:assert/strict';
import test from 'node:test';
import { absolutePdfAssetUri } from './pdf-asset-uri.ts';

test('keeps absolute asset URLs usable by the native PDF renderer', () => {
  assert.equal(absolutePdfAssetUri('file:///data/user/0/app/logo.png'), 'file:///data/user/0/app/logo.png');
  assert.equal(absolutePdfAssetUri('https://cdn.example.test/logo.png'), 'https://cdn.example.test/logo.png');
});

test('converts absolute Android file paths to file URIs and skips relative paths', () => {
  assert.equal(absolutePdfAssetUri('assets/logo.png', '/data/user/0/app/logo.png'), 'file:///data/user/0/app/logo.png');
  assert.equal(absolutePdfAssetUri('assets/logo.png'), null);
});

test('rejects URI schemes that still contain a relative file path', () => {
  assert.equal(absolutePdfAssetUri('file:assets/logo.png'), null);
  assert.equal(absolutePdfAssetUri('file://assets/logo.png'), null);
  assert.equal(absolutePdfAssetUri('https:cdn.example.test/logo.png'), null);
});

test('accepts absolute file, content, HTTP, and embedded image URIs', () => {
  assert.equal(absolutePdfAssetUri('file:/data/user/0/app/logo.png'), 'file:/data/user/0/app/logo.png');
  assert.equal(absolutePdfAssetUri('file:///data/user/0/app/logo.png'), 'file:///data/user/0/app/logo.png');
  assert.equal(absolutePdfAssetUri('content://com.example.documents/logo.png'), 'content://com.example.documents/logo.png');
  assert.equal(absolutePdfAssetUri('https://cdn.example.test/logo.png'), 'https://cdn.example.test/logo.png');
  assert.equal(absolutePdfAssetUri('data:image/png;base64,abc123'), 'data:image/png;base64,abc123');
});
