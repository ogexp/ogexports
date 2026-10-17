import * as SecureStore from 'expo-secure-store';

export type FinancialDetailKind = 'deposit' | 'withdrawal';
const rememberedDetails = new Map<string, Record<string, unknown>>();

const fields = [
  'id', 'transaction_id', 'deposit_id', 'depositId', 'withdrawal_id', 'withdraw_id',
  'amount', 'currency', 'amount_currency', 'original_currency', 'wallet_currency',
  'type', 'transaction_type', 'review_status', 'status', 'state',
  'created_at', 'occurred_at', 'date', 'settled_at', 'completed_at',
  'reference', 'transaction_reference', 'deposit_reference', 'payment_reference',
  'bank_reference', 'transfer_reference', 'payment_method', 'method',
  'fee', 'withdrawal_fee', 'fee_currency', 'withdrawal_fee_currency', 'total_debit', 'total_debit_currency',
  'payout_amount', 'payout_amount_usd', 'fee_usd', 'withdrawal_fee_usd', 'total_debit_usd',
  'investor_name', 'account_holder_name', 'customer_name', 'description', 'title', 'name',
  'trade_reference', 'trade_id', 'project_reference', 'project_name',
  'container_number', 'container_no', 'container_code', 'investment_id',
] as const;

const nestedFields: Record<string, readonly string[]> = {
  meta: [
    'investment_id', 'trade_id', 'trade_reference', 'project_reference',
    'currency', 'wallet_currency', 'payment_method', 'method',
  ],
  withdrawal_breakdown: [
    'payout_amount', 'payout_amount_usd', 'fee', 'fee_usd', 'withdrawal_fee',
    'withdrawal_fee_usd', 'total_debit', 'total_debit_usd', 'exchange_rate',
    'currency', 'wallet_currency', 'fee_currency', 'withdrawal_fee_currency',
    'payment_method', 'method',
  ],
  bank_details: ['payment_method', 'method'],
  project: ['id', 'reference', 'trade_reference', 'trade_id', 'project_name', 'name', 'title', 'commodity'],
  trade: ['id', 'reference', 'trade_reference', 'trade_id', 'project_name', 'name', 'title', 'commodity', 'container_number', 'container_no', 'container_code'],
};

function compactFields(source: unknown, allowed: readonly string[]): Record<string, string | number | boolean> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const values = source as Record<string, unknown>;
  const result: Record<string, string | number | boolean> = {};
  for (const key of allowed) {
    const value = values[key];
    if (typeof value === 'string' && value.trim()) result[key] = value.trim().slice(0, 180);
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'boolean') result[key] = value;
  }
  return result;
}

function cacheKey(userId: string, kind: FinancialDetailKind, id: string): string {
  const account = userId.replace(/[^a-z0-9_-]/gi, '').slice(0, 48);
  const recordId = id.replace(/[^a-z0-9_-]/gi, '').slice(0, 48);
  if (!account || !recordId) throw new Error('A valid account and transaction ID are required to save transaction details.');
  return `og-financial-detail:${account}:${kind}:${recordId}`;
}

function createSnapshot(source: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = compactFields(source, fields);
  for (const [key, allowed] of Object.entries(nestedFields)) {
    const nested = compactFields(source[key], allowed);
    if (Object.keys(nested).length) snapshot[key] = nested;
  }
  return snapshot;
}

export function rememberFinancialDetail(
  userId: string,
  kind: FinancialDetailKind,
  id: string,
  source: Record<string, unknown>,
): void {
  try {
    rememberedDetails.set(cacheKey(userId, kind, id), createSnapshot(source));
  } catch {
    // The detail screen can still fetch the server record if no local scope is available.
  }
}

export function getRememberedFinancialDetail(
  userId: string,
  kind: FinancialDetailKind,
  id: string,
): Record<string, unknown> | null {
  try {
    return rememberedDetails.get(cacheKey(userId, kind, id)) ?? null;
  } catch {
    return null;
  }
}

export async function loadFinancialDetail(
  userId: string,
  kind: FinancialDetailKind,
  id: string,
): Promise<Record<string, unknown> | null> {
  try {
    const key = cacheKey(userId, kind, id);
    const remembered = rememberedDetails.get(key);
    if (remembered) return remembered;
    const saved = await SecureStore.getItemAsync(key);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function saveFinancialDetail(
  userId: string,
  kind: FinancialDetailKind,
  id: string,
  source: Record<string, unknown>,
): Promise<void> {
  const key = cacheKey(userId, kind, id);
  const snapshot = createSnapshot(source);
  const serialized = JSON.stringify(snapshot);
  // Keep this a compact, encrypted keychain snapshot (never cache bank account or proof data).
  if (serialized.length > 1800) throw new Error('The transaction record is too large to save securely.');
  rememberedDetails.set(key, snapshot);
  await SecureStore.setItemAsync(key, serialized);
}
