import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { brandedPdfHtml } from './pdf-html';
import { officialPdfLogoDataUri } from './pdf-logo';
export { brandedPdfHtml } from './pdf-html';

export async function saveHtmlAsPdf(sourceHtml: string, filename: string, title: string): Promise<void> {
  const html = brandedPdfHtml(sourceHtml, title, officialPdfLogoDataUri);
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
