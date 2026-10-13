import React, { useEffect, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useLocalSearchParams } from 'expo-router';
import { Action, Card, EmptyState, Screen } from '@/components/InvestorUI';
import { useColors } from '@/hooks/useColors';
import { useAppPreferences } from '@/context/AppPreferencesContext';
import { LEGAL_DOCUMENTS, legalDocumentFilename, legalDocumentFileContent } from '@/lib/legal-content';
import { getLegalDocumentForPreference } from '@/lib/legal-content-translations';
import { localizedAlert as Alert, translateUi } from '@/lib/strings';

export default function LegalContent() {
  const { section: raw } = useLocalSearchParams<{ section: string }>();
  const sectionName = String(raw ?? '').toLowerCase();
  const sourceDocument = LEGAL_DOCUMENTS[sectionName];
  const { preferences } = useAppPreferences();
  const language = preferences.language;
  const [showEnglishSource, setShowEnglishSource] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [saveError, setSaveError] = useState('');
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

  const selectedDocument = document;
  const isPendingDraft = language !== 'en' && !showEnglishSource;
  const fileLanguage = isPendingDraft ? language : 'en';

  async function saveDocument() {
    setSaveError('');
    setSavingFile(true);
    try {
      const filename = legalDocumentFilename(sectionName, fileLanguage, isPendingDraft);
      const contents = legalDocumentFileContent(selectedDocument, fileLanguage, isPendingDraft);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
        const link = window.document.createElement('a');
        link.href = url;
        link.download = filename;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error('File sharing is not available on this device.');
        }
        const file = new File(Paths.cache, filename);
        file.create({ overwrite: true });
        file.write(contents);
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/plain',
          dialogTitle: selectedDocument.title,
          UTI: 'public.plain-text',
        });
      }
      Alert.alert('Legal page ready', 'The legal page is ready to save or share.');
    } catch (error) {
      setSaveError(translateUi(error instanceof Error ? error.message : 'The legal page could not be saved.', language));
    } finally {
      setSavingFile(false);
    }
  }

  return <Screen title={selectedDocument.title} subtitle={selectedDocument.summary}>
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
      <Action
        title={translateUi(savingFile ? 'Preparing file…' : 'Save / share this page', language)}
        icon="download"
        loading={savingFile}
        disabled={savingFile}
        testID="legal-save-document"
        onPress={() => void saveDocument()}
      />
      {saveError ? <Text accessibilityRole="alert" style={{ color: colors.destructive, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{saveError}</Text> : null}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8, marginBottom: 16 }}>
        {translateUi(
          isPendingDraft
            ? 'The saved file will be marked as a translation draft pending qualified review.'
            : 'The saved file will contain the approved English source.',
          language,
        )}
      </Text>
      {selectedDocument.sections.map((item, index) => (
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
