import assert from 'node:assert/strict';
import test from 'node:test';
import { investmentDownloadSpec } from './investment-download.ts';

test('investment PDF uses the converted ID returned by the server', () => {
  assert.deepEqual(investmentDownloadSpec(10000789, 'pdf'), {
    path: '/api/investor/investments/10000789/pdf',
    name: 'investment-10000789',
    mimeType: 'application/pdf',
    extension: 'pdf',
  });
});

test('investment export uses the converted ID returned by the server', () => {
  assert.deepEqual(investmentDownloadSpec('10000789', 'export'), {
    path: '/api/investor/investments/10000789/export',
    name: 'investment-10000789',
    mimeType: 'application/vnd.ms-excel',
    extension: 'xls',
  });
});

test('invalid server record IDs cannot produce an investment download URL', () => {
  assert.equal(investmentDownloadSpec(0, 'pdf'), null);
  assert.equal(investmentDownloadSpec('00789', 'export'), null);
  assert.equal(investmentDownloadSpec('not-an-id', 'pdf'), null);
});
