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
  if (/\b(unverified|unapproved|not verified|not approved|not passed|failed verification|verification failed)\b/.test(key)) return 'In Progress';
  if (/(^|\s)(verified|approved|passed)(\s|$)/.test(key)) return 'Verified';
  if (/action\s*required|requires action|additional information|more information|resubmi|update required|changes requested|documents? needed|documents? required|needs? more documents/.test(key)) return 'Action Required';
  if (/reject|declin|denied/.test(key)) return 'Rejected';
  if (/under\s*review|in\s*review|review|submitted|pending|processing/.test(key)) return 'Under Review';
  if (/in\s*progress|incomplete|draft|started/.test(key)) return 'In Progress';
  return value.trim();
}

export function isVerifiedStatus(value: string): boolean {
  return normalizeInvestorKycStatus(value) === 'Verified';
}

export function hasVerifiedStatus(values: Array<string | undefined>): boolean {
  return values.some(value => value && isVerifiedStatus(value));
}
