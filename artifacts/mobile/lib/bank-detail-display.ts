export function formatIbanForDisplay(value: string): string {
  const compact = value.replace(/\s+/g, '');
  return compact.replace(/(.{4})/g, '$1 ').trim();
}
