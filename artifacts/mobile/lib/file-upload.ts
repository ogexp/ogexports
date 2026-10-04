import { getSavedToken } from '@/lib/api-config';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

export async function uploadInvestorFile(uri: string, name: string, _mimeType: string, folder: string, origin: string): Promise<string> {
  if (!origin) throw new Error('Set the OG Exports investor server address in Settings before uploading.');
  const token = await getSavedToken();
  if (!token) throw new Error('Sign in again before uploading a document.');
  const body = new FormData();
  body.append('file', new File(uri), name);
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