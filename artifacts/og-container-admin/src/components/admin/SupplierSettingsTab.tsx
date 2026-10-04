import { useEffect, useMemo, useState } from "react"
import { Package, Plus, Edit3, Trash2, Shield, CreditCard, X } from "lucide-react"
import {
  addSupplierCertification,
  addSupplierPackagingSize,
  addSupplierPaymentTerm,
  deleteSupplierCertification,
  deleteSupplierPackagingSize,
  deleteSupplierPaymentTerm,
  getSupplierCertifications,
  getSupplierPackagingSizes,
  getSupplierPaymentTerms,
  refreshAllSupplierSettings,
  updateSupplierCertification,
  updateSupplierPackagingSize,
  updateSupplierPaymentTerm,
  type SupplierMarket,
  type SupplierSettingRow,
} from "@/lib/supplier-settings-admin"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

type Section = "certifications" | "packaging" | "payment-terms"

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative w-10 h-5 rounded-full transition-colors shrink-0" style={{ background: checked ? GREEN : "#cbd5e1" }}>
      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: checked ? "calc(100% - 18px)" : "2px" }} />
    </button>
  )
}

const EMPTY: Partial<SupplierSettingRow> = {
  label: "",
  market: "international",
  sortOrder: 0,
  isActive: true,
}

