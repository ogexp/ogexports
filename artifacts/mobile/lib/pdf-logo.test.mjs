import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { brandedPdfHtml } from './pdf-html.ts';
import { officialPdfLogoDataUri } from './pdf-logo.ts';

test('receipt PDFs embed the official OG logo as a self-contained vector', () => {
  assert.match(officialPdfLogoDataUri, /^data:image\/svg\+xml;charset=utf-8,/);
  const svg = decodeURIComponent(officialPdfLogoDataUri.split(',').slice(1).join(','));
  assert.match(svg, /<use href="#og-g-outline"\/>/);
  assert.match(svg, /<use href="#og-g"\/>/);
  assert.match(svg, /stroke="url\(#og-metal\)"/);
  assert.doesNotMatch(svg, /<rect[^>]+fill="url\(#bg\)"/);

  const html = brandedPdfHtml('<body>Receipt details</body>', 'Receipt', officialPdfLogoDataUri);
  assert.ok(html.includes(`<img src="${officialPdfLogoDataUri}" alt="OG Exports logo">`));
  assert.ok(html.includes('Receipt details'));

  const exporter = readFileSync(new URL('./pdf-export.ts', import.meta.url), 'utf8');
  assert.match(exporter, /officialPdfLogoDataUri/);
  assert.doesNotMatch(exporter, /Asset\.fromModule|absolutePdfAssetUri/);
});
