export type Json = Record<string, unknown>;

export function record(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}

export function unwrap(value: unknown): Json {
  const outer = record(value);
  return record(outer.data ?? outer);
}

export function list(value: unknown): Json[] {
  if (Array.isArray(value)) return value.map(record);
  const outer = record(value);
  const data = outer.data;
  if (Array.isArray(data)) return data.map(record);
  const nested = record(data);
  for (const candidate of [nested.data, outer.items, outer.results, outer.rows, outer.steps, outer.history]) {
    if (Array.isArray(candidate)) return candidate.map(record);
  }
  return [];
}

export function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

export function first(row: Json, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return fallback;
}

export function amount(row: Json, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function money(value: unknown, currency?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  const code = currency?.trim().toUpperCase();
  if (!code) return '—';
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(numeric);
  } catch {
    return `${code} ${numeric.toLocaleString()}`;
  }
}

export function messageOf(error: unknown): string {
  const source = record(error);
  const payload = record(source.data);
  const errors = record(payload.errors);
  const firstError = Object.values(errors).flatMap((item) => Array.isArray(item) ? item : [item])[0];
  return text(firstError, text(payload.message, text(source.message, 'Something went wrong. Please try again.')));
}