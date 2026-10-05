import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useGetInvestorInvestments,
  useGetInvestorProjects,
  useGetInvestorWalletTransactions,
} from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Field, LoadingCard, Screen, Section, Status } from '@/components/InvestorUI';
import { amount, first, list, money, record } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type ResultKind = 'trade' | 'investment' | 'transaction' | 'document';

type SearchResult = {
  id: string;
  entityId?: string;
  entityKind?: 'trade' | 'investment';
  title: string;
  subtitle: string;
  supportingText: string;
  status: string;
  icon: 'briefcase' | 'trending-up' | 'credit-card' | 'file-text';
  kind: ResultKind;
  currency: string;
  value: number | null;
};

function matches(row: Record<string, unknown>, keys: string[], query: string) {
  return keys.some(key => first(row, [key]).toLowerCase().includes(query));
}

function searchable(row: Record<string, unknown>, fields: string[]) {
  return fields.map(field => first(row, [field])).join(' ').toLowerCase();
}

function hasAuthorizedDocumentLink(document: Record<string, unknown>) {
  const status = first(document, ['status', 'access_status', 'approval_status']).toLowerCase();
  return Boolean(first(document, ['view_url', 'download_url', 'url']))
    && !/(pending|unauthori[sz]ed|denied|reject|revok|expir|blocked|unavailable|not.?approved|unapproved|inactive|disabled)/i.test(status);
}

