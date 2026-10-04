import { downloadAuthenticatedFile } from "@/lib/api"

export async function downloadInvestmentPdf(investmentId: number, reference?: string): Promise<void> {
  const ref = reference || String(investmentId)
  await downloadAuthenticatedFile(
    `/api/investor/investments/${investmentId}/pdf`,
    `investment-${ref}.pdf`,
  )
}
