import React from 'react';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams } from 'expo-router';
import { useGetPublicInvestorAppSettings } from '@workspace/api-client-react';
import { Card, EmptyState, ErrorState, Screen } from '@/components/InvestorUI';
import { record, unwrap } from '@/lib/data';
import { useColors } from '@/hooks/useColors';

const sections = {
  terms: {
    title: 'Terms of service',
    keys: ['terms', 'terms_of_service', 'terms_and_conditions', 'terms_content', 'terms_of_service_content', 'investment_terms', 'investment_terms_content'],
  },
  'investment-terms': {
    title: 'Investment Terms',
    keys: ['investment_terms', 'investment_terms_content', 'investmentTerms', 'investmentTermsContent'],
  },
  'user-agreement': {
    title: 'User Agreement',
    keys: ['user_agreement', 'user_agreement_content', 'userAgreement', 'userAgreementContent'],
  },
  privacy: {
    title: 'Privacy policy',
    keys: ['privacy_policy', 'privacy', 'privacy_content', 'privacy_policy_content'],
  },
  risk: {
    title: 'Risk disclosure',
    keys: ['risk_disclosure', 'investment_risk_disclosure', 'risk_disclaimer', 'risk_disclosure_content'],
  },
} as const;

function textContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const entry = record(value);
    for (const key of ['content', 'body', 'text', 'description']) {
      if (typeof entry[key] === 'string') return entry[key];
    }
  }
  return '';
}

function plainText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function LegalContent() {
  const { section: raw } = useLocalSearchParams<{ section: string }>();
  const sectionName = String(raw ?? '').toLowerCase() as keyof typeof sections;
  const section = sections[sectionName];
  const colors = useColors();
  const query = useGetPublicInvestorAppSettings({ query: { queryKey: ['public-investor-app-settings'], staleTime: 300_000 } });
  const settings = unwrap(query.data);
  const site = record(settings.site);
  const content = section
    ? section.keys.map(key => textContent(site[key])).find(Boolean) ?? ''
    : '';
  const document = plainText(content);

  if (!section) return <Screen title="Policy unavailable"><EmptyState title="Page not found" body="This policy link is not available." /></Screen>;
  return <Screen title={section.title} subtitle="Official content published by OG Exports">
    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading official content…</Text></Card> : null}
    {query.isError ? <ErrorState message="Official policy content could not be loaded." onRetry={() => void query.refetch()} /> : null}
    {!query.isLoading && !query.isError && !document ? <EmptyState title="Official content not available" body="OG Exports has not published this content to the investor app settings endpoint." /> : null}
    {document ? <Card><Text selectable style={{ color: colors.foreground, fontSize: 14, lineHeight: 23 }}>{document}</Text></Card> : null}
  </Screen>;
}