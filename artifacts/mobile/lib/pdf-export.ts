import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { brandedPdfHtml } from './pdf-html';

const officialLogo = require('../assets/images/og-logo.png');
let cachedLogoDataUri: string | null = null;
export { brandedPdfHtml } from './pdf-html';

async function logoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const asset = Asset.fromModule(officialLogo);
  await asset.downloadAsync();
  if (Platform.OS === 'web') {
    cachedLogoDataUri = asset.uri;
    return asset.uri;
  }
  if (!asset.localUri) throw new Error('The official OG Exports logo could not be loaded.');
  cachedLogoDataUri = `data:image/png;base64,${await new File(asset.localUri).base64()}`;
  return cachedLogoDataUri;
}

export async function saveHtmlAsPdf(sourceHtml: string, filename: string, title: string): Promise<void> {
  const html = brandedPdfHtml(sourceHtml, title, await logoDataUri());
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('PDF sharing is not available on this device.');
  const result = await Print.printToFileAsync({ html });
  const safeName = filename.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').slice(0, 70) || 'og-exports-document';
  const output = new File(Paths.cache, `${safeName}.pdf`);
  await new File(result.uri).copy(output, { overwrite: true });
  await Sharing.shareAsync(output.uri, {
    mimeType: 'application/pdf',
    dialogTitle: title,
    UTI: 'com.adobe.pdf',
  });
}
