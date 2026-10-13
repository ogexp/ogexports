import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Action, Card, Screen } from '@/components/InvestorUI';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useColors } from '@/hooks/useColors';
import { useAppPreferences } from '@/context/AppPreferencesContext';
import { translateUi, type AppLanguage } from '@/lib/strings';

const dataRequestCopy = {
  access: {
    subject: 'Personal data access request',
    body: 'Please treat this support ticket as a request to access my personal data. I understand OG Exports Support may need to verify my identity and confirm what actions are available.',
  },
  correction: {
    subject: 'Personal data correction request',
    body: 'Please treat this support ticket as a request to have my personal data corrected. I understand OG Exports Support may need to verify my identity and confirm what actions are available.',
  },
  deletion: {
    subject: 'OG Exports account and data deletion request',
    body: 'I am requesting deletion of my OG Exports account and associated personal data. Please verify my account ownership and review any active investments and legal or regulatory retention requirements. Please delete or anonymize data that is eligible for removal. I understand this request does not delete my account immediately, and records required for legal or contractual purposes may need to be retained. Please let me know the outcome of your review.',
  },
} as const;

function openDataRequest(kind: keyof typeof dataRequestCopy, language: AppLanguage) {
  const copy = dataRequestCopy[kind];
  router.push({
    pathname: '/account/messages',
    params: {
      mode: 'tickets',
      subject: translateUi(copy.subject, language),
      body: translateUi(copy.body, language),
    },
  } as never);
}

export default function DataPreferences() {
  const colors = useColors();
  const { preferences } = useAppPreferences();

  return <Screen title="Data preferences" subtitle="Privacy information and account data requests">
    <Card>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>Privacy policy</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        Open the official privacy information published by OG Exports. If it has not been provided by the server, the app will show that it is unavailable.
      </Text>
      <Action title="View official Privacy Policy" icon="file-text" secondary onPress={() => router.push('/account/legal/privacy' as never)} />
    </Card>

    <Card>
      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 8 }}>ACCOUNT &amp; DATA</Text>
      <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', marginBottom: 7 }}>Request account and data deletion</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
        This opens an editable Support ticket. OG Exports Support will verify account ownership, review active investments and legal or contractual retention requirements, then delete or anonymize eligible data. Submitting the request does not delete your account immediately.
      </Text>
      <View style={{ borderLeftWidth: 2, borderLeftColor: colors.accent, paddingLeft: 12, marginBottom: 16 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
          Some investment, transaction, or compliance records may need to be retained. Support will assess what can be removed after review.
        </Text>
      </View>
      <Action
        title="Request account and data deletion"
        icon="trash-2"
        onPress={() => openDataRequest('deletion', preferences.language)}
        testID="request-account-data-deletion"
      />
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>Request help with your data</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        Access and correction requests open an editable Support ticket. Support will review each request and may verify your identity.
      </Text>
      <View style={{ gap: 12 }}>
        <Action title="Request data access" icon="eye" secondary onPress={() => openDataRequest('access', preferences.language)} testID="request-data-access" />
        <Action title="Request a data correction" icon="edit-2" secondary onPress={() => openDataRequest('correction', preferences.language)} testID="request-data-correction" />
      </View>
    </Card>

    <Card>
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>Account and legal controls</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        Use existing session controls to review or revoke signed-in devices. Legal documents are shown only when OG Exports provides official content.
      </Text>
      <View style={{ gap: 12 }}>
        <Action title="Review account sessions" icon="smartphone" secondary onPress={() => router.push('/account/security' as never)} />
        <Action title="View Investment Terms" icon="file-text" secondary onPress={() => router.push('/account/legal/investment-terms' as never)} />
        <Action title="View User Agreement" icon="file-text" secondary onPress={() => router.push('/account/legal/user-agreement' as never)} />
      </View>
    </Card>
  </Screen>;
}