export default function SupplierSettingsTab({ onToast }: { onToast: (msg: string) => void }) {
  const [section, setSection] = useState<Section>("certifications")
  const [marketFilter, setMarketFilter] = useState<SupplierMarket>("international")
  const [certs, setCerts] = useState<SupplierSettingRow[]>([])
  const [packaging, setPackaging] = useState<SupplierSettingRow[]>([])
  const [terms, setTerms] = useState<SupplierSettingRow[]>([])
  const [modal, setModal] = useState<"add" | "edit" | null>(null)
  const [form, setForm] = useState<Partial<SupplierSettingRow>>(EMPTY)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    await refreshAllSupplierSettings()
    setCerts(getSupplierCertifications())
    setPackaging(getSupplierPackagingSizes())
    setTerms(getSupplierPaymentTerms())
  }

  useEffect(() => {
    void reload().catch(() => onToast("⚠ Failed to load supplier settings"))
  }, [])

  const rows = useMemo(() => {
    if (section === "packaging") return packaging
    const source = section === "certifications" ? certs : terms
    return source.filter(r => r.market === marketFilter)
  }, [section, packaging, certs, terms, marketFilter])

  const openAdd = () => {
    const nextSort = (rows.length + 1)
    setForm({
      ...EMPTY,
      market: section === "packaging" ? undefined : marketFilter,
      sortOrder: nextSort,
    })
    setModal("add")
  }

  const openEdit = (row: SupplierSettingRow) => {
    setForm({ ...row })
    setModal("edit")
  }

  const saveForm = async () => {
    const label = (form.label || "").trim()
    if (!label) {
      onToast("⚠ Label is required")
      return
    }
    setSaving(true)
    try {
      const payload: Omit<SupplierSettingRow, "id"> = {
        label,
        sortOrder: Number(form.sortOrder ?? 0),
        isActive: form.isActive !== false,
        ...(section !== "packaging" ? { market: (form.market || marketFilter) as SupplierMarket } : {}),
      }

      if (modal === "add") {
        if (section === "certifications") await addSupplierCertification(payload)
        else if (section === "packaging") await addSupplierPackagingSize(payload)
        else await addSupplierPaymentTerm(payload)
        onToast("✓ Item added")
      } else if (modal === "edit" && form.id) {
        if (section === "certifications") await updateSupplierCertification(form.id, payload)
        else if (section === "packaging") await updateSupplierPackagingSize(form.id, payload)
        else await updateSupplierPaymentTerm(form.id, payload)
        onToast("✓ Item updated")
      }
      await reload()
      setModal(null)
    } catch (err: any) {
      onToast(`⚠ ${err?.message || "Save failed"}`)
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      if (section === "certifications") await deleteSupplierCertification(deleteId)
      else if (section === "packaging") await deleteSupplierPackagingSize(deleteId)
      else await deleteSupplierPaymentTerm(deleteId)
      await reload()
      onToast("✓ Item deleted")
      setDeleteId(null)
    } catch (err: any) {
      onToast(`⚠ ${err?.message || "Delete failed"}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row: SupplierSettingRow, isActive: boolean) => {
    try {
      if (section === "certifications") await updateSupplierCertification(row.id, { isActive })
      else if (section === "packaging") await updateSupplierPackagingSize(row.id, { isActive })
      else await updateSupplierPaymentTerm(row.id, { isActive })
      await reload()
    } catch (err: any) {
      onToast(`⚠ ${err?.message || "Update failed"}`)
    }
  }

  const sectionMeta = {
    certifications: {
      title: "Certifications",
      subtitle: "Shown on Submit Offer based on supplier country (Pakistan vs International)",
      icon: Shield,
    },
    packaging: {
      title: "Unit / Packaging Size",
      subtitle: "Global packaging units available to all suppliers",
      icon: Package,
    },
    "payment-terms": {
      title: "Accepted Payment Terms",
      subtitle: "Market-specific payment terms for Pakistan and International suppliers",
      icon: CreditCard,
    },
  }[section]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {([
          { id: "certifications" as const, label: "1. Certifications" },
          { id: "packaging" as const, label: "2. Unit / Packaging Size" },
          { id: "payment-terms" as const, label: "3. Accepted Payment Terms" },
        ]).map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={{
              background: section === s.id ? EMERALD : "transparent",
              color: section === s.id ? "white" : "#64748b",
              borderColor: section === s.id ? EMERALD : "#e2e8f0",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <sectionMeta.icon className="w-4 h-4" /> {sectionMeta.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sectionMeta.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: EMERALD }}
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {section !== "packaging" && (
        <div className="flex gap-2">
          {([
            { id: "pakistan" as const, label: "Pakistan" },
            { id: "international" as const, label: "International" },
          ]).map(m => (
            <button
              key={m.id}
              onClick={() => setMarketFilter(m.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                background: marketFilter === m.id ? "#ecfdf5" : "white",
                color: marketFilter === m.id ? EMERALD : "#64748b",
                borderColor: marketFilter === m.id ? EMERALD : "#e2e8f0",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl">
          <sectionMeta.icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {section === "packaging"
              ? "No packaging sizes yet. Add one above."
              : `No ${sectionMeta.title.toLowerCase()} for ${marketFilter === "pakistan" ? "Pakistan" : "International"} yet.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Label</th>
                {section !== "packaging" && <th className="px-4 py-3 font-semibold">Market</th>}
                <th className="px-4 py-3 font-semibold">Sort</th>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-border hover:bg-muted/20" style={{ opacity: row.isActive ? 1 : 0.65 }}>
                  <td className="px-4 py-3 font-medium">{row.label}</td>
                  {section !== "packaging" && (
                    <td className="px-4 py-3 capitalize text-muted-foreground">{row.market}</td>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">{row.sortOrder}</td>
                  <td className="px-4 py-3">
                    <ToggleSwitch checked={row.isActive} onChange={v => void toggleActive(row, v)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(row)} title="Edit" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteId(row.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">{modal === "add" ? `Add ${sectionMeta.title}` : `Edit ${sectionMeta.title}`}</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Label</label>
              <input
                value={form.label || ""}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. HACCP"
              />
            </div>

            {section !== "packaging" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Market</label>
                <select
                  value={form.market || marketFilter}
                  onChange={e => setForm(f => ({ ...f, market: e.target.value as SupplierMarket }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none bg-background"
                >
                  <option value="pakistan">Pakistan</option>
                  <option value="international">International</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder ?? 0}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active</span>
              <ToggleSwitch checked={form.isActive !== false} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={() => void saveForm()}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: EMERALD }}
              >
                {modal === "add" ? "Add" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-base">Delete item?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove <span className="font-semibold text-foreground">{rows.find(r => r.id === deleteId)?.label}</span>. Existing offers keep their stored values.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => void doDelete()} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
