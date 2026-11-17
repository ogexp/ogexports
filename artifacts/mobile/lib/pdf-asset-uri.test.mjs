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
