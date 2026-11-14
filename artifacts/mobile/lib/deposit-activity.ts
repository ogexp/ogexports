type ActivityRecord = Record<string, unknown>;

const depositIdFields = ['deposit_id', 'depositId'];
const depositReferenceFields = [
  'reference',
  'transaction_reference',
  'deposit_reference',
  'depositReference',
];

function valueText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function firstText(item: ActivityRecord, fields: string[]): string {
  for (const field of fields) {
    const value = valueText(item[field]);
    if (value) return value;
  }
  return '';
}

function asRecord(value: unknown): ActivityRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as ActivityRecord
    : {};
}

function identityRecords(item: ActivityRecord): ActivityRecord[] {
  return [item, asRecord(item.meta), asRecord(item.metadata)];
}

function firstIdentityText(item: ActivityRecord, fields: string[]): string {
  for (const source of identityRecords(item)) {
    const value = firstText(source, fields);
    if (value) return value;
  }
  return '';
}

export type ActivityTransactionTarget = {
  id: string;
  kind: 'deposit' | 'withdrawal' | 'wallet';
};

function validFinancialId(value: unknown): string {
  const id = valueText(value);
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : '';
}

export function resolveActivityTransactionTarget(item: ActivityRecord): ActivityTransactionTarget | null {
  const activitySource = firstText(item, ['activity_source']).toLowerCase();
  const explicitDepositId = firstIdentityText(item, depositIdFields);

  if (activitySource === 'deposit_request') {
    const id = validFinancialId(explicitDepositId) || validFinancialId(item.id);
    return id ? { id, kind: 'deposit' } : null;
  }
  if (validFinancialId(explicitDepositId)) {
    return { id: validFinancialId(explicitDepositId), kind: 'deposit' };
  }

  const withdrawalIdFields = ['withdrawal_id', 'withdrawalId', 'withdraw_id', 'withdrawId'];
  const explicitWithdrawalId = firstIdentityText(item, withdrawalIdFields);
  const withdrawalId = validFinancialId(explicitWithdrawalId)
    || (activitySource === 'withdrawal_request' ? validFinancialId(item.id) : '');
  if (withdrawalId) return { id: withdrawalId, kind: 'withdrawal' };

  const walletId = validFinancialId(firstText(item, ['transaction_id', 'wallet_transaction_id', 'id']));
  return walletId ? { id: walletId, kind: 'wallet' } : null;
}

function tokens(item: ActivityRecord, fields: string[]): string[] {
  return identityRecords(item).flatMap(source => fields.map(field => valueText(source[field])))
    .filter(Boolean)
    .map(value => value.toLowerCase());
}

function looksLikeDeposit(item: ActivityRecord): boolean {
  const description = [
    firstText(item, ['type', 'transaction_type', 'category']),
    firstText(item, ['description', 'title']),
    firstText(item, ['activity_source']),
  ].join(' ').toLowerCase();
  return /deposit|top[\s_-]?up|funding/.test(description);
}

function addKnownDepositTokens(
  item: ActivityRecord,
  knownIds: Set<string>,
  knownReferences: Set<string>,
  isRequest = false,
) {
  const ids = tokens(item, depositIdFields);
  if (isRequest || firstText(item, ['activity_source']) === 'deposit_request') {
    const id = valueText(item.id);
    if (id) ids.push(id.toLowerCase());
  }
  for (const id of ids) knownIds.add(id);

  if (isRequest || looksLikeDeposit(item)) {
    for (const reference of tokens(item, depositReferenceFields)) knownReferences.add(reference);
  }
}

function matchesKnownDeposit(item: ActivityRecord, knownIds: Set<string>, knownReferences: Set<string>): boolean {
  const ids = tokens(item, depositIdFields);
  const id = valueText(item.id);
  if (id) ids.push(id.toLowerCase());
  return ids.some(value => knownIds.has(value))
    || tokens(item, depositReferenceFields).some(value => knownReferences.has(value));
}

export function mergeDepositRequests(
  activity: ActivityRecord[],
  depositRequests: ActivityRecord[],
): ActivityRecord[] {
  const knownIds = new Set<string>();
  const knownReferences = new Set<string>();
  const merged: ActivityRecord[] = [];
  const recordPositions = new Map<string, number>();
  const suppliedRequests: ActivityRecord[] = [];
  for (const item of activity) {
    const source = firstText(item, ['activity_source']).toLowerCase();
    if (source === 'deposit_request') {
      suppliedRequests.push(item);
      continue;
    }
    // Only repeated copies of the same primary record are collapsed. Different
    // ledger IDs remain visible, even when their deposit/reference is shared.
    const id = validFinancialId(firstText(item, ['id', 'wallet_transaction_id', 'transaction_id']));
    const key = id ? `${source === 'withdrawal_request' ? 'withdrawal' : 'wallet'}:${id}` : '';
    const position = key ? recordPositions.get(key) : undefined;
    if (position != null) {
      merged[position] = item;
    } else {
      if (key) recordPositions.set(key, merged.length);
      merged.push(item);
    }
  }
  for (const item of merged) addKnownDepositTokens(item, knownIds, knownReferences);

  // Prefer the fresh deposits endpoint over an older request-shaped feed row.
  for (const deposit of [...depositRequests, ...suppliedRequests]) {
    if (matchesKnownDeposit(deposit, knownIds, knownReferences)) continue;

    merged.push({
      ...deposit,
      type: 'deposit',
      transaction_type: 'deposit',
      description: firstText(deposit, ['description', 'title', 'bank_account_name']) || 'Deposit request',
      status: firstText(deposit, ['review_status_label', 'review_status', 'status']) || '—',
      activity_source: 'deposit_request',
    });
    addKnownDepositTokens(deposit, knownIds, knownReferences, true);
  }
  return merged;
}
