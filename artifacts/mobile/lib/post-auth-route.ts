type TransactionHref = {
  pathname: '/account/transactions';
  params: {
    tab?: 'Wallet' | 'Investments';
    search?: string;
    selected?: string;
  };
};

export type PostAuthHref =
  | '/(tabs)'
  | '/search'
  | '/account/notifications'
  | '/account/kyc'
  | '/wallet/deposit'
  | '/wallet/withdraw'
  | '/account/reports'
  | '/account/messages'
  | '/account/portfolio'
  | '/account/security'
  | '/account/settings'
  | '/(tabs)/opportunities'
  | '/(tabs)/portfolio'
  | '/(tabs)/wallet'
  | { pathname: '/project/[id]'; params: { id: string } }
  | { pathname: '/position/[id]'; params: { id: string } }
  | TransactionHref;

function decode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function queryValue(query: string, key: string) {
  const pair = query.split('&').find(entry => entry.split('=')[0] === encodeURIComponent(key));
  return pair ? decode(pair.slice(pair.indexOf('=') + 1)) : '';
}

function validId(value: string) {
  return value && value !== '.' && value !== '..' && !/[/?#\\\u0000-\u001f]/.test(value) ? value : '';
}

export function serializeRouteState(pathname: string, params: Record<string, string | string[] | undefined>) {
  const query = Object.entries(params).flatMap(([key, value]) => {
    const values = Array.isArray(value) ? value : value == null ? [] : [value];
    return values.map(item => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
  });
  return `${pathname}${query.length ? `?${query.join('&')}` : ''}`;
}

export function resolvePostAuthHref(returnTo?: string | string[]): PostAuthHref {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/(tabs)';

  const [pathname, query = ''] = value.split('?', 2);
  const projectMatch = pathname.match(/^\/project\/([^/]+)\/?$/);
  const projectId = validId(decode(projectMatch?.[1] ?? (pathname === '/project/[id]' ? queryValue(query, 'id') : '')));
  if (projectId) return { pathname: '/project/[id]', params: { id: projectId } };

  const positionMatch = pathname.match(/^\/position\/([^/]+)\/?$/);
  const positionId = validId(decode(positionMatch?.[1] ?? (pathname === '/position/[id]' ? queryValue(query, 'id') : '')));
  if (positionId) return { pathname: '/position/[id]', params: { id: positionId } };

  if (pathname === '/account/transactions') {
    const tab = queryValue(query, 'tab');
    return {
      pathname: '/account/transactions',
      params: {
        tab: tab === 'Investments' ? 'Investments' : 'Wallet',
        search: queryValue(query, 'search') || undefined,
        selected: queryValue(query, 'selected') || undefined,
      },
    };
  }

  const staticRoutes: Record<string, Exclude<PostAuthHref, TransactionHref | { pathname: '/project/[id]'; params: { id: string } } | { pathname: '/position/[id]'; params: { id: string } }>> = {
    '/': '/(tabs)',
    '/(tabs)': '/(tabs)',
    '/(tabs)/index': '/(tabs)',
    '/search': '/search',
    '/account/notifications': '/account/notifications',
    '/account/kyc': '/account/kyc',
    '/wallet/deposit': '/wallet/deposit',
    '/wallet/withdraw': '/wallet/withdraw',
    '/account/reports': '/account/reports',
    '/account/messages': '/account/messages',
    '/account/portfolio': '/account/portfolio',
    '/account/security': '/account/security',
    '/account/settings': '/account/settings',
    '/(tabs)/opportunities': '/(tabs)/opportunities',
    '/opportunities': '/(tabs)/opportunities',
    '/(tabs)/portfolio': '/(tabs)/portfolio',
    '/portfolio': '/(tabs)/portfolio',
    '/(tabs)/wallet': '/(tabs)/wallet',
    '/wallet': '/(tabs)/wallet',
  };
  return staticRoutes[pathname] ?? '/(tabs)';
}