export function absolutePdfAssetUri(...sources: Array<string | null | undefined>): string | null {
  for (const source of sources) {
    const value = source?.trim() ?? '';
    if (!value) continue;

    if (/^(?:https?:|file:|content:|data:)/i.test(value)) return value;
    if (value.startsWith('/')) return `file://${value}`;
  }

  return null;
}
