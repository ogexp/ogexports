import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useGetInvestorProfile, useSubmitInvestorKyc, useUpdateInvestorProfile, useUploadInvestorKycDocument } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
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
  const updateProfile = useUpdateInvestorProfile();
  const submitKyc = useSubmitInvestorKyc();
  const profile = unwrap(query.data);
  const kyc = record(profile.kyc);
  const steps = list(kyc.steps);
  const personal = record(profile.personal);
  const address = record(profile.address);
  const [selectedType, setSelectedType] = useState('passport_id');
  const selectedDocumentType = steps.some(item => first(item, ['doc_type', 'key']) === selectedType)
    ? selectedType
    : first(steps[0] ?? {}, ['doc_type', 'key'], 'passport_id');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!query.data) return;
    setName(first(personal, ['name']));
    setPhone(first(personal, ['phone']));
    setDob(first(personal, ['dob']));
    setNationality(first(personal, ['nationality']));
    setIdNumber(first(personal, ['cnic', 'id_number']));
    setCountry(first(address, ['country']));
    setCity(first(address, ['city']));
    setStreetAddress(first(address, ['address', 'street']));
    setProvince(first(address, ['province', 'state']));
    setPostalCode(first(address, ['postal_code', 'zip']));
  }, [query.data]);

  async function savePersonalDetails() {
    setError('');
    setNotice('');
    if (!name.trim() || !country.trim()) {
      setError('Enter your full name and country to continue.');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          dob: dob.trim(),
          nationality: nationality.trim(),
          cnic: idNumber.trim(),
          country: country.trim(),
          city: city.trim(),
          address: streetAddress.trim(),
          province: province.trim(),
          postal_code: postalCode.trim(),
        },
      });
      setNotice('Your personal details have been saved to your investor profile.');
      setStep(2);
      await query.refetch();
    } catch (err) {
      setError(messageOf(err));
    }
  }

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
      const result = record(await upload.mutateAsync({ data: { doc_type: selectedDocumentType, path, original_name: asset.name } }));
      setNotice(first(result, ['message'], 'Document uploaded. Its review status will be updated by OG Exports.'));
      await query.refetch();
    } catch (err) { setError(messageOf(err)); }
  }

  async function submitApplication() {
    setError('');
    setNotice('');
    const documents = steps.map(item => {
      const document = record(item.document);
      return {
        doc_type: first(item, ['doc_type', 'key']),
        path: first(document, ['path']),
        original_name: first(document, ['original_name']),
      };
    }).filter(document => document.doc_type && document.path);
    if (!steps.length || documents.length !== steps.length) {
      setError('Upload every document required by OG Exports before submitting for review.');
      return;
    }
    try {
      const result = record(await submitKyc.mutateAsync({
        data: {
          type: 'investor',
          country: country.trim(),
          payload: {
            name: name.trim(),
            phone: phone.trim(),
            dob: dob.trim(),
            nationality: nationality.trim(),
            cnic: idNumber.trim(),
            city: city.trim(),
            address: streetAddress.trim(),
            province: province.trim(),
            postal_code: postalCode.trim(),
          },
          documents,
        },
      }));
      setNotice(first(result, ['message'], 'Your application was submitted to OG Exports.'));
      await query.refetch();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return <Screen title="Identity verification" subtitle="Complete the information requested by OG Exports">
    {query.isError ? <ErrorState message="Verification status could not be loaded." onRetry={() => void query.refetch()} /> : null}
    <View style={{ flexDirection: 'row', gap: 7, marginBottom: 12 }}>
      {(['Personal details', 'Documents', 'Review'] as const).map((label, index) => {
        const active = step === index + 1;
        const complete = step > index + 1;
        return <Pressable key={label} onPress={() => {
          if (index === 0) setStep(1);
          else if (index === 1 && step > 1) setStep(2);
          else if (index === 2 && step > 1) setStep(3);
        }} style={{ flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: active || complete ? colors.primary : colors.secondary }}>
          <Text style={{ color: active || complete ? colors.primaryForeground : colors.mutedForeground, fontSize: 10, fontWeight: '700' }}>{index + 1}. {label}</Text>
        </Pressable>;
      })}
    </View>
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>APPLICATION STATUS</Text><Text style={{ color: colors.foreground, fontWeight: '700', marginTop: 5 }}>{first(kyc, ['status'], 'Not started')}</Text></View>
      <Status value={first(kyc, ['status'], 'Not started')} />
      {typeof profile.verification_pct === 'number' ? <Text style={{ color: colors.primary, fontWeight: '700' }}>{profile.verification_pct}%</Text> : null}
    </Card>
    {notice ? <Card><Text style={{ color: colors.primary, lineHeight: 20 }}>{notice}</Text></Card> : null}
    {error ? <ErrorState message={error} /> : null}

    {step === 1 ? <Card>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Personal and address details</Text>
      <Field label="Full name" value={name} onChangeText={setName} placeholder="As shown on your ID" />
      <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
      <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <Field label="Nationality" value={nationality} onChangeText={setNationality} placeholder="Nationality" />
      <Field label="ID number" value={idNumber} onChangeText={setIdNumber} placeholder="Passport, CNIC or national ID" autoCapitalize="characters" />
      <Field label="Country" value={country} onChangeText={setCountry} placeholder="Country of residence" />
      <Field label="City" value={city} onChangeText={setCity} placeholder="City" />
      <Field label="Street address" value={streetAddress} onChangeText={setStreetAddress} placeholder="Street address" multiline />
      <Field label="Province / state" value={province} onChangeText={setProvince} placeholder="Province or state" />
      <Field label="Postal code" value={postalCode} onChangeText={setPostalCode} placeholder="Postal code" autoCapitalize="none" />
      <Action title="Save and continue" icon="arrow-right" loading={updateProfile.isPending} onPress={() => void savePersonalDetails()} />
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Phone verification, ID issue/expiry dates and selfie checks are not exposed by the current investor API, so this app does not claim to verify them.</Text>
    </Card> : null}

    {step === 2 ? <>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginVertical: 8 }}>Documents requested by OG Exports</Text>
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
        <Action title="Choose file and upload" icon="upload" loading={upload.isPending} disabled={!steps.length} onPress={() => void pickAndUpload()} />
      </Card>
      <View style={{ marginBottom: 12 }}><Action title="Review application" icon="arrow-right" secondary disabled={!steps.length} onPress={() => setStep(3)} /></View>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>Uploaded files are attached to the investor application. Their verification status is controlled by OG Exports.</Text>
    </> : null}

    {step === 3 ? <>
      <Card>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Review your details</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 10, lineHeight: 20 }}>{name || 'Name not provided'} · {country || 'Country not provided'}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 4, lineHeight: 20 }}>ID number: {idNumber ? 'Provided' : 'Not provided'}</Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 13 }} />
        {steps.map((item, index) => {
          const type = first(item, ['doc_type', 'key'], `document-${index}`);
          const document = record(item.document);
          return <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <Text style={{ color: colors.foreground, flex: 1 }}>{first(item, ['label'], documentLabels[type] ?? type)}</Text>
            <Status value={first(item, ['status'], first(document, ['original_name']) ? 'Uploaded' : 'Required')} />
          </View>;
        })}
      </Card>
      <Card>
        <Text style={{ color: colors.mutedForeground, lineHeight: 20, marginBottom: 14 }}>Submitting sends these details and documents to OG Exports for review. Approval is not automatic; the status shown here updates only from the investor server.</Text>
        <Action title="Submit for review" icon="send" loading={submitKyc.isPending} disabled={!steps.length || steps.some(item => !first(record(item.document), ['path']))} onPress={() => void submitApplication()} />
        <View style={{ marginTop: 10 }}><Action title="Back to documents" secondary onPress={() => setStep(2)} /></View>
      </Card>
    </> : null}
  </Screen>;
}