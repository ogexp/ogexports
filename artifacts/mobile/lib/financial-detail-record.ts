export function findFinancialDetailRecord(
  records: readonly Record<string, unknown>[],
  id: string,
  idFields: readonly string[],
): Record<string, unknown> | undefined {
  const expectedId = id.trim();
  if (!expectedId) return undefined;
  return records.find(item => idFields.some(field => {
    const value = item[field];
    return (typeof value === 'string' || typeof value === 'number')
      && String(value).trim() === expectedId;
  }));
}
