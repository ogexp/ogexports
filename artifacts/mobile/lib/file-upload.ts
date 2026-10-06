import { getSavedToken } from '@/lib/api-config';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { validateInvestorUploadFileSize } from './upload-rules';

function checkedFile(uri: string): File {
  const file = new File(uri);
  if (!file.exists) {
    throw new Error('The selected file could not be read. Choose another file.');
  }
  validateInvestorUploadFileSize(file.size);
  return file;
}

export function getInvestorUploadFileSize(uri: string): number {
  return checkedFile(uri).size;
}

export async function uploadInvestorFile(uri: string, name: string, _mimeType: string, folder: string, origin: string): Promise<string> {
  if (!origin) throw new Error('Set the OG Exports investor server address in Settings before uploading.');
  const token = await getSavedToken();
  if (!token) throw new Error('Sign in again before uploading a document.');
  const body = new FormData();
  body.append('file', checkedFile(uri), name);
  body.append('folder', folder);
  const response = await fetch(`${origin.replace(/\/+$/, '')}/api/uploads`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : 'The file could not be uploaded.');
  const data = result.data && typeof result.data === 'object' ? result.data as Record<string, unknown> : result;
  const path = data.path ?? data.file_path ?? data.url;
  if (typeof path !== 'string' || !path) throw new Error('The server did not return an uploaded file path.');
  return path;
}

export async function submitInvestorBankAccountProof(
  uri: string,
  name: string,
  origin: string,
  fields: {
    bank_name: string;
    account_holder: string;
    account_number: string;
    iban: string;
    swift: string;
    branch: string;
    currency: string;
  },
): Promise<Record<string, unknown>> {
  if (!origin) throw new Error('Set the OG Exports investor server address in Settings before uploading.');
  const token = await getSavedToken();
  if (!token) throw new Error('Sign in again before uploading a document.');

  const body = new FormData();
  body.append('file', checkedFile(uri), name);
  Object.entries(fields).forEach(([key, value]) => {
    if (value.trim()) body.append(key, value.trim());
  });

  const response = await fetch(`${origin.replace(/\/+$/, '')}/api/investor/bank-accounts`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const errors = result.errors && typeof result.errors === 'object'
      ? Object.values(result.errors as Record<string, unknown>).flat().find(value => typeof value === 'string')
      : null;
    throw new Error(typeof errors === 'string'
      ? errors
      : typeof result.message === 'string'
        ? result.message
        : 'The bank account proof could not be submitted.');
  }

  return result;
}