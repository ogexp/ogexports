import assert from 'node:assert/strict';
import test from 'node:test';
import { brandedPdfHtml } from './pdf-html.ts';

test('branded PDF preserves report rows and embeds the official OG Exports logo', () => {
  const html = brandedPdfHtml(
    '<html><head><style>.report{color:green}</style></head><body><table><tr><td>Deposit ID</td><td>10000042</td></tr></table></body></html>',
    'Deposit receipt',
    'data:image/png;base64,logo-data',
  );
  assert.match(html, /data:image\/png;base64,logo-data/);
  assert.equal((html.match(/src="data:image\/png;base64,logo-data"/g) ?? []).length, 2);
  assert.match(html, /class="og-pdf-watermark" aria-hidden="true"/);
  assert.match(html, /\.og-pdf-watermark\{position:fixed;inset:0;z-index:0;display:flex;align-items:center;justify-content:center;pointer-events:none\}/);
  assert.match(html, /\.og-pdf-watermark img\{[^}]*opacity:\.065\}/);
  assert.match(html, /\.og-pdf\{position:relative;z-index:1/);
  assert.match(html, /OG Exports · Global Trade\. Digital Investment\./);
  assert.match(html, /@page\{size:A4/);
  assert.match(html, /Deposit ID/);
  assert.match(html, /10000042/);
  assert.match(html, /\.report\{color:green\}/);
});

test('branded PDF escapes the title and removes executable HTML', () => {
  const html = brandedPdfHtml(
    '<body><p onclick="run()">Safe</p><script>bad()</script></body>',
    '<Receipt>',
    'logo.png',
  );
  assert.match(html, /&lt;Receipt&gt;/);
  assert.doesNotMatch(html, /<script|onclick=/i);
  assert.ok(html.includes('<p>Safe</p>'));
});
