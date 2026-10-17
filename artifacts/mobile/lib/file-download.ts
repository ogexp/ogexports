import { File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getSavedToken } from '@/lib/api-config';
import { saveHtmlAsPdf } from '@/lib/pdf-export';

export async function shareInvestorFile(downloadUrl: string, name: string, origin: string, mimeType: string, extension: string, ensurePdf = false) {
  if (!origin) throw new Error('Set the OG Exports investor server address in Settings before downloading.');
  const token = await getSavedToken();
  if (!token) throw new Error('Sign in again before downloading this file.');

  const url = /^https?:\/\//i.test(downloadUrl)
    ? downloadUrl
    : `${origin.replace(/\/+$/, '')}/${downloadUrl.replace(/^\/+/, '')}`;
  const response = await fetch(url, {
    headers: { Accept: mimeType, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'The report could not be downloaded.');
  }

  const contents = new Uint8Array(await response.arrayBuffer());
  if (ensurePdf) {
    const signature = new TextDecoder().decode(contents.slice(0, 5));
    if (signature === '%PDF-') {
      mimeType = 'application/pdf';
      extension = 'pdf';
    } else {
      const text = new TextDecoder().decode(contents).replace(/^\uFEFF/, '').trimStart();
      if (!/^<(?:!doctype|html|head|body|table|div|section|main)\b/i.test(text)) {
        throw new Error('The investment download was not a PDF or printable report.');
      }
      await saveHtmlAsPdf(text, name, name);
      return;
    }
  }
  const safeName = name.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').slice(0, 70) || 'investor-report';
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, `${safeName}.${extension}`);
  file.create({ overwrite: true });
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}