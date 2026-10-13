import React from 'react';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams } from 'expo-router';
import { Card, EmptyState, Screen } from '@/components/InvestorUI';
import { useColors } from '@/hooks/useColors';
import { LEGAL_DOCUMENTS } from '@/lib/legal-content';

export default function LegalContent() {
  const { section: raw } = useLocalSearchParams<{ section: string }>();
  const sectionName = String(raw ?? '').toLowerCase();
  const document = LEGAL_DOCUMENTS[sectionName];
  const colors = useColors();

  if (!document) return <Screen title="Policy unavailable"><EmptyState title="Page not found" body="This policy link is not available." /></Screen>;
  return <Screen title={document.title} subtitle={document.summary}>
    <Card>
      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', lineHeight: 19, marginBottom: 14 }}>
        Important: This information is not individualized investment, legal, tax or accounting advice. Review the signed agreement for your transaction and seek independent professional advice where appropriate.
      </Text>
      {document.sections.map((item, index) => (
        <React.Fragment key={item.heading}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: index ? 20 : 0, marginBottom: 7 }}>
            {item.heading}
          </Text>
          {item.paragraphs?.map((paragraph, paragraphIndex) => (
            <Text key={`${item.heading}-p-${paragraphIndex}`} selectable style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 21, marginBottom: 8 }}>
              {paragraph}
            </Text>
          ))}
          {item.bullets?.map((bullet, bulletIndex) => (
            <Text key={`${item.heading}-b-${bulletIndex}`} selectable style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 21, marginBottom: 7, paddingLeft: 8 }}>
              • {bullet}
            </Text>
          ))}
        </React.Fragment>
      ))}
    </Card>
  </Screen>;
}
