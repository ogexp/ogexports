type ActivityRecord = Record<string, unknown>;

const depositIdFields = ['deposit_id', 'depositId'];
const depositReferenceFields = [
  'reference',
  'transaction_reference',
  'deposit_reference',
  'depositReference',
  'bank_reference',
  'transfer_reference',
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

function tokens(item: ActivityRecord, fields: string[]): string[] {
  const meta = asRecord(item.meta ?? item.metadata);
  return [...fields.map(field => valueText(item[field])), ...fields.map(field => valueText(meta[field]))]
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
  const meta = asRecord(item.meta ?? item.metadata);
  ids.push(...depositIdFields.map(field => valueText(meta[field])).filter(Boolean).map(value => value.toLowerCase()));
  if (isRequest || looksLikeDeposit(item)) {
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
  const meta = asRecord(item.meta ?? item.metadata);
  ids.push(...depositIdFields.map(field => valueText(meta[field])).filter(Boolean).map(value => value.toLowerCase()));
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
  for (const item of activity) addKnownDepositTokens(item, knownIds, knownReferences);

  const merged = [...activity];
  for (const deposit of depositRequests) {
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
