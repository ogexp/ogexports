type DatedRecord = Record<string, unknown>;

function timestampFor(item: DatedRecord, dateFields: string[]) {
  for (const field of dateFields) {
    const value = item[field];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value < 100_000_000_000 ? value * 1000 : value;
    }
    if (typeof value === 'string' && value.trim()) {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return timestamp;
    }
  }
  return null;
}

export function latestRecords<T extends DatedRecord>(
  items: T[],
  dateFields: string[],
  limit: number,
): T[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : items.length;

  return items
    .map((item, index) => ({ item, index, timestamp: timestampFor(item, dateFields) }))
    .sort((left, right) => {
      if (left.timestamp == null && right.timestamp != null) return 1;
      if (left.timestamp != null && right.timestamp == null) return -1;
      if (left.timestamp != null && right.timestamp != null && left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp;
      }
      return left.index - right.index;
    })
    .slice(0, safeLimit)
    .map(({ item }) => item);
}
