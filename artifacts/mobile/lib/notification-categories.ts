import { first, record } from '@/lib/data';

export const NOTIFICATION_CATEGORIES = [
  { key: 'trade', label: 'Trade', icon: 'truck', legacy: ['marketUpdates'], description: 'Shipment and project updates' },
  { key: 'investment', label: 'Investment', icon: 'trending-up', legacy: ['marketUpdates'], description: 'Investment confirmations and status' },
  { key: 'wallet', label: 'Wallet', icon: 'credit-card', legacy: ['depositApproved', 'withdrawalCompleted', 'profitCredit'], description: 'Deposits, withdrawals and credits' },
  { key: 'kyc', label: 'KYC', icon: 'shield', legacy: ['kycUpdate', 'documentRequired'], description: 'Verification requests and status' },
  { key: 'security', label: 'Security', icon: 'lock', legacy: [], description: 'Sign-in and account security activity' },
  { key: 'account', label: 'Account', icon: 'user', legacy: ['adminAnnounce'], description: 'Announcements and account notices' },
] as const;

export type NotificationCategoryKey = typeof NOTIFICATION_CATEGORIES[number]['key'];
export type NotificationCategoryLabel = typeof NOTIFICATION_CATEGORIES[number]['label'];
export type NotificationCategoryFilter = 'All' | NotificationCategoryLabel;

const categoryByKey = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map(category => [category.key, category]),
) as Record<NotificationCategoryKey, typeof NOTIFICATION_CATEGORIES[number]>;

const categoryByType: Record<string, NotificationCategoryKey> = {
  shipment_update: 'trade',
  trade_update: 'trade',
  project_trade_update: 'trade',
  update: 'trade',
  investment: 'investment',
  deposit: 'wallet',
  deposit_approved: 'wallet',
  withdrawal: 'wallet',
  withdrawal_approved: 'wallet',
  profit: 'wallet',
  profit_credit: 'wallet',
  kyc_approved: 'kyc',
  kyc_rejected: 'kyc',
  document_required: 'kyc',
  security: 'security',
  security_alert: 'security',
  new_device: 'security',
  new_device_login: 'security',
  announcement: 'account',
};

export function notificationCategory(item: Record<string, unknown>): NotificationCategoryKey {
  const data = record(item.data ?? item.metadata ?? item.payload);
  const explicit = first(item, ['category'], first(data, ['category'])).toLowerCase();
  if (explicit in categoryByKey) return explicit as NotificationCategoryKey;

  const type = first(item, ['type', 'event_type'], first(data, ['type', 'event_type'])).toLowerCase();
  if (categoryByType[type]) return categoryByType[type];

  const context = [
    first(item, ['title', 'subject', 'body', 'message']),
    first(data, ['title', 'subject', 'body', 'message', 'resource_type', 'entity_type']),
  ].join(' ').toLowerCase();
  if (/security|device|sign.?in|password|two.?factor|2fa/.test(context)) return 'security';
  if (/kyc|verification|identity/.test(context)) return 'kyc';
  if (/deposit|withdraw|wallet|profit|credit|payout/.test(context)) return 'wallet';
  if (/investment|position|portfolio/.test(context)) return 'investment';
  if (/trade|project|shipment|container|opportunity/.test(context)) return 'trade';
  return 'account';
}

export function notificationCategoryLabel(category: NotificationCategoryKey): NotificationCategoryLabel {
  return categoryByKey[category].label;
}

export function isNotificationPreferenceEnabled(
  preferences: Record<string, unknown>,
  category: NotificationCategoryKey,
): boolean {
  if (typeof preferences[category] === 'boolean') return preferences[category] as boolean;
  const legacyKeys = categoryByKey[category].legacy;
  const legacyValues = legacyKeys
    .map(key => preferences[key])
    .filter((value): value is boolean => typeof value === 'boolean');
  return !(
    legacyValues.length > 0
    && legacyValues.length === legacyKeys.length
    && legacyValues.every(value => !value)
  );
}