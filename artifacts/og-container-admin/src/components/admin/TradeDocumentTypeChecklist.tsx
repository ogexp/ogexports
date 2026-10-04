import { useMemo, useRef, type ElementType } from "react"
import {
  Archive, CheckCircle2, Download, Eye, FileText, FolderOpen, Loader2,
  Lock, Package, Shield, Trash2, Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SHIPMENT_DOCUMENT_TYPES,
  indexDocumentsByType,
  type AdminShipmentDocument,
} from "@/lib/admin-data"

const EMERALD = "#0F3D2E"

type Category = "Commercial" | "Shipping" | "Government" | "Quality" | "Insurance" | "Finance" | "Other"

const TYPE_META: Record<Category, { icon: ElementType; color: string; bg: string }> = {
  Commercial: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/15" },
  Shipping: { icon: Package, color: "text-teal-600", bg: "bg-teal-500/15" },
  Government: { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/15" },
  Quality: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15" },
  Insurance: { icon: Lock, color: "text-purple-500", bg: "bg-purple-500/15" },
  Finance: { icon: Archive, color: "text-amber-700", bg: "bg-amber-700/15" },
  Other: { icon: FolderOpen, color: "text-muted-foreground", bg: "bg-muted" },
}

function guessBucket(type?: string): Category {
  const t = (type || "").toLowerCase()
  if (t.includes("invoice") || t.includes("packing")) return "Commercial"
  if (t.includes("bill of lading") || t.includes("bl ") || t === "bl" || t.includes("shipping")) return "Shipping"
  if (t.includes("origin") || t.includes("phyto") || t.includes("fumig")) return "Government"
  if (t.includes("coa") || t.includes("analysis") || t.includes("quality")) return "Quality"
  if (t.includes("insur")) return "Insurance"
  if (t.includes("lc") || t.includes("sblc") || t.includes("finance")) return "Finance"
  return "Other"
}

export type TradeDocumentTypeChecklistProps = {
  types?: readonly string[]
  documents: AdminShipmentDocument[]
  loading?: boolean
  uploadingType?: string | null
  onUpload: (type: string, file: File) => void
  onView: (doc: AdminShipmentDocument) => void
  onDownload: (doc: AdminShipmentDocument) => void
  onDelete: (doc: AdminShipmentDocument) => void
  readOnly?: boolean
}

export function TradeDocumentTypeChecklist({
  types = SHIPMENT_DOCUMENT_TYPES,
  documents,
  loading = false,
  uploadingType = null,
  onUpload,
  onView,
  onDownload,
  onDelete,
  readOnly = false,
}: TradeDocumentTypeChecklistProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingTypeRef = useRef<string | null>(null)

  const byType = useMemo(() => indexDocumentsByType(documents), [documents])

  function startUpload(type: string) {
    if (readOnly || uploadingType) return
    pendingTypeRef.current = type
    fileInputRef.current?.click()
  }

  function handleFileChange(fileList: FileList | null) {
    const type = pendingTypeRef.current
    pendingTypeRef.current = null
    const file = fileList?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!type || !file) return
    onUpload(type, file)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading documents…
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
        className="hidden"
        onChange={e => handleFileChange(e.target.files)}
      />
      {types.map(type => {
        const existing = byType.get(type)
        const busy = uploadingType === type
        const meta = TYPE_META[guessBucket(type)]
        return (
          <div
            key={type}
            className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
              <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate">{type}</p>
              {existing ? (
                <p className="text-[10px] text-emerald-600 mt-0.5 truncate">
                  Uploaded · {existing.title || existing.type}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">Not uploaded yet</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {existing && (
                <>
                  <button
                    type="button"
                    onClick={() => onView(existing)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(existing)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onDelete(existing)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  )}
                </>
              )}
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[10px] px-2"
                  disabled={!!uploadingType}
                  onClick={() => startUpload(type)}
                  style={busy ? { borderColor: EMERALD, color: EMERALD } : undefined}
                >
                  {busy
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Upload className="w-3 h-3" />}
                  {existing ? "Replace" : "Upload"}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
