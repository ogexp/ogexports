export type TransactionReceiptKind = "deposit" | "withdrawal" | "investment" | "transaction"

export type TransactionReceipt = {
  kind: TransactionReceiptKind
  title: string
  reference: string
  recordId: string
  amount: string
  currency: string
  status: string
  submittedAt: string
  settlementAt: string
  paymentReference: string
  projectReference: string
  fee: string
  feeCurrency: string
  totalDebit: string
  totalDebitCurrency: string
  statusNote: string
  filename: string
}

type ReceiptRecord = Record<string, unknown>

function asRecord(value: unknown): ReceiptRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as ReceiptRecord
    : {}
}

function rawText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function recordsFor(value: unknown): ReceiptRecord[] {
  const outer = asRecord(value)
  const data = asRecord(outer.data)
  const detail = asRecord(
    data.investment ?? data.position ?? data.deposit ?? data.withdrawal
    ?? outer.investment ?? outer.position ?? outer.deposit ?? outer.withdrawal,
  )
  return [detail, data, outer].filter((item, index, all) => item !== all[index - 1])
}

function firstServerValue(records: ReceiptRecord[], keys: string[]): string {
  for (const item of records) {
    for (const key of keys) {
      const value = rawText(item[key])
      if (value) return value
    }
  }
  return ""
}

function statusExplanation(kind: TransactionReceiptKind, status: string): string {
  const normalized = status.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  if (!normalized) return "OG Exports did not provide a status. Settlement is not confirmed."

  const completedStatuses = kind === "deposit"
    ? ["credited", "completed", "settled"]
    : kind === "withdrawal"
      ? ["settled", "completed", "paid", "paid out", "transferred"]
      : ["completed", "settled", "confirmed", "success", "successful"]
  if (completedStatuses.includes(normalized)) {
    return kind === "withdrawal"
      ? `OG Exports reports this withdrawal as ${status}. This receipt records the server status but does not independently verify receipt by an external bank.`
      : `OG Exports reports this ${kind} as ${status}. This receipt records the status returned by OG Exports.`
  }
  if (["approved", "active"].includes(normalized)) {
    return kind === "deposit"
      ? `OG Exports reports this deposit as ${status}. Approval does not confirm that the wallet was credited.`
      : kind === "withdrawal"
        ? `OG Exports reports this withdrawal as ${status}. Approval does not confirm that funds were transferred.`
        : `OG Exports reports this investment as ${status}. Approval does not mean the investment is settled or complete.`
  }
  if (["rejected", "declined", "failed", "error", "cancelled", "canceled"].includes(normalized)) {
    return `OG Exports reports this ${kind} as ${status}. This receipt does not claim completion or settlement.`
  }
  return `This receipt records a ${kind} request and its current server status (${status}); submission does not confirm settlement or a funds transfer.`
}

function safeFilename(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "-").replace(/-+/g, "-").slice(0, 70)
}

export function createTransactionReceipt(kind: TransactionReceiptKind, value: unknown): TransactionReceipt {
  const records = recordsFor(value)
  const project = records.map(item => asRecord(item.project)).find(item => Object.keys(item).length > 0) ?? {}
  const projectMeta = asRecord(project.meta)
  const statusKeys = kind === "deposit"
    ? ["review_status", "status", "state"]
    : kind === "withdrawal"
      ? ["status", "state", "withdrawal_status"]
      : ["status", "state", "investment_status"]
  const reference = firstServerValue(records, ["reference", "deposit_reference", "withdraw_id", "investment_reference", "transaction_reference"])
  const recordId = firstServerValue(records, ["id", "deposit_id", "withdrawal_id", "investment_id", "transaction_id"])
  const status = firstServerValue(records, statusKeys)
  const amount = firstServerValue(records, kind === "investment" ? ["amount", "investment_amount", "invested_amount"] : ["amount"])
  const currency = firstServerValue(records, ["currency", "amount_currency", "original_currency", "wallet_currency"])
  const filenameId = safeFilename(reference || recordId)

  return {
    kind,
    title: kind === "deposit"
      ? "Deposit request receipt"
      : kind === "withdrawal"
        ? "Withdrawal request receipt"
        : kind === "investment"
          ? "Investment request receipt"
          : "Transaction receipt",
    reference,
    recordId,
    amount,
    currency,
    status,
    submittedAt: firstServerValue(records, ["created_at", "submitted_at", "invested_at", "date"]),
    settlementAt: firstServerValue(records, ["settled_at", "completed_at", "credited_at", "paid_at", "transferred_at"]),
    paymentReference: firstServerValue(records, ["bank_reference", "transfer_reference", "payment_reference"]),
    projectReference: firstServerValue(records, ["trade_reference", "trade_id", "project_reference"])
      || firstServerValue([project, projectMeta], ["reference", "trade_reference", "trade_id"]),
    fee: kind === "withdrawal" ? firstServerValue(records, ["fee", "withdrawal_fee"]) : "",
    feeCurrency: kind === "withdrawal" ? firstServerValue(records, ["fee_currency", "currency", "wallet_currency"]) : "",
    totalDebit: kind === "withdrawal" ? firstServerValue(records, ["total_debit"]) : "",
    totalDebitCurrency: kind === "withdrawal" ? firstServerValue(records, ["total_debit_currency", "wallet_currency", "currency"]) : "",
    statusNote: statusExplanation(kind, status),
    filename: `og-exports-${kind}-${filenameId || "receipt"}`,
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character)
}

function receiptRows(receipt: TransactionReceipt): Array<[string, string]> {
  const amount = receipt.amount !== ""
    ? `${receipt.amount}${receipt.currency ? ` ${receipt.currency}` : " (currency not provided)"}`
    : "Not provided"
  return [
    ["Transaction type", receipt.title],
    ["Server reference", receipt.reference || "Not provided"],
    ["Record ID", receipt.recordId || "Not provided"],
    ["Amount returned by OG Exports", amount],
    ["Server status", receipt.status || "Not provided"],
    ["Date returned by OG Exports", receipt.submittedAt || "Not provided"],
    ["Settlement date returned by OG Exports", receipt.settlementAt || "Not provided"],
    ["Bank / payment reference", receipt.paymentReference || "Not provided"],
    ["Project / trade reference", receipt.projectReference || "Not provided"],
    ...(receipt.kind === "withdrawal" ? [
      ["Withdrawal fee", receipt.fee !== ""
        ? `${receipt.fee}${receipt.feeCurrency ? ` ${receipt.feeCurrency}` : " (currency not provided)"}`
        : "Not provided"] as [string, string],
      ["Total wallet debit", receipt.totalDebit !== ""
        ? `${receipt.totalDebit}${receipt.totalDebitCurrency ? ` ${receipt.totalDebitCurrency}` : " (currency not provided)"}`
        : "Not provided"] as [string, string],
    ] : []),
  ]
}

export function transactionReceiptHtml(receipt: TransactionReceipt): string {
  const rows = receiptRows(receipt).map(([label, value]) =>
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
  ).join("")
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(receipt.title)}</title>
  <style>
    :root{color-scheme:light}body{margin:0;background:#f4f7f5;color:#10251c;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{box-sizing:border-box;width:min(720px,100%);margin:32px auto;padding:32px;background:#fff;border:1px solid #dce6df;border-radius:18px}
    header{border-bottom:1px solid #dce6df;padding-bottom:20px;margin-bottom:12px}p.brand{margin:0 0 8px;color:#157347;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
    h1{margin:0;font-size:25px}table{width:100%;border-collapse:collapse}th,td{padding:13px 4px;border-bottom:1px solid #edf1ee;text-align:left;vertical-align:top;overflow-wrap:anywhere}
    th{width:42%;color:#607168;font-size:13px;font-weight:500}td{text-align:right;font-weight:650}
    aside{margin-top:20px;padding:14px 16px;border:1px solid #bcd7c7;border-radius:12px;background:#eff8f2;color:#244d37;font-size:13px}
    footer{margin-top:18px;color:#718078;font-size:11px} @media print{body{background:white}main{width:100%;margin:0;padding:18px;border:0;border-radius:0}}
  </style>
</head>
<body><main>
  <header><p class="brand">OG Exports · Investor record</p><h1>${escapeHtml(receipt.title)}</h1></header>
  <table><tbody>${rows}</tbody></table>
  <aside>${escapeHtml(receipt.statusNote)}</aside>
  <footer>Values on this receipt are limited to information returned by OG Exports. “Not provided” means that field was not available in the server record.</footer>
</main></body></html>`
}

export function downloadTransactionReceipt(receipt: TransactionReceipt): void {
  const blob = new Blob([transactionReceiptHtml(receipt)], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${receipt.filename}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
