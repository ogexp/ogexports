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
