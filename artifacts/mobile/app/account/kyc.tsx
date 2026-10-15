import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LocalizedText as Text } from '@/components/LocalizedText';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile } from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { useGetInvestorProfile, useSubmitInvestorKyc, useUpdateInvestorProfile, useUploadInvestorKycDocument } from '@workspace/api-client-react';
import { Action, Card, ErrorState, Field, Screen, Status } from '@/components/InvestorUI';
import { CountryPicker } from '@/components/CountryPicker';
import { DateOfBirthPicker } from '@/components/DateOfBirthPicker';
import { first, list, messageOf, record, unwrap } from '@/lib/data';
import { countryForApi, kycProfileCountry } from '@/lib/countries';
import { uploadInvestorFile } from '@/lib/file-upload';
import { INVESTOR_DOCUMENT_MIME_TYPES } from '@/lib/upload-rules';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getInvestorKycStatus } from '@/lib/kyc';
import { getInvestorKycFlowState } from '@/lib/kyc-flow-state';
import { MotionProgress, motionHaptic } from '@/lib/motion';

const FALLBACK_KYC_STEPS: Record<string, unknown>[] = [
  {
    key: 'passport_id',
    doc_type: 'passport_id',
    label: 'Passport / National ID',
    desc: 'Government-issued ID (CNIC, Passport, or National ID)',
    status: 'pending',
    document: null,
  },
  {
    key: 'proof_of_address',
    doc_type: 'proof_of_address',
    label: 'Proof of Address',
    desc: 'Utility bill, bank statement, or official letter (last 3 months)',
    status: 'pending',
    document: null,
  },
  {
    key: 'tax_certificate',
    doc_type: 'tax_certificate',
    label: 'Tax Certificate / NTN',
    desc: 'Tax certificate, NTN, or equivalent tax registration',
    status: 'pending',
    document: null,
  },
];

const documentLabels: Record<string, string> = {
  passport: 'Passport',
  passport_id: 'Passport / National ID',
  national_id: 'National ID',
  national_id_card: 'National ID',
  cnic: 'National ID',
  drivers_license: 'Driver’s license',
  other: 'Other supported document',
  other_document: 'Other supported document',
  proof_of_address: 'Proof of address',
  bank_statement: 'Bank statement',
  tax_certificate: 'Tax Certificate / NTN',
};

