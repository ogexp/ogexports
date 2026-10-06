export type AuthResponsePayload = Record<string, unknown>;

function isRecord(value: unknown): value is AuthResponsePayload {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAuthResponse(value: unknown): AuthResponsePayload {
  const outer = isRecord(value) ? value : {};
  return isRecord(outer.data) ? outer.data : outer;
}

export type TwoFactorLoginChallenge = {
  email: string;
  message: string;
  challengeToken?: string;
};

export function readTwoFactorLoginChallenge(value: unknown): TwoFactorLoginChallenge | null {
  const payload = normalizeAuthResponse(value);
  if (payload.requires_2fa !== true || typeof payload.email !== 'string' || !payload.email.trim()) {
    return null;
  }

  const challengeToken = typeof payload.token === 'string' ? payload.token.trim() : '';
  return {
    email: payload.email.trim(),
    message: typeof payload.message === 'string' ? payload.message : '',
    ...(challengeToken ? { challengeToken } : {}),
  };
}

export function buildTwoFactorVerifyPayload(
  challenge: Pick<TwoFactorLoginChallenge, 'email' | 'challengeToken'>,
  code: string,
  deviceName = 'OG Exports mobile',
): Record<string, string> {
  return {
    email: challenge.email,
    code: code.trim(),
    device_name: deviceName,
    ...(challenge.challengeToken ? { token: challenge.challengeToken } : {}),
  };
}
