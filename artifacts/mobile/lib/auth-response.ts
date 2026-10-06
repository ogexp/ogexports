export type AuthResponsePayload = Record<string, unknown>;

function isRecord(value: unknown): value is AuthResponsePayload {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAuthResponse(value: unknown): AuthResponsePayload {
  const outer = isRecord(value) ? value : {};
  return isRecord(outer.data) ? outer.data : outer;
}

export function readTwoFactorLoginChallenge(value: unknown): { email: string; message: string } | null {
  const payload = normalizeAuthResponse(value);
  if (payload.requires_2fa !== true || typeof payload.email !== 'string' || !payload.email.trim()) {
    return null;
  }

  return {
    email: payload.email.trim(),
    message: typeof payload.message === 'string' ? payload.message : '',
  };
}
