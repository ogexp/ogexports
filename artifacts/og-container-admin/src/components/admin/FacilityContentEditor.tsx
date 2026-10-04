import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { fetchFacilityContent, saveFacilityContent } from "@/lib/admin-data"
import { runAdminAction } from "@/lib/admin-actions"

type FacilityType = "feed" | "ricemill" | "plant"

export function FacilityContentEditor({
  type,
  onToast,
}: {
  type: FacilityType
  onToast: (msg: string, type?: "success" | "error") => void
}) {
  const [json, setJson] = useState("{}")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchFacilityContent(type)
      .then(data => setJson(JSON.stringify(data, null, 2)))
      .catch(() => setJson("{}"))
      .finally(() => setLoading(false))
  }, [type])

  async function handleSave() {
    setSaving(true)
    await runAdminAction(async () => {
      const parsed = JSON.parse(json)
      await saveFacilityContent(type, parsed)
    }, {
      reload: async () => {
        const data = await fetchFacilityContent(type)
        setJson(JSON.stringify(data, null, 2))
      },
      successMessage: "Facility dashboard content saved",
      onSuccess: m => onToast(m || "Saved", "success"),
      onError: m => onToast(m, "error"),
    })
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading facility content…
      </div>
    )
  }

  return (
    <div className="mb-5 p-4 rounded-xl border border-border bg-muted/20 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold capitalize">{type.replace("_", " ")} Dashboard Content</h3>
          <p className="text-xs text-muted-foreground">Edit stats, utilization rows, production data, timeline, and operational updates (JSON).</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
          style={{ background: "#0F3D2E" }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Content
        </button>
      </div>
      <textarea
        value={json}
        onChange={e => setJson(e.target.value)}
        rows={12}
        className="w-full font-mono text-xs border border-border rounded-lg p-3 bg-background focus:outline-none focus:border-primary"
        spellCheck={false}
      />
    </div>
  )
}
