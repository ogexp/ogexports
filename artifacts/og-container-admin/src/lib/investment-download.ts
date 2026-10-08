import { downloadAuthenticatedFile } from "@/lib/api"
import { investmentDownloadTarget } from "@/lib/investment-download-target"

export async function downloadInvestmentPdf(investmentId: number, reference?: string): Promise<void> {
  const target = investmentDownloadTarget(investmentId, "pdf", reference)
  await downloadAuthenticatedFile(target.path, target.filename)
}

export async function downloadInvestmentExport(investmentId: number, reference?: string): Promise<void> {
  const target = investmentDownloadTarget(investmentId, "export", reference)
  await downloadAuthenticatedFile(target.path, target.filename)
}
