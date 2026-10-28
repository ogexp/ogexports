import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { absoluteFileUri } from './absolute-file-uri';
import { brandedPdfHtml } from './pdf-html';

const officialLogo = require('../assets/images/og-logo.png');
let cachedLogoDataUri: string | null = null;
let logoResolved = false;
export { brandedPdfHtml } from './pdf-html';

async function logoDataUri(): Promise<string> {
  if (logoResolved) return cachedLogoDataUri ?? '';
  const asset = Asset.fromModule(officialLogo);
  try {
    await asset.downloadAsync();
    if (Platform.OS === 'web') {
      cachedLogoDataUri = asset.uri;
      logoResolved = true;
      return asset.uri;
    }

    for (const uri of [asset.localUri, asset.uri]) {
      if (!uri) continue;
      try {
        const logoFile = new File(absoluteFileUri(uri));
        cachedLogoDataUri = `data:image/png;base64,${await logoFile.base64()}`;
        logoResolved = true;
        return cachedLogoDataUri;
      } catch {
        // The logo is optional; Android bundled-asset URIs vary by build type.
      }
    }
  } catch {
    // Receipt generation should not fail when the optional brand asset is unavailable.
  }

  cachedLogoDataUri = '';
  logoResolved = true;
  return '';
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
  await new File(absoluteFileUri(result.uri)).copy(output, { overwrite: true });
  await Sharing.shareAsync(output.uri, {
    mimeType: 'application/pdf',
    dialogTitle: title,
    UTI: 'com.adobe.pdf',
  });
}