export default function Kyc() {
  const { token, apiOrigin, user } = useAuth();
  const colors = useColors();
  const query = useGetInvestorProfile({
    query: {
      queryKey: ['investor-profile'],
      enabled: !!token,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchInterval: currentQuery => {
        const currentProfile = unwrap(currentQuery.state.data);
        return getInvestorKycStatus(currentProfile) === 'Under Review' ? 15_000 : false;
      },
      refetchIntervalInBackground: false,
    },
  });
  const upload = useUploadInvestorKycDocument();
  const updateProfile = useUpdateInvestorProfile();
  const submitKyc = useSubmitInvestorKyc();
  const profile = unwrap(query.data);
  const kyc = record(profile.kyc);
  const serverSteps = list(kyc.steps);
  const steps = serverSteps.length ? serverSteps : FALLBACK_KYC_STEPS;
  const personal = record(profile.personal);
  const address = record(profile.address);
  const flatStreetAddress = typeof profile.address === 'string' ? profile.address : first(profile, ['street']);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const hasInitializedStep = useRef(false);
  const isSupportingDocument = (item: Record<string, unknown>) => /address|utility|bank.?statement|government.?document|tax|certificate|ntn/i.test(first(item, ['doc_type', 'key', 'label']));
  const supportingSteps = steps.filter(isSupportingDocument);
  const status = query.isLoading ? 'Loading' : getInvestorKycStatus(profile);
  const isVerified = status === 'Verified';
  const isUnderReview = status === 'Under Review';
  const requiresUpdate = status === 'Action Required' || status === 'Rejected';
  const savedPersonalDetails = Boolean(
    (first(personal, ['name', 'full_name']) || first(profile, ['name', 'full_name']))
      && (first(personal, ['dob', 'date_of_birth']) || first(profile, ['dob', 'date_of_birth']))
      && (first(personal, ['nationality']) || first(profile, ['nationality']))
      && (first(address, ['address', 'street']) || flatStreetAddress)
      && (first(address, ['city']) || first(profile, ['city']))
      && (first(address, ['country']) || first(profile, ['country'])),
  );
  const allRequiredDocumentsUploaded = steps.length > 0
    && steps.every(item => Boolean(first(record(item.document), ['path'])));
  const { isReadOnly, progressStep, resumeStep } = getInvestorKycFlowState(
    status,
    savedPersonalDetails,
    allRequiredDocumentsUploaded,
  );
  const loginEmail = first(record(user), ['email'], first(personal, ['email']));
  const statusNote = first(kyc, ['action_required_reason', 'rejection_reason', 'review_note', 'message']);
  const identityCheckStatus = first(record(kyc.identity_check ?? kyc.identity_verification ?? profile.identity_check ?? profile.identity_verification), ['verification_status', 'status'], first(kyc, ['identity_check_status', 'identity_verification_status'], first(profile, ['identity_check_status', 'identity_verification_status'])));
  const livenessStatus = first(kyc, ['selfie_status', 'liveness_status'], first(profile, ['selfie_verification_status', 'liveness_status']));
  const bankVerification = record(kyc.bank_account_verification ?? profile.bank_account_verification);
  const bankVerificationStatus = first(bankVerification, ['verification_status', 'status'], first(kyc, ['bank_verification_status'], first(profile, ['bank_account_verification_status'])));
  const addressVerificationStatus = supportingSteps.length
    ? supportingSteps.map(item => first(record(item.document), ['review_status', 'status'], first(item, ['status'], first(record(item.document), ['original_name']) ? 'Uploaded' : 'Not uploaded'))).join(' · ')
    : '—';
  const statusMessage = isVerified
    ? 'OG Exports has confirmed your identity verification. Investment eligibility is checked by the server.'
    : isUnderReview
      ? allRequiredDocumentsUploaded
        ? 'Your documents were submitted. OG Exports controls the review and will update this status.'
        : 'The server currently reports your application as under review. Upload any remaining required documents; only OG Exports can change your verification status.'
      : requiresUpdate
        ? statusNote || (status === 'Rejected' ? 'OG Exports did not approve this application. Review your details and documents before submitting again.' : 'OG Exports requested additional information. Review your details and documents before resubmitting.')
        : 'Complete the requested information and documents. Your status changes only when confirmed by OG Exports.';
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
  const [documentPicking, setDocumentPicking] = useState(false);
  const [uploadingDocumentType, setUploadingDocumentType] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setName(first(personal, ['name', 'full_name'], first(profile, ['name', 'full_name'])));
    setPhone(first(personal, ['phone'], first(profile, ['phone'])));
    setDob(first(personal, ['dob', 'date_of_birth'], first(profile, ['dob', 'date_of_birth'])));
    setNationality(first(personal, ['nationality'], first(profile, ['nationality'])));
    setIdNumber(first(personal, ['cnic', 'id_number'], first(profile, ['cnic', 'id_number'])));
    setCountry(kycProfileCountry(profile));
    setCity(first(address, ['city'], first(profile, ['city'])));
    setStreetAddress(first(address, ['address', 'street'], flatStreetAddress));
    setProvince(first(address, ['province', 'state'], first(profile, ['province', 'state'])));
    setPostalCode(first(address, ['postal_code', 'zip'], first(profile, ['postal_code', 'zip'])));
    if (!hasInitializedStep.current) {
      hasInitializedStep.current = true;
      setStep(resumeStep);
    }
  }, [query.data]);

  useFocusEffect(useCallback(() => {
    if (token) void query.refetch();
  }, [query.refetch, token]));

  async function savePersonalDetails() {
    setError('');
    setNotice('');
    const normalizedDob = dob.trim();
    const parsedDob = new Date(`${normalizedDob}T00:00:00.000Z`);
    if (!name.trim() || !normalizedDob || !nationality.trim() || !country.trim() || !city.trim() || !streetAddress.trim()) {
      setError('Enter your full legal name, date of birth, nationality, and complete residential address to continue.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob) || Number.isNaN(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== normalizedDob) {
      setError('Enter a valid date of birth in YYYY-MM-DD format.');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          dob: normalizedDob,
          nationality: nationality.trim(),
          country: countryForApi(country),
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
      motionHaptic('error');
      setError(messageOf(err));
    }
  }

  async function pickAndUpload(documentType: string) {
    setError('');
    setDocumentPicking(true);
    setUploadingDocumentType(documentType);
    try {
      let uploadSource: string | ExpoFile;
      let fileName: string;
      let mimeType: string;
      if (Platform.OS === 'web') {
        const pickerResult = await DocumentPicker.getDocumentAsync({ type: [...INVESTOR_DOCUMENT_MIME_TYPES], copyToCacheDirectory: true });
        if (pickerResult.canceled) return;
        const asset = pickerResult.assets[0];
        if (!asset) throw new Error('No file was selected. Try again.');
        uploadSource = asset.uri;
        fileName = asset.name;
        mimeType = asset.mimeType ?? 'application/octet-stream';
      } else {
        const pickerResult = await ExpoFile.pickFileAsync({ mimeTypes: [...INVESTOR_DOCUMENT_MIME_TYPES] });
        if (pickerResult.canceled) return;
        uploadSource = pickerResult.result;
        fileName = pickerResult.result.name;
        mimeType = pickerResult.result.type || 'application/octet-stream';
      }
      const path = await uploadInvestorFile(uploadSource, fileName, mimeType, 'kyc', apiOrigin);
       const uploadResult = record(await upload.mutateAsync({ data: { doc_type: documentType, path, original_name: fileName } }));
      setNotice(first(uploadResult, ['message'], 'Document uploaded. Its review status will be updated by OG Exports.'));
      await query.refetch();
    } catch (err) { motionHaptic('error'); setError(messageOf(err)); }
    finally {
      setDocumentPicking(false);
      setUploadingDocumentType(null);
    }
  }

  async function submitApplication() {
    setError('');
    setNotice('');
    const normalizedDob = dob.trim();
    const parsedDob = new Date(`${normalizedDob}T00:00:00.000Z`);
    if (!name.trim() || !normalizedDob || !nationality.trim() || !country.trim() || !city.trim() || !streetAddress.trim()) {
      setError('Complete and save your personal information before submitting.');
      setStep(1);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob) || Number.isNaN(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== normalizedDob) {
      setError('Enter a valid date of birth in YYYY-MM-DD format.');
      setStep(1);
      return;
    }
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
      await updateProfile.mutateAsync({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          dob: normalizedDob,
          nationality: nationality.trim(),
          country: countryForApi(country),
          city: city.trim(),
          address: streetAddress.trim(),
          province: province.trim(),
          postal_code: postalCode.trim(),
        },
      });
      const result = record(await submitKyc.mutateAsync({
        data: {
          type: 'investor',
          country: countryForApi(country),
          payload: {
            name: name.trim(),
            phone: phone.trim(),
            dob: normalizedDob,
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
      motionHaptic('error');
      setError(messageOf(err));
    }
  }

  async function contactCompliance() {
    setError('');
    try {
      await Linking.openURL('mailto:info@ogexports.co?subject=Investor%20KYC%20Verification');
    } catch {
      setError('Unable to open your email app.');
    }
  }

  function renderDocumentGroup(requirements: Record<string, unknown>[], title: string, includeIdNumber = false) {
    const hasIdentityDocument = requirements.some(item => /passport|national.?id|cnic|driver.?s.?license/i.test(first(item, ['doc_type', 'key', 'label'])));
    return <>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginVertical: 8 }}>{title}</Text>
      {includeIdNumber && hasIdentityDocument ? <Field label="Document number" value={idNumber} onChangeText={setIdNumber} placeholder="Passport, national ID or license number" autoCapitalize="characters" /> : null}
      {requirements.map((item, index) => {
        const type = first(item, ['doc_type', 'key'], `document-${index}`);
        const document = record(item.document);
        const status = first(item, ['status'], first(document, ['original_name']) ? 'Uploaded' : 'Not uploaded');
        const label = first(item, ['label'], documentLabels[type] ?? 'Verification document');
        const uploadedName = first(document, ['original_name']);
        const isUploading = uploadingDocumentType === type && (documentPicking || upload.isPending);
        return <Card key={type} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="file-text" size={17} color={colors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.foreground, fontWeight: '700' }}>{label}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{first(item, ['desc'], 'Upload a clear copy of this document.')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${uploadedName ? 'Replace' : 'Upload'} ${label}`}
              accessibilityState={{ disabled: documentPicking, busy: isUploading }}
              disabled={documentPicking}
              testID={`button-upload-kyc-${type}`}
              onPress={() => void pickAndUpload(type)}
              style={({ pressed }) => ({
                minWidth: 82,
                minHeight: 40,
                paddingHorizontal: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: pressed ? colors.lightGreen : colors.secondary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                opacity: documentPicking && !isUploading ? 0.55 : 1,
              })}
            >
              {isUploading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Feather name={uploadedName ? 'refresh-cw' : 'upload'} size={14} color={colors.primary} />}
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{isUploading ? 'Uploading' : uploadedName ? 'Replace' : 'Upload'}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Status value={status} />
            <Text numberOfLines={1} style={{ flex: 1, color: colors.mutedForeground, fontSize: 11, textAlign: 'right' }}>{uploadedName || 'No file uploaded'}</Text>
          </View>
        </Card>;
      })}
      {!query.isLoading && requirements.length === 0 ? <Card><Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>No {title.toLowerCase()} requirements are available from OG Exports right now.</Text></Card> : null}
      <Card>
        <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginBottom: 12 }}>Upload a clear copy for every required document. PDF and image files up to 10 MB are supported.</Text>
        <Action
          title="Submit for review"
          icon="send"
          loading={submitKyc.isPending || updateProfile.isPending}
          disabled={!savedPersonalDetails || !allRequiredDocumentsUploaded}
          testID="button-submit-kyc-for-review"
          onPress={() => void submitApplication()}
        />
      </Card>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 12 }}>Uploaded files are attached to the investor application. Their verification status is controlled by OG Exports.</Text>
    </>;
  }

  function renderUploadedDocuments() {
    const uploadedDocuments = steps.filter(item => Boolean(first(record(item.document), ['path'])));
    return <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <Feather name="file-text" size={17} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Uploaded documents</Text>
      </View>
      {uploadedDocuments.length === 0
        ? <Text style={{ color: colors.mutedForeground, lineHeight: 20 }}>No documents uploaded yet. Upload the listed requirements to continue.</Text>
        : uploadedDocuments.map((item, index) => {
          const type = first(item, ['doc_type', 'key'], `document-${index}`);
          const document = record(item.document);
          return <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Feather name="file" size={16} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.foreground, fontWeight: '600' }}>{first(document, ['original_name'], first(item, ['label'], documentLabels[type] ?? type))}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{first(item, ['label'], documentLabels[type] ?? type)}</Text>
            </View>
            <Status value={first(item, ['status'], 'Uploaded')} />
          </View>;
        })}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 10 }}>Uploaded files are attached to the investor application. Their verification status is controlled by OG Exports.</Text>
    </Card>;
  }

  function renderVerificationChecks() {
    const checks = [
      ['Identity document review', identityCheckStatus || 'Not available from OG Exports'],
      ['Supporting document review', addressVerificationStatus],
      ['Selfie / liveness check', livenessStatus || 'Not available from OG Exports'],
      ['Bank-account verification', bankVerificationStatus || 'Not available from OG Exports'],
    ];
    return <Card>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Verification checks</Text>
      {checks.map(([label, value]) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={{ color: colors.mutedForeground, flex: 1 }}>{label}</Text>
        <Status value={value} />
      </View>)}
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 8 }}>Only statuses returned by OG Exports are shown. This app does not perform selfie, liveness, or bank-ownership checks.</Text>
    </Card>;
  }

  function renderApplicationSummary(title: string) {
    return <Card>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 10, lineHeight: 20 }}>Legal name: {name || '—'}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 4, lineHeight: 20 }}>Account email: {loginEmail || '—'} · Phone: {phone || '—'}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 4, lineHeight: 20 }}>Date of birth: {dob || '—'} · Nationality: {nationality || '—'}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 4, lineHeight: 20 }}>Residential address: {[streetAddress, city, province, postalCode, country].filter(Boolean).join(', ') || '—'}</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 4, lineHeight: 20 }}>Identity document number: {idNumber ? 'Provided' : '—'}</Text>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 13 }} />
      {steps.map((item, index) => {
        const type = first(item, ['doc_type', 'key'], `document-${index}`);
        const document = record(item.document);
        return <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Text style={{ color: colors.foreground, flex: 1 }}>{first(item, ['label'], documentLabels[type] ?? type)}</Text>
          <Status value={first(item, ['status'], first(document, ['original_name']) ? 'Uploaded' : 'Not uploaded')} />
        </View>;
      })}
    </Card>;
  }

  const stageLabels = ['Personal', 'Documents', 'Review', 'Completed'] as const;

  return <Screen title="Investor verification" subtitle="Submit identity and address details for OG Exports review">
    {query.isError ? <ErrorState message="Verification status could not be loaded." error={query.error} onRetry={() => void query.refetch()} /> : null}
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}><Feather name="shield" size={19} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>APPLICATION STATUS</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{statusMessage}</Text>
      </View>
      <Status value={status} />
    </Card>
    {isUnderReview ? <View style={{ marginBottom: 16 }}>
      <Action
        title="Refresh verification status"
        secondary
        icon="refresh-cw"
        loading={query.isFetching}
        onPress={() => void query.refetch()}
      />
    </View> : null}

    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>Verification progress</Text>
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Step {progressStep} of 4</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {stageLabels.map((label, index) => {
          const stageNumber = index + 1;
          const complete = stageNumber < progressStep || (isVerified && stageNumber === 4);
      const active = isReadOnly ? stageNumber === progressStep : stageNumber === step;
          const canOpen = !isReadOnly && stageNumber <= 3 && (stageNumber <= step || stageNumber <= progressStep);
          const highlighted = complete || active;
          return <Pressable key={label} disabled={!canOpen} accessibilityRole="button" accessibilityState={{ selected: active || (isVerified && stageNumber === 4), disabled: !canOpen }} onPress={() => setStep(stageNumber as 1 | 2 | 3)} style={{ flex: 1, alignItems: 'center', opacity: canOpen || highlighted ? 1 : 0.7 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: highlighted ? colors.primary : colors.secondary }}>
              <Text style={{ color: highlighted ? colors.primaryForeground : colors.mutedForeground, fontSize: 10, fontWeight: '700' }}>{complete ? '✓' : stageNumber}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: highlighted ? colors.foreground : colors.mutedForeground, fontSize: 9, fontWeight: active ? '700' : '500', marginTop: 5, textAlign: 'center' }}>{label}</Text>
          </Pressable>;
        })}
      </View>
      <MotionProgress
        value={Math.max(0, Math.min(100, ((progressStep - 1) / 3) * 100))}
        height={4}
        color={colors.primary}
        trackColor={colors.secondary}
        style={{ marginTop: 9 }}
        accessibilityLabel={`KYC progress: step ${progressStep} of 4`}
      />
    </Card>

    {notice ? <Card><Text style={{ color: colors.primary, lineHeight: 20 }}>{notice}</Text></Card> : null}
    {error ? <ErrorState message={error} /> : null}

    {query.isLoading ? <Card><Text style={{ color: colors.mutedForeground }}>Loading your verification profile…</Text></Card> : null}
    {!query.isLoading && !query.isError && isReadOnly ? <>
      {renderApplicationSummary(isVerified ? 'Verified identity details' : 'Submitted application')}
      {renderVerificationChecks()}
      <View style={{ marginBottom: 16 }}>
        <Action title="Refresh verification status" secondary icon="refresh-cw" loading={query.isFetching} onPress={() => void query.refetch()} />
      </View>
    </> : null}

    {!query.isLoading && !query.isError && !isReadOnly ? <>
      {requiresUpdate ? <Card style={{ borderColor: colors.destructive }}>
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>{status === 'Rejected' ? 'Application rejected' : 'Update requested'}</Text>
        <Text style={{ color: colors.mutedForeground, lineHeight: 19, marginTop: 6 }}>{statusMessage}</Text>
      </Card> : null}

      {step === 1 ? <Card>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Step 1 · Personal information</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>Use the legal details shown on your identity document.</Text>
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.secondary, marginBottom: 12 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700' }}>ACCOUNT EMAIL</Text>
          <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 5 }}>{loginEmail || '—'}</Text>
        </View>
        <Field label="Full legal name (required)" value={name} onChangeText={setName} placeholder="As shown on your identity document" autoCapitalize="words" />
        <Field label="Phone number (optional)" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
        <DateOfBirthPicker label="Date of birth (required)" value={dob} onChange={setDob} />
        <Field label="Nationality (required)" value={nationality} onChangeText={setNationality} placeholder="Nationality" autoCapitalize="words" />
        <CountryPicker label="Country of residence (required)" value={country} onChange={setCountry} placeholder="Select country" />
        <Field label="City (required)" value={city} onChangeText={setCity} placeholder="City" autoCapitalize="words" />
        <Field label="Street address (required)" value={streetAddress} onChangeText={setStreetAddress} placeholder="Street address" multiline />
        <Field label="Province / state" value={province} onChangeText={setProvince} placeholder="Province or state" />
        <Field label="Postal code" value={postalCode} onChangeText={setPostalCode} placeholder="Postal code" autoCapitalize="characters" />
        <Action title="Save and continue" icon="arrow-right" loading={updateProfile.isPending} onPress={() => void savePersonalDetails()} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 12 }}>Required fields are saved to your investor profile before document submission. OG Exports remains the source of verification decisions.</Text>
      </Card> : null}

      {step === 2 ? renderDocumentGroup(steps, 'Step 2 · Required documents', true) : null}

      {step === 3 ? <>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700', marginVertical: 8 }}>Step 3 · Verification review</Text>
        {renderVerificationChecks()}
        {renderApplicationSummary('Review your information')}
        <Card>
          <Text style={{ color: colors.mutedForeground, lineHeight: 20, marginBottom: 14 }}>Submitting sends these details and documents to OG Exports. Approval is not automatic; this app will show Verified only after the investor server confirms it.</Text>
          <Action title="Submit for review" icon="send" loading={submitKyc.isPending || updateProfile.isPending} disabled={!savedPersonalDetails || !steps.length || steps.some(item => !first(record(item.document), ['path']))} onPress={() => void submitApplication()} />
          <View style={{ marginTop: 10 }}><Action title="Back to documents" secondary onPress={() => setStep(2)} /></View>
        </Card>
      </> : null}
    </> : null}
    {!query.isLoading && !query.isError ? renderUploadedDocuments() : null}
    {!query.isLoading && !query.isError ? <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <Feather name="help-circle" size={17} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontWeight: '700' }}>Need help?</Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginBottom: 11 }}>
        Our compliance team can assist with your KYC verification.
      </Text>
      <Action title="Contact compliance" icon="mail" secondary onPress={() => void contactCompliance()} />
    </Card> : null}
  </Screen>;
}
