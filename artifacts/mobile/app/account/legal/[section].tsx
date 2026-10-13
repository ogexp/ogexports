import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams } from 'expo-router';
import { Card, EmptyState, Screen } from '@/components/InvestorUI';
import { useColors } from '@/hooks/useColors';
import { useAppPreferences } from '@/context/AppPreferencesContext';
import { LEGAL_DOCUMENTS } from '@/lib/legal-content';
import { getLegalDocumentForPreference } from '@/lib/legal-content-translations';
import { translateUi } from '@/lib/strings';

export default function LegalContent() {
  const { section: raw } = useLocalSearchParams<{ section: string }>();
  const sectionName = String(raw ?? '').toLowerCase();
  const sourceDocument = LEGAL_DOCUMENTS[sectionName];
  const { preferences } = useAppPreferences();
  const language = preferences.language;
  const [showEnglishSource, setShowEnglishSource] = useState(false);
  useEffect(() => {
    setShowEnglishSource(false);
  }, [language, sectionName]);
  const document = getLegalDocumentForPreference(sourceDocument, sectionName, language, showEnglishSource);
  const colors = useColors();

  if (!sourceDocument) return <Screen title="Policy unavailable"><EmptyState title="Page not found" body="This policy link is not available." /></Screen>;
  if (!document) return <Screen title={translateUi('Policy unavailable', language)}>
    <EmptyState
      title={translateUi('Policy unavailable', language)}
      body={translateUi('This translation is not available or does not match the source document structure.', language)}
    />
  </Screen>;

  return <Screen title={document.title} subtitle={document.summary}>
    <Card>
      {language !== 'en' ? <>
        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', lineHeight: 19, marginBottom: 10 }}>
          {translateUi('Translation draft — qualified review pending. The approved English source is available for comparison.', language)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowEnglishSource(value => !value)}
          style={{ alignSelf: 'flex-start', marginBottom: 14, paddingVertical: 4 }}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
            {translateUi(
              showEnglishSource
                ? language === 'ur' ? 'Show Urdu draft' : 'Show Arabic draft'
                : 'Show approved English source',
              language,
            )}
          </Text>
        </Pressable>
      </> : null}
      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '700', lineHeight: 19, marginBottom: 14 }}>
        {translateUi('Important: This information is not individualized investment, legal, tax or accounting advice. Review the signed agreement for your transaction and seek independent professional advice where appropriate.', language)}
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
