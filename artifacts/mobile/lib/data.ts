export type Json = Record<string, unknown>;

type MoneyDisplayCurrency = 'USD' | 'PKR' | 'EUR' | 'GBP';
type MoneyDisplayConfig = {
  language: 'en' | 'ur' | 'ar';
  currency: MoneyDisplayCurrency;
  rates: Record<string, number>;
  conversionUnavailableLabel?: string;
};

let moneyDisplayConfig: MoneyDisplayConfig = {
  language: 'en',
  currency: 'USD',
  rates: {},
};

export function configureMoneyDisplay(config: MoneyDisplayConfig) {
  moneyDisplayConfig = config;
}

function convertForDisplay(value: number, sourceCode: string, targetCode: string): number | null {
  if (sourceCode === targetCode) return value;
  const sourceRate = moneyDisplayConfig.rates[sourceCode];
  const targetRate = moneyDisplayConfig.rates[targetCode];
  if (!Number.isFinite(sourceRate) || !Number.isFinite(targetRate) || sourceRate <= 0 || targetRate <= 0) return null;
  const converted = value / sourceRate * targetRate;
  return Number.isFinite(converted) ? converted : null;
}

export function convertAmountToCurrency(value: unknown, sourceCurrency?: string, targetCurrency?: string): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  const sourceCode = sourceCurrency?.trim().toUpperCase() ?? '';
  const targetCode = targetCurrency?.trim().toUpperCase() ?? '';
  if (!Number.isFinite(parsed) || !/^[A-Z]{3}$/.test(sourceCode) || !/^[A-Z]{3}$/.test(targetCode)) return null;
  return convertForDisplay(parsed, sourceCode, targetCode);
}

export function moneyToCurrency(value: unknown, sourceCurrency: string | undefined, targetCurrency: string): string {
  return money(value, sourceCurrency, { targetCurrency });
}

export function displayCurrencyCode(currency?: string): string {
  const sourceCode = currency?.trim().toUpperCase() ?? '';
  if (!/^[A-Z]{3}$/.test(sourceCode)) return '';
  const targetCode = moneyDisplayConfig.currency;
  return convertForDisplay(1, sourceCode, targetCode) == null ? sourceCode : targetCode;
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

export function availableBalanceFromDashboard(value: unknown): number | null {
  const dashboard = unwrap(value);
  const wallet = record(dashboard.wallet);
  const summary = record(dashboard.summary);
  return amount(summary, ['available_balance']) ?? amount(wallet, ['available_balance']);
}

export function walletCurrencyFromDashboard(value: unknown, fallback = 'USD'): string {
  const dashboard = unwrap(value);
  const wallet = record(dashboard.wallet);
  const fallbackCurrency = fallback.trim().toUpperCase();
  const currency = first(
    wallet,
    ['currency', 'default_currency'],
    first(dashboard, ['wallet_currency'], fallbackCurrency),
  ).toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) return currency;
  return /^[A-Z]{3}$/.test(fallbackCurrency) ? fallbackCurrency : '';
}

export function walletCurrencyFromSources(walletValue: unknown, dashboardValue: unknown, fallback = 'USD'): string {
  const wallet = unwrap(walletValue);
  const walletCurrency = first(wallet, ['currency', 'default_currency']).toUpperCase();
  if (/^[A-Z]{3}$/.test(walletCurrency)) return walletCurrency;
  return walletCurrencyFromDashboard(dashboardValue, fallback);
}

export function money(value: unknown, currency?: string, options: { preserveSource?: boolean; targetCurrency?: string } = {}): string {
  const missingValue = value === null || value === undefined || value === '';
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  const numeric = Number.isFinite(parsed) ? parsed : 0;
  const sourceCandidate = currency?.trim().toUpperCase();
  const providedSourceCode = sourceCandidate && /^[A-Z]{3}$/.test(sourceCandidate) ? sourceCandidate : undefined;
  const sourceCode = missingValue || !Number.isFinite(parsed) ? 'USD' : providedSourceCode || 'USD';
  const requestedTarget = options.targetCurrency?.trim().toUpperCase();
  const targetCode = options.preserveSource
    ? sourceCode
    : requestedTarget && /^[A-Z]{3}$/.test(requestedTarget)
      ? requestedTarget
      : moneyDisplayConfig.currency;
  const converted = convertForDisplay(numeric, sourceCode, targetCode);
  const conversionUnavailable = converted == null && sourceCode !== targetCode;
  const displayCode = converted == null ? sourceCode : targetCode;
  const displayAmount = converted == null ? numeric : converted;
  const locale = moneyDisplayConfig.language === 'ur' ? 'ur-PK' : moneyDisplayConfig.language === 'ar' ? 'ar-SA' : 'en-US';
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: displayCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(displayAmount);
  } catch {
    formatted = `${displayCode} ${displayAmount.toLocaleString(locale)}`;
  }
  return conversionUnavailable
    ? `${formatted} · ${moneyDisplayConfig.conversionUnavailableLabel || 'Currency conversion unavailable'}`
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