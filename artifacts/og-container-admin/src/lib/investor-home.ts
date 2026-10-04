import { api } from "@/lib/api"

/**
 * Post-auth landing path for investors:
 * approved KYC → dashboard; otherwise → standalone KYC page.
 */
export async function investorHomePath(investmentModuleEnabled: boolean): Promise<string> {
  if (!investmentModuleEnabled) return "/"

  try {
    const res = await api.get<{ data: { kyc_approved?: boolean; kyc_status?: string | null } }>(
      "/api/investor/dashboard",
    )
    const status = res?.data?.kyc_status ?? "missing"
    const approved = res?.data?.kyc_approved === true || status === "approved"
    return approved ? "/invest/dashboard" : "/invest/kyc"
  } catch {
    return "/invest/kyc"
  }
}
