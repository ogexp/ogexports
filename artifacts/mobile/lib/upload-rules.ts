export const MAX_INVESTOR_UPLOAD_BYTES = 10 * 1024 * 1024;

export const INVESTOR_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export function validateInvestorUploadFileSize(size: number): number {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('The selected file size could not be checked. Choose another file.');
  }
  if (size > MAX_INVESTOR_UPLOAD_BYTES) {
    throw new Error('Choose a file that is 10 MB or smaller.');
  }
  return size;
}
