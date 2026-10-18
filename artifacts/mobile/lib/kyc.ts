import { first, list, record } from '@/lib/data';
import { hasVerifiedStatus, normalizeInvestorKycStatus, type InvestorKycStatus } from '@/lib/kyc-status';

export function getInvestorKycStatus(profileValue: unknown): InvestorKycStatus {
  const profile = record(profileValue);
  const kyc = record(profile.kyc);
  const rawStatus = first(
    kyc,
    ['status', 'verification_status', 'application_status', 'state'],
    first(profile, ['kyc_status', 'verification_status', 'identity_verification_status']),
  );

  if (rawStatus) return normalizeInvestorKycStatus(rawStatus);

  const personal = record(profile.personal);
  const address = record(profile.address);
  const legalName = first(personal, ['name', 'full_name'], first(profile, ['name', 'full_name']));
  const dob = first(personal, ['dob', 'date_of_birth'], first(profile, ['dob', 'date_of_birth']));
  const nationality = first(personal, ['nationality'], first(profile, ['nationality']));
  const street = first(address, ['address', 'street'], typeof profile.address === 'string' ? profile.address : first(profile, ['street']));
  const city = first(address, ['city'], first(profile, ['city']));
  const country = first(address, ['country'], first(profile, ['country']));
  const hasSavedDetails = Boolean(legalName && dob && nationality && street && city && country);
  const hasUploadedDocument = list(kyc.steps).some(step => Boolean(first(record(record(step).document), ['path'])));
  return hasSavedDetails || hasUploadedDocument ? 'In Progress' : 'Not Started';
}

export function isInvestorKycVerified(profile: unknown): boolean {
  const data = record(profile);
  const kyc = record(data.kyc);
  const identityVerification = record(data.identity_verification ?? data.identity_check);
  const kycIdentityVerification = record(kyc.identity_verification ?? kyc.identity_check);
  const statuses = [
    ...['status', 'verification_status', 'application_status', 'state'].map(key => first(kyc, [key])),
    ...['kyc_status', 'verification_status', 'identity_verification_status', 'profile_verification_status', 'profile_status', 'status'].map(key => first(data, [key])),
    ...['status', 'verification_status'].map(key => first(identityVerification, [key])),
    ...['status', 'verification_status'].map(key => first(kycIdentityVerification, [key])),
  ];
  return hasVerifiedStatus(statuses);
}