export default function InvestorSearch() {
  const { token } = useAuth();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const projectsQuery = useGetInvestorProjects({ per_page: 50 }, {
    query: { queryKey: ['investor-projects', 50], enabled: !!token, staleTime: 60_000 },
  });
  const investmentsQuery = useGetInvestorInvestments({ per_page: 50 }, {
    query: { queryKey: ['investor-positions', 50], enabled: !!token, staleTime: 30_000 },
  });
  const transactionsQuery = useGetInvestorWalletTransactions({ page: 1, per_page: 100 }, {
    query: { queryKey: ['investor-wallet-transactions', 1, 100], enabled: !!token, staleTime: 30_000 },
  });
  const query = search.trim().toLowerCase();
  const projects = list(projectsQuery.data);
  const investments = list(investmentsQuery.data);
  const transactions = list(transactionsQuery.data);

  const tradeResults: SearchResult[] = projects.flatMap(item => {
    const container = record(item.container ?? item.container_details);
    const text = [
      searchable(item, [
        'trade_id', 'trade_code', 'code', 'reference', 'commodity', 'commodity_name',
        'title', 'name', 'project_name', 'origin', 'origin_country', 'destination',
        'destination_country', 'destination_market', 'description', 'status', 'container_number',
      ]),
      searchable(container, ['container_number', 'number', 'status', 'vessel_name']),
    ].join(' ');
    if (!text.includes(query)) return [];
    const origin = first(item, ['origin', 'origin_country', 'from_country']);
    const destination = first(item, ['destination', 'destination_country', 'to_country', 'destination_market']);
    const tradeId = first(item, ['trade_id', 'trade_code', 'code', 'reference']);
    return [{
      id: first(item, ['id', 'project_id']),
      title: first(item, ['commodity_name', 'commodity', 'title', 'name', 'project_name'], 'Trade opportunity'),
      subtitle: tradeId ? `Trade · ${tradeId}` : 'Trade opportunity',
      supportingText: origin && destination ? `${origin} → ${destination}` : first(item, ['description', 'summary'], '—'),
      status: first(item, ['status', 'state'], '—'),
      icon: 'briefcase',
      kind: 'trade',
      currency: '',
      value: null,
    }];
  });

  const investmentResults: SearchResult[] = investments
    .filter(item => {
      const trade = record(item.trade ?? item.project ?? item.trade_details);
      const container = record(item.container ?? item.container_details ?? trade.container ?? trade.container_details);
      const text = [
        searchable(item, [
          'investment_id', 'id', 'reference', 'trade_id', 'trade_code', 'project_name',
          'title', 'name', 'status', 'trade_status', 'container_status', 'origin',
          'destination', 'commodity_name', 'commodity', 'container_number',
        ]),
        searchable(trade, [
          'trade_id', 'trade_code', 'project_code', 'code', 'commodity_name',
          'commodity', 'title', 'name', 'origin', 'destination', 'destination_country',
          'destination_market', 'to_country', 'container_number',
        ]),
        searchable(container, ['container_number', 'number', 'status', 'vessel_name']),
      ].join(' ');
      return text.includes(query);
    })
    .map(item => {
      const trade = record(item.trade ?? item.project ?? item.trade_details);
      const investmentId = first(item, ['investment_id', 'id']);
      const tradeId = first(item, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code']));
      return {
        id: investmentId,
        title: first(item, ['project_name', 'title', 'name', 'commodity_name'], first(trade, ['commodity_name', 'commodity', 'title', 'name'], 'Investment')),
        subtitle: tradeId ? `Investment · ${tradeId}` : 'Portfolio investment',
        supportingText: first(item, ['trade_status', 'container_status', 'status', 'state'], 'Investment details reported by OG Exports'),
        status: first(item, ['status', 'state'], '—'),
        icon: 'trending-up',
        kind: 'investment',
        currency: first(item, ['currency'], first(trade, ['currency'])),
        value: amount(item, ['amount', 'investment_amount', 'principal']),
      };
    });

  const documentResults: SearchResult[] = [
    ...projects.flatMap(project => {
      const projectId = first(project, ['id', 'project_id']);
      const tradeId = first(project, ['trade_id', 'trade_code', 'code', 'reference']);
      const parentText = searchable(project, [
        'trade_id', 'trade_code', 'commodity_name', 'commodity', 'title', 'name',
        'project_name', 'destination', 'destination_country',
      ]);
      return list(project.documents).flatMap((document, index) => {
        if (!hasAuthorizedDocumentLink(document)) return [];
        const title = first(document, ['title', 'original_name', 'name', 'file_name', 'category'], 'Trade document');
        const text = `${searchable(document, ['id', 'document_id', 'title', 'original_name', 'name', 'file_name', 'category', 'type', 'status'])} ${parentText}`.toLowerCase();
        if (!text.includes(query)) return [];
        return [{
          id: first(document, ['id', 'document_id'], `${projectId}-${index}`),
          entityId: projectId,
          entityKind: 'trade' as const,
          title,
          subtitle: tradeId ? `Trade document · ${tradeId}` : 'Trade document',
          supportingText: first(document, ['type', 'category', 'status'], 'Authorized document'),
          status: first(document, ['status'], 'Available'),
          icon: 'file-text' as const,
          kind: 'document' as const,
          currency: '',
          value: null,
        }];
      });
    }),
    ...investments.flatMap(investment => {
      const trade = record(investment.trade ?? investment.project ?? investment.trade_details);
      const investmentId = first(investment, ['investment_id', 'id']);
      const tradeId = first(investment, ['trade_id', 'trade_code'], first(trade, ['trade_id', 'trade_code', 'project_code', 'code']));
      const parentText = [
        searchable(investment, ['investment_id', 'id', 'trade_id', 'trade_code', 'project_name', 'title', 'name']),
        searchable(trade, ['trade_id', 'trade_code', 'commodity_name', 'commodity', 'title', 'name', 'destination']),
      ].join(' ');
      const documents = [...list(investment.documents), ...list(trade.documents)];
      return documents.flatMap((document, index) => {
        if (!hasAuthorizedDocumentLink(document)) return [];
        const title = first(document, ['title', 'original_name', 'name', 'file_name', 'category'], 'Investment document');
        const text = `${searchable(document, ['id', 'document_id', 'title', 'original_name', 'name', 'file_name', 'category', 'type', 'status'])} ${parentText}`.toLowerCase();
        if (!text.includes(query)) return [];
        return [{
          id: first(document, ['id', 'document_id'], `${investmentId}-${index}`),
          entityId: investmentId,
          entityKind: 'investment' as const,
          title,
          subtitle: tradeId ? `Investment document · ${tradeId}` : 'Investment document',
          supportingText: first(document, ['type', 'category', 'status'], 'Authorized document'),
          status: first(document, ['status'], 'Available'),
          icon: 'file-text' as const,
          kind: 'document' as const,
          currency: '',
          value: null,
        }];
      });
    }),
  ];

  const transactionResults: SearchResult[] = transactions
    .filter(item => matches(item, [
      'reference', 'transaction_id', 'id', 'type', 'transaction_type', 'category',
      'description', 'title', 'project_name', 'status', 'state', 'created_at', 'date',
    ], query))
    .map(item => ({
      id: first(item, ['id', 'transaction_id', 'reference']),
      title: first(item, ['description', 'title', 'type', 'transaction_type', 'category'], 'Wallet activity'),
      subtitle: first(item, ['reference', 'transaction_id'], 'Wallet transaction'),
      supportingText: first(item, ['created_at', 'date'], '—'),
      status: first(item, ['status', 'state'], '—'),
      icon: 'credit-card',
      kind: 'transaction',
      currency: first(item, ['currency']),
      value: amount(item, ['amount', 'total']),
    }));

  const resultsByKind: { title: string; kind: ResultKind; results: SearchResult[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }[] = [
    { title: 'Trade opportunities', kind: 'trade', results: tradeResults, isLoading: projectsQuery.isLoading, isError: projectsQuery.isError, error: projectsQuery.error, refetch: projectsQuery.refetch },
    { title: 'My investments', kind: 'investment', results: investmentResults, isLoading: investmentsQuery.isLoading, isError: investmentsQuery.isError, error: investmentsQuery.error, refetch: investmentsQuery.refetch },
    { title: 'Wallet transactions', kind: 'transaction', results: transactionResults, isLoading: transactionsQuery.isLoading, isError: transactionsQuery.isError, error: transactionsQuery.error, refetch: transactionsQuery.refetch },
  ];
  const anyLoading = resultsByKind.some(group => group.isLoading);
  const totalMatches = tradeResults.length + investmentResults.length + transactionResults.length + documentResults.length;

  function openResult(result: SearchResult) {
    if (result.kind === 'document' && result.entityId) {
      router.push({
        pathname: result.entityKind === 'investment' ? '/position/[id]' : '/project/[id]',
        params: { id: result.entityId },
      });
      return;
    }
    if (result.kind === 'trade' && result.id) {
      router.push({ pathname: '/project/[id]', params: { id: result.id } });
      return;
    }
    if (result.kind === 'investment' && result.id) {
      router.push({ pathname: '/position/[id]', params: { id: result.id } });
      return;
    }
    if (result.kind === 'transaction') {
      router.push({
        pathname: '/account/transactions',
        params: { tab: 'Wallet', search: result.id || query, selected: result.id },
      });
      return;
    }
    if (result.kind === 'investment') {
      router.push({ pathname: '/account/transactions', params: { tab: 'Investments', search: result.title } });
    }
  }

  return <Screen title="Search" subtitle="Find trades, investments and wallet activity" refreshable>
    <Field
      label="Search records"
      value={search}
      onChangeText={setSearch}
      placeholder="Trade ID, commodity, reference or status"
      autoCapitalize="none"
    />
    {!query ? <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
      <View style={{ width: 46, height: 46, borderRadius: 24, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="search" size={20} color={colors.primary} />
      </View>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginTop: 12 }}>Search your OG Exports account</Text>
      <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 12, lineHeight: 19, marginTop: 5 }}>
        Search checks trades, investments, authorized documents and recent wallet activity returned by the server.
      </Text>
    </Card> : <>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
        {anyLoading ? 'Searching your account…' : `${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'}`}
      </Text>
      {resultsByKind.map(group => <View key={group.kind}>
        <Section title={group.title} />
        {group.isLoading ? <LoadingCard label={group.kind === 'trade' ? 'Loading trade opportunities…' : group.kind === 'investment' ? 'Loading investment records…' : 'Loading transactions from OG Exports…'} /> : null}
        {group.isError ? <ErrorState message={`${group.title} could not be searched.`} error={group.error} onRetry={() => { void group.refetch(); }} /> : null}
        {!group.isLoading && !group.isError && group.results.length === 0 ? null : group.results.map((result, index) => {
          const hasDestination = result.kind !== 'trade' || Boolean(result.id);
          return <Pressable
            key={`${result.kind}-${result.id || index}`}
            testID={`search-result-${result.kind}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${result.title}`}
            disabled={!hasDestination}
            onPress={() => openResult(result)}
            style={({ pressed }) => ({ opacity: pressed ? 0.76 : hasDestination ? 1 : 0.65 })}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={result.icon} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{result.title}</Text>
                <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 10, fontWeight: '600', marginTop: 3 }}>{result.subtitle}</Text>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{result.supportingText}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                {result.kind === 'investment' || result.kind === 'transaction'
                  ? <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: '700' }}>{money(result.value, result.currency || 'USD')}</Text>
                  : null}
                <Status value={result.status} />
              </View>
            </Card>
          </Pressable>;
        })}
      </View>)}
      <View>
        <Section title="Documents" />
        {projectsQuery.isLoading || investmentsQuery.isLoading ? <LoadingCard label="Loading authorized documents…" /> : null}
        {!projectsQuery.isLoading && !investmentsQuery.isLoading && (projectsQuery.isError || investmentsQuery.isError) ? <ErrorState message="Some authorized document records could not be searched." error={projectsQuery.error ?? investmentsQuery.error} onRetry={() => { if (projectsQuery.isError) void projectsQuery.refetch(); if (investmentsQuery.isError) void investmentsQuery.refetch(); }} /> : null}
        {!projectsQuery.isLoading && !investmentsQuery.isLoading && !projectsQuery.isError && !investmentsQuery.isError && documentResults.length === 0 ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>No matching documents with a server-provided access link.</Text> : null}
        {documentResults.map((result, index) => {
          const hasDestination = Boolean(result.entityId);
          return <Pressable
            key={`document-${result.id}-${index}`}
            testID={`search-result-document-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Open ${result.title}`}
            disabled={!hasDestination}
            onPress={() => openResult(result)}
            style={({ pressed }) => ({ opacity: pressed ? 0.76 : hasDestination ? 1 : 0.65 })}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={result.icon} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{result.title}</Text>
                <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 10, fontWeight: '600', marginTop: 3 }}>{result.subtitle}</Text>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{result.supportingText}</Text>
              </View>
              <Status value={result.status} />
            </Card>
          </Pressable>;
        })}
      </View>
      {!anyLoading && !totalMatches && !resultsByKind.some(group => group.isError) ? <EmptyState title="No matching records" body="Try a different trade ID, project name, transaction reference or status." /> : null}
    </>}
  </Screen>;
}
