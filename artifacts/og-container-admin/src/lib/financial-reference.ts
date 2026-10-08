export type ClipboardWriter = (value: string) => Promise<boolean | void>
export type FinancialCopyTarget = { value: string; kind: "id" | "reference" }

export function resolveCanonicalFinancialId(
  record: unknown,
  fields: readonly string[] = ["id"],
): string {
  if (!record || typeof record !== "object") return ""

  const values = record as Record<string, unknown>
  for (const field of fields) {
    const raw = values[field]
    const value = typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0
      ? String(raw)
      : typeof raw === "string"
        ? raw.trim()
        : ""

    if (/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))) return value
  }

  return ""
}

export async function copyCanonicalFinancialId(
  record: unknown,
  writeText: ClipboardWriter,
  fields: readonly string[] = ["id"],
): Promise<string> {
  const id = resolveCanonicalFinancialId(record, fields)
  if (!id) throw new Error("No server-provided financial record ID is available to copy.")

  const copied = await writeText(id)
  if (copied === false) throw new Error("Clipboard did not confirm the copy.")

  return id
}

export function resolveFinancialCopyTarget(
  record: unknown,
  idFields: readonly string[],
  referenceFields: readonly string[],
): FinancialCopyTarget | null {
  const id = resolveCanonicalFinancialId(record, idFields)
  if (id) return { value: id, kind: "id" }
  if (!record || typeof record !== "object") return null

  const values = record as Record<string, unknown>
  for (const field of referenceFields) {
    const raw = values[field]
    const value = typeof raw === "string"
      ? raw.trim()
      : typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? String(raw)
        : ""
    if (value) return { value, kind: "reference" }
  }

  return null
}

export async function copyFinancialReference(
  record: unknown,
  writeText: ClipboardWriter,
  idFields: readonly string[],
  referenceFields: readonly string[],
): Promise<FinancialCopyTarget> {
  const target = resolveFinancialCopyTarget(record, idFields, referenceFields)
  if (!target) throw new Error("No server-provided financial ID or reference is available to copy.")

  const copied = await writeText(target.value)
  if (copied === false) throw new Error("Clipboard did not confirm the copy.")

  return target
}
