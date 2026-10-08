export function investmentDownloadTarget(
  investmentId: number,
  format: "pdf" | "export",
  reference?: string,
) {
  if (!Number.isSafeInteger(investmentId) || investmentId <= 0) {
    throw new Error("A valid investment record is required before downloading.")
  }
  const ref = reference || String(investmentId)
  return {
    path: `/api/investor/investments/${investmentId}/${format}`,
    filename: `investment-${ref}.${format === "pdf" ? "pdf" : "xls"}`,
  }
}
