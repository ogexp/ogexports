import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const config = require('../metro.config.js');
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const isBlocked = relativePath => config.resolver.blockList.some(pattern =>
  new RegExp(pattern.source, pattern.flags).test(path.join(workspaceRoot, relativePath)),
);

test('Metro ignores generated validation copies and recovery files', () => {
  for (const relativePath of [
    'generated-artifacts',
    'generated-artifacts/sdk58-clean/artifacts/mobile/app/index.tsx',
    '.local/recovery/og-exports-sdk58-original/android-original/app/build.gradle',
    '.local/tasks/mobile.md',
  ]) {
    assert.equal(isBlocked(relativePath), true, relativePath);
  }
});

test('Metro retains app sources and shared workspace packages', () => {
  for (const relativePath of [
    'artifacts/mobile/app/index.tsx',
    'artifacts/mobile/assets/images/og-splash-mark.png',
    'lib/api-client-react/src/index.ts',
    'node_modules/.pnpm/react@19.3.0/node_modules/react/index.js',
    'generated-artifacts-other/index.js',
  ]) {
    assert.equal(isBlocked(relativePath), false, relativePath);
  }
});
