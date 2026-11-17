export function absolutePdfAssetUri(...sources: Array<string | null | undefined>): string | null {
  for (const source of sources) {
    const value = source?.trim() ?? '';
    if (!value) continue;

    if (/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(value)) return value;
    if (/^file:\/\/(?:localhost)?\/[^/\s][^\s]*$/i.test(value)) return value;
    if (/^file:\/(?!\/)[^\s]+$/i.test(value)) return value;
    if (/^content:\/\/[^/\s]+\/[^\s]+$/i.test(value)) return value;
    if (/^data:[^,\s]+,[\s\S]*$/i.test(value)) return value;
    if (value.startsWith('/') && !value.startsWith('//')) return `file://${value}`;
  }

  return null;
}
