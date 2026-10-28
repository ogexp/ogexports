type Json = Record<string, unknown>;

function record(value: unknown): Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Json
    : {};
}

function hasIdentity(value: Json): boolean {
  return ['id', 'user_id'].some(key => {
    const field = value[key];
    return (typeof field === 'string' && field.trim().length > 0)
      || (typeof field === 'number' && Number.isFinite(field));
  });
}

export function updatedInvestorUser(response: unknown): Json {
  let candidate = record(response);

  for (let depth = 0; depth < 4; depth += 1) {
    if (hasIdentity(candidate)) return candidate;
    const nested = candidate.user ?? candidate.data;
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return {};
    candidate = record(nested);
  }

  return hasIdentity(candidate) ? candidate : {};
}

export function profileUserPhone(user: unknown): string {
  const account = record(user);
  for (const key of ['mobile', 'phone']) {
    const value = account[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
