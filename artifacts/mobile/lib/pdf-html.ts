function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function brandedPdfHtml(sourceHtml: string, title: string, logoUri: string): string {
  const head = sourceHtml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const rawBody = sourceHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? sourceHtml;
  const body = rawBody
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  const existingStyles = [...head.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(match => match[1]).join('\n');
  const generatedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title><style>
    ${existingStyles}
    @page{size:A4;margin:16mm 14mm}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;color:#153328;background:#fff;font:12px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
    .og-pdf{max-width:800px;margin:0 auto}
    .og-pdf-brand{display:flex;align-items:center;gap:14px;padding:0 0 16px;border-bottom:2px solid #17784f;margin-bottom:22px}
    .og-pdf-brand img{width:70px;height:70px;object-fit:contain}
    .og-pdf-kicker{color:#17784f;font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase}
    .og-pdf-brand h1{font-size:22px;line-height:1.25;margin:4px 0;color:#143a2b}
    .og-pdf-brand p{margin:0;color:#62746b;font-size:10px}
    .og-pdf-content{overflow-wrap:anywhere}
    table{width:100%;border-collapse:collapse}
    th,td{padding:9px 8px;border-bottom:1px solid #e5ede8;text-align:left;vertical-align:top}
    th{color:#61746a;font-weight:600}
    td{color:#173b2c}
    .og-pdf-footer{border-top:1px solid #dce7e0;margin-top:24px;padding-top:10px;color:#6e7d75;font-size:9px}
    tr,.receipt-card,.section{break-inside:avoid;page-break-inside:avoid}
    </style></head><body><main class="og-pdf">
    <header class="og-pdf-brand"><img src="${escapeHtml(logoUri)}" alt="OG Exports logo"><div>
      <div class="og-pdf-kicker">Official investor document</div><h1>${escapeHtml(title)}</h1>
      <p>OG Exports · Global Trade. Digital Investment.</p>
    </div></header>
    <section class="og-pdf-content">${body}</section>
    <footer class="og-pdf-footer">Generated ${escapeHtml(generatedAt)} from OG Exports investor records. This document reflects the information available in your account when it was created.</footer>
    </main></body></html>`;
}
