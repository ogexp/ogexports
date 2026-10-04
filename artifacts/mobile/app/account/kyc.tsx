import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useGetInvestorProfile, useUploadInvestorKycDocument } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Screen, Status } from '@/components/InvestorUI';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { uploadInvestorFile } from '@/lib/file-upload';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const documentLabels: Record<string, string> = {
  passport_id: 'Passport / national ID',
  proof_of_address: 'Proof of address',
  tax_certificate: 'Tax certificate',
};

export default function Kyc() {
  const { token, apiOrigin } = useAuth();
  const colors = useColors();
  const query = useGetInvestorProfile({ query: { queryKey: ['investor-profile'], enabled: !!token } });
  const upload = useUploadInvestorKycDocument();
  const profile = unwrap(query.data);
  const kyc = record(profile.kyc);
  const steps = list(kyc.steps);
  const [selectedType, setSelectedType] = useState('passport_id');
  const selectedDocumentType = steps.some(item => first(item, ['doc_type', 'key']) === selectedType)
    ? selectedType
    : first(steps[0] ?? {}, ['doc_type', 'key'], 'passport_id');
  const [error, setError] = useState('');

  async function pickAndUpload() {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      setError('Choose a document smaller than 10 MB.');
      return;
    }
    try {
      const path = await uploadInvestorFile(asset.uri, asset.name, asset.mimeType ?? 'application/octet-stream', 'kyc', apiOrigin);
      await upload.mutateAsync({ data: { doc_type: selectedDocumentType, path, original_name: asset.name } });
      Alert.alert('Document sent', 'Your document has been uploaded for review.');
      void query.refetch();
    } catch (err) { setError(messageOf(err)); }
  }

  return <Screen title="Identity verification" subtitle="Upload the documents required for your investor account">
    {query.isError ? <ErrorState message="Verification status could not be loaded." onRetry={() => void query.refetch()} /> : null}
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>APPLICATION STATUS</Text><Text style={{ color: colors.foreground, fontWeight: '700', marginTop: 5 }}>{first(kyc, ['status'], 'Not started')}</Text></View>
      <Status value={first(kyc, ['status'], 'Not started')} />
      {typeof profile.verification_pct === 'number' ? <Text style={{ color: colors.primary, fontWeight: '700' }}>{profile.verification_pct}%</Text> : null}
    </Card>

    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginVertical: 8 }}>Required documents</Text>
    {steps.map((item, index) => {
      const type = first(item, ['doc_type', 'key'], `document-${index}`);
      const document = record(item.document);
      const status = first(item, ['status'], 'Pending');
      const selected = type === selectedDocumentType;
      return <Pressable key={type} onPress={() => setSelectedType(type)}>
        <Card style={{ borderColor: selected ? colors.primary : colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.foreground, fontWeight: '700' }}>{first(item, ['label'], documentLabels[type] ?? 'Verification document')}</Text><Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{first(item, ['desc'], 'Upload a clear copy of this document.')}</Text></View>
            <Status value={status} />
          </View>
          {first(document, ['original_name']) ? <Text numberOfLines={1} style={{ color: colors.primary, fontSize: 12, marginTop: 10 }}>On file: {first(document, ['original_name'])}</Text> : null}
        </Card>
      </Pressable>;
    })}
    {!query.isLoading && steps.length === 0 ? <Card><Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>No document requirements are available from the investor server right now.</Text></Card> : null}
    <Card>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Upload a document</Text>
      <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginBottom: 12 }}>Selected: {documentLabels[selectedDocumentType] ?? selectedDocumentType}. PDF and image files up to 10 MB are supported.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.destructive, marginBottom: 12 }}>{error}</Text> : null}
      <Action title="Choose file and upload" icon="upload" loading={upload.isPending} disabled={!steps.length} onPress={() => void pickAndUpload()} />
    </Card>
    <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17 }}>Files are uploaded to the configured OG Exports investor server and attached to your application for review.</Text>
  </Screen>;
}