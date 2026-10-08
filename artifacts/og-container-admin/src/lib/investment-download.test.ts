import assert from "node:assert/strict"
import { investmentDownloadTarget } from "./investment-download-target.ts"

assert.deepEqual(investmentDownloadTarget(10_000_789, "pdf", "INV-789"), {
  path: "/api/investor/investments/10000789/pdf",
  filename: "investment-INV-789.pdf",
})

assert.deepEqual(investmentDownloadTarget(10_000_789, "export", "INV-789"), {
  path: "/api/investor/investments/10000789/export",
  filename: "investment-INV-789.xls",
})

assert.throws(() => investmentDownloadTarget(0, "pdf"), /valid investment record/)
