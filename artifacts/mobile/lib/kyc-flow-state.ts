export type InvestorKycFlowStep = 1 | 2 | 3 | 4;
export type InvestorKycFormStep = 1 | 2 | 3;

export function getInvestorKycFlowState(
  status: string,
  hasSavedPersonalDetails: boolean,
  requiredDocumentsComplete: boolean,
): {
  isReadOnly: boolean;
  progressStep: InvestorKycFlowStep;
  resumeStep: InvestorKycFormStep;
} {
  const normalizedStatus = status.trim().toLowerCase();
  const isReadOnly = normalizedStatus === 'verified' || normalizedStatus === 'approved';
  const progressStep: InvestorKycFlowStep = isReadOnly
    ? 4
    : requiredDocumentsComplete
      ? 3
      : hasSavedPersonalDetails
        ? 2
        : 1;

  return {
    isReadOnly,
    progressStep,
    resumeStep: progressStep === 4 ? 3 : progressStep,
  };
}
