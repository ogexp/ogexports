import { first, record } from '@/lib/data';
import type { PostAuthHref } from '@/lib/post-auth-route';

type NotificationTarget =
  | { kind: 'trade'; id: string }
  | { kind: 'investment'; id: string }
  | { kind: 'transaction'; id?: string }
  | { kind: 'screen'; path: '/account/kyc' | '/wallet/deposit' | '/wallet/withdraw' | '/account/reports' | '/account/messages' | '/account/portfolio' | '/(tabs)/opportunities' | '/(tabs)/wallet' };

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeId(value: string) {
  const id = decode(value);
  return id && id !== '.' && id !== '..' && !/[/?#\\\u0000-\u001f]/.test(id) ? id : '';
}

export function notificationTarget(item: Record<string, unknown>): NotificationTarget | null {
  const payload = record(item.data ?? item.metadata ?? item.payload);
  const route = first(payload, ['deep_link', 'action_url', 'route', 'url', 'link'], first(item, ['deep_link', 'action_url', 'route', 'url', 'link']));
  const tradePath = route.match(/(?:^|\/)project\/([^/?#]+)/i);
  const linkedTradeId = safeId(tradePath?.[1] ?? '');
  if (linkedTradeId) return { kind: 'trade', id: linkedTradeId };
  const investmentPath = route.match(/(?:^|\/)position\/([^/?#]+)/i);
  const linkedInvestmentId = safeId(investmentPath?.[1] ?? '');
  if (linkedInvestmentId) return { kind: 'investment', id: linkedInvestmentId };

  const screenRoutes = [
    ['/account/kyc', '/account/kyc'],
    ['/wallet/deposit', '/wallet/deposit'],
    ['/wallet/withdraw', '/wallet/withdraw'],
    ['/account/reports', '/account/reports'],
    ['/account/messages', '/account/messages'],
    ['/account/portfolio', '/account/portfolio'],
    ['/(tabs)/opportunities', '/(tabs)/opportunities'],
    ['/(tabs)/wallet', '/(tabs)/wallet'],
  ] as const;
  const explicitScreen = screenRoutes.find(([path]) => route.includes(path));
  if (explicitScreen) return { kind: 'screen', path: explicitScreen[1] };

  const transactionPath = /(?:^|\/)account\/transactions(?:[/?#]|$)/i.test(route);
  const transactionId = first(payload, ['transaction_id', 'wallet_transaction_id', 'transactionId'], first(item, ['transaction_id', 'wallet_transaction_id']));
  if (transactionPath || transactionId) {
    const routeSearch = route.match(/[?&](?:search|transaction_id|id)=([^&#]+)/i)?.[1];
    return { kind: 'transaction', id: transactionId || (routeSearch ? decode(routeSearch) : undefined) };
  }

  const context = [
    ...['type', 'category', 'event_type', 'title', 'subject', 'message', 'body'].map(key => first(item, [key])),
    ...['type', 'category', 'event_type', 'resource_type', 'entity_type', 'target_type'].map(key => first(payload, [key])),
  ].join(' ').toLowerCase();
  const projectId = first(payload, ['project_id', 'trade_project_id', 'opportunity_id'], first(item, ['project_id', 'trade_project_id', 'opportunity_id']));
  const investmentId = first(payload, ['investment_id', 'position_id'], first(item, ['investment_id', 'position_id']));
  const resourceId = first(payload, ['resource_id', 'entity_id', 'target_id']);
  const resourceType = first(payload, ['resource_type', 'entity_type', 'target_type']).toLowerCase();

  if (safeId(investmentId) || (safeId(resourceId) && /investment|position/.test(resourceType))) {
    return { kind: 'investment', id: safeId(investmentId) || safeId(resourceId) };
  }
  if (safeId(projectId) || (safeId(resourceId) && /trade|project|opportunity/.test(resourceType))) {
    return { kind: 'trade', id: safeId(projectId) || safeId(resourceId) };
  }
  if (/kyc|verification|identity/.test(context)) return { kind: 'screen', path: '/account/kyc' };
  if (/withdraw|cash.?out/.test(context)) return { kind: 'screen', path: '/wallet/withdraw' };
  if (/deposit|funding|top.?up/.test(context)) return { kind: 'screen', path: '/wallet/deposit' };
  if (/report|statement/.test(context)) return { kind: 'screen', path: '/account/reports' };
  if (/support|message|ticket/.test(context)) return { kind: 'screen', path: '/account/messages' };
  if (/wallet|transaction|payout|distribution/.test(context)) return { kind: 'transaction' };
  if (/portfolio|investment/.test(context)) return { kind: 'screen', path: '/account/portfolio' };
  if (/trade|project|opportunity|shipment/.test(context)) return { kind: 'screen', path: '/(tabs)/opportunities' };
  return null;
}

export function notificationHref(item: Record<string, unknown>): PostAuthHref | null {
  const target = notificationTarget(item);
  if (!target) return null;
  if (target.kind === 'trade') return { pathname: '/project/[id]', params: { id: target.id } };
  if (target.kind === 'investment') return { pathname: '/position/[id]', params: { id: target.id } };
  if (target.kind === 'transaction') {
    return { pathname: '/account/transactions', params: { tab: 'Wallet', search: target.id, selected: target.id } };
  }
  return target.path;
}