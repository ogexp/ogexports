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
    subject: 'Personal data deletion request',
    body: 'Please treat this support ticket as a request to have my personal data deleted. I understand OG Exports Support may need to verify my identity and confirm what actions are available.',
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
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>Request help with your data</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
        These actions open an editable Support ticket. They do not access, correct, or delete account data automatically; Support will review the request and may verify your identity.
      </Text>
      <View style={{ gap: 12 }}>
        <Action title="Request data access" icon="eye" secondary onPress={() => openDataRequest('access', preferences.language)} />
        <Action title="Request a data correction" icon="edit-2" secondary onPress={() => openDataRequest('correction', preferences.language)} />
        <Action title="Request data deletion" icon="trash-2" secondary onPress={() => openDataRequest('deletion', preferences.language)} />
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
