export function resolveTransactionDisplayId(
  transactionId: unknown,
  recordId: unknown,
  reference: unknown,
  unavailable = '—',
): string {
  for (const candidate of [transactionId, recordId, reference]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  }

  return unavailable;
}
