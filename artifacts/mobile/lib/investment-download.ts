export type InvestmentDownloadKind = 'pdf' | 'export';

export type InvestmentDownloadSpec = {
  path: string;
  name: string;
  mimeType: string;
  extension: string;
};

export function investmentDownloadSpec(
  recordId: unknown,
  kind: InvestmentDownloadKind,
): InvestmentDownloadSpec | null {
  const id = typeof recordId === 'number'
    ? Number.isSafeInteger(recordId) && recordId > 0 ? String(recordId) : ''
    : typeof recordId === 'string' && /^[1-9]\d*$/.test(recordId.trim())
      && Number.isSafeInteger(Number(recordId.trim()))
      ? recordId.trim()
      : '';
  if (!id) return null;

  const extension = kind === 'pdf' ? 'pdf' : 'xls';
  return {
    path: `/api/investor/investments/${encodeURIComponent(id)}/${kind}`,
    name: `investment-${id}`,
    mimeType: kind === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
    extension,
  };
}
