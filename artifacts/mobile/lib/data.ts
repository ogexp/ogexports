import { translateUi } from '@/lib/strings';

export type Json = Record<string, unknown>;

type MoneyDisplayCurrency = 'wallet' | 'USD' | 'PKR' | 'EUR' | 'GBP';
type MoneyDisplayConfig = {
  language: 'en' | 'ur' | 'ar';
  currency: MoneyDisplayCurrency;
  walletCurrency: string;
  rates: Record<string, number>;
};

let moneyDisplayConfig: MoneyDisplayConfig = {
  language: 'en',
  currency: 'wallet',
  walletCurrency: '',
  rates: {},
};

export function configureMoneyDisplay(config: MoneyDisplayConfig) {
  moneyDisplayConfig = config;
}

export function displayCurrencyCode(currency?: string): string {
  const sourceCode = currency?.trim().toUpperCase();
  if (!sourceCode) return '';
  const target = moneyDisplayConfig.currency === 'wallet'
    ? moneyDisplayConfig.walletCurrency
    : moneyDisplayConfig.currency;
  if (!target || target === sourceCode) return sourceCode;
  const sourceRate = moneyDisplayConfig.rates[sourceCode];
  const targetRate = moneyDisplayConfig.rates[target];
  return sourceRate && targetRate && Number.isFinite(sourceRate) && Number.isFinite(targetRate)
    ? target
    : sourceCode;
}

export function record(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}

function neutralizeMissingCopy(value: string): string {
  return /\bnot\s+(?:reported|provided)\b/i.test(value) ? '—' : value;
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
  if (typeof value === 'string' && value.trim()) return neutralizeMissingCopy(value.trim());
  if (typeof value === 'number') return String(value);
  return neutralizeMissingCopy(fallback);
}

export function first(row: Json, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return neutralizeMissingCopy(fallback);
}

export function amount(row: Json, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function money(value: unknown, currency?: string, options: { preserveSource?: boolean } = {}): string {
  if (value === null || value === undefined || value === '') return '0.00 USD';
  const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return '0.00 USD';
  const sourceCandidate = currency?.trim().toUpperCase();
  const providedSourceCode = sourceCandidate && /^[A-Z]{3}$/.test(sourceCandidate) ? sourceCandidate : undefined;
  const sourceCode = providedSourceCode || 'USD';
  const preserveSource = options.preserveSource || !providedSourceCode;
  let amount = numeric;
  let displayCode = sourceCode;
  const targetCandidate = preserveSource
    ? sourceCode
    : moneyDisplayConfig.currency === 'wallet'
      ? moneyDisplayConfig.walletCurrency
      : moneyDisplayConfig.currency;
  const targetCode = /^[A-Z]{3}$/.test(targetCandidate.trim().toUpperCase())
    ? targetCandidate.trim().toUpperCase()
    : '';
  const target = targetCode || sourceCode;
  let conversionUnavailable = !preserveSource && !targetCode;
  if (target && target !== sourceCode) {
    const sourceRate = moneyDisplayConfig.rates[sourceCode];
    const targetRate = moneyDisplayConfig.rates[target];
    if (sourceRate && targetRate && Number.isFinite(sourceRate) && Number.isFinite(targetRate)) {
      amount = numeric / sourceRate * targetRate;
      displayCode = target;
    } else {
      conversionUnavailable = true;
    }
  }
  const locale = moneyDisplayConfig.language === 'ur' ? 'ur-PK' : moneyDisplayConfig.language === 'ar' ? 'ar-SA' : 'en-US';
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: displayCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    formatted = `${displayCode} ${amount.toLocaleString(locale)}`;
  }
  return conversionUnavailable
    ? `${formatted} · ${translateUi('Currency conversion unavailable', moneyDisplayConfig.language)}`
    : formatted;
}

export function moneyInSourceCurrency(value: unknown, currency?: string): string {
  return money(value, currency, { preserveSource: true });
}

export function messageOf(error: unknown): string {
  const source = record(error);
  const payload = record(source.data);
  const errors = record(payload.errors);
  const firstError = Object.values(errors).flatMap((item) => Array.isArray(item) ? item : [item])[0];
  return text(firstError, text(payload.message, text(source.message, 'Something went wrong. Please try again.')));
}