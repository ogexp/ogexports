// Stub values for @workspace/api-zod

export const SetAccountTypeInputAccountType = {
  buyer: "buyer",
  supplier: "supplier",
  investor: "investor",
  admin: "admin",
} as const;
export type SetAccountTypeInputAccountType =
  (typeof SetAccountTypeInputAccountType)[keyof typeof SetAccountTypeInputAccountType];

export const SetAccountTypeInputEntityType = {
  individual: "individual",
  company: "company",
} as const;
export type SetAccountTypeInputEntityType =
  (typeof SetAccountTypeInputEntityType)[keyof typeof SetAccountTypeInputEntityType];

export interface StartIndividualKycBody {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  idType: string;
  idNumber: string;
}

export interface SubmitCompanyKycBody {
  companyName: string;
  registrationNumber: string;
  country: string;
  address: string;
  representativeName: string;
  representativeTitle: string;
}
