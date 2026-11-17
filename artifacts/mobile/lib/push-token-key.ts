export function pushTokenSecureStoreKey(userId: string): string {
  const encodedUserId = Array.from(userId.trim(), character => character.codePointAt(0)?.toString(16) ?? '').join('.');
  if (!encodedUserId) throw new Error('A signed-in account is required for push-token storage.');
  return `og-investor-push-token-${encodedUserId}`;
}
