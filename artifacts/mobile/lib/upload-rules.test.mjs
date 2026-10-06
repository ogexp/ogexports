import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INVESTOR_DOCUMENT_MIME_TYPES,
  MAX_INVESTOR_UPLOAD_BYTES,
  validateInvestorUploadFileSize,
} from './upload-rules.ts';

test('accepts supported PDF and image document types', () => {
  assert.deepEqual(INVESTOR_DOCUMENT_MIME_TYPES, [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ]);
});

test('allows files up to and including 10 MB', () => {
  assert.equal(validateInvestorUploadFileSize(1), 1);
  assert.equal(validateInvestorUploadFileSize(MAX_INVESTOR_UPLOAD_BYTES), MAX_INVESTOR_UPLOAD_BYTES);
});

test('rejects files larger than 10 MB and files whose size cannot be verified', () => {
  assert.throws(() => validateInvestorUploadFileSize(MAX_INVESTOR_UPLOAD_BYTES + 1), /10 MB or smaller/);
  assert.throws(() => validateInvestorUploadFileSize(0), /size could not be checked/);
  assert.throws(() => validateInvestorUploadFileSize(Number.NaN), /size could not be checked/);
});
