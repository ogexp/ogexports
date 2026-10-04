import { first, list, record } from '@/lib/data';

export type InvestorKycStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Under Review'
  | 'Verified'
  | 'Action Required'
  | 'Rejected'
  | string;

export function normalizeInvestorKycStatus(value: string): InvestorKycStatus {
  const key = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!key || /^(not\s*started|not provided|none)$/.test(key)) return 'Not Started';
  if (/verified|approved|passed/.test(key)) return 'Verified';
  if (/action\s*required|requires action|additional information|more information|resubmi|update required|changes requested|documents? needed|documents? required|needs? more documents/.test(key)) return 'Action Required';
  if (/reject|declin|denied/.test(key)) return 'Rejected';
  if (/under\s*review|in\s*review|review|submitted|pending|processing/.test(key)) return 'Under Review';
  if (/in\s*progress|incomplete|draft|started/.test(key)) return 'In Progress';
  return value.trim();
}

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
  return getInvestorKycStatus(profile) === 'Verified';
}

export function investorKycProgressStep(status: InvestorKycStatus): 1 | 2 | 3 | 4 {
  if (status === 'Verified') return 4;
  if (status === 'Under Review' || status === 'Action Required' || status === 'Rejected') return 3;
  if (status === 'In Progress') return 2;
  return 1;
}