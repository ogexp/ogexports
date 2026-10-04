import { useCallback, useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Bell, Plus, Search, Loader2, Trash2, CheckCircle2, Pencil, X } from "lucide-react"
import { api } from "@/lib/api"
import { notify } from "@/lib/notify"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

type Announcement = {
  id: number
  title: string
  body: string
  audience: string
  published_at: string | null
  is_active: boolean
  created_at: string
  creator?: { id: number; name: string }
}

const AUDIENCES = [
  { value: "all", label: "All Users" },
  { value: "buyer", label: "Buyers" },
  { value: "supplier", label: "Suppliers" },
  { value: "investor", label: "Investors" },
]

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return String(iso)
  }
}

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all",
    is_active: true,
    publish: true,
  })

  const load = useCallback(async (q = search) => {
    setLoading(true)
    try {
      const res = await api.get<any>("/api/admin/announcements", {
        per_page: 100,
        search: q || undefined,
      })
      const list = Array.isArray(res?.data) ? res.data : []
      setItems(list)
    } catch (e: any) {
      notify.error(e?.message || "Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditing(null)
    setForm({ title: "", body: "", audience: "all", is_active: true, publish: true })
    setShowForm(true)
  }

  function openEdit(a: Announcement) {
    setEditing(a)
    setForm({
      title: a.title,
      body: a.body,
      audience: a.audience,
      is_active: a.is_active,
      publish: Boolean(a.published_at),
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      notify.error("Title and body are required")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/admin/announcements/${editing.id}`, form)
        notify.success("Announcement updated")
      } else {
        await api.post("/api/admin/announcements", form)
        notify.success("Announcement published")
      }
      setShowForm(false)
      setEditing(null)
      await load()
    } catch (err: any) {
      notify.error(err?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this announcement?")) return
    try {
      await api.delete(`/api/admin/announcements/${id}`)
      notify.success("Announcement deleted")
      await load()
    } catch (e: any) {
      notify.error(e?.message || "Delete failed")
    }
  }

  async function toggleActive(a: Announcement) {
    try {
      await api.put(`/api/admin/announcements/${a.id}`, { is_active: !a.is_active })
      await load()
    } catch (e: any) {
      notify.error(e?.message || "Update failed")
    }
  }

  const filtered = items.filter(a => {
    const q = search.toLowerCase()
    if (!q) return true
    return a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
  })

  return (
    <AdminLayout title="Announcements" subtitle="Create and manage platform announcements by audience">
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search announcements…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: EMERALD }}
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total", value: items.length, color: GOLD },
            { label: "Active", value: items.filter(a => a.is_active).length, color: GREEN },
            { label: "Published", value: items.filter(a => a.published_at).length, color: EMERALD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">{editing ? "Edit Announcement" : "Create Announcement"}</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                required
              />
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Announcement body…"
                rows={5}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg"
                required
              />
              <div className="flex flex-wrap gap-4 items-center">
                <label className="text-sm flex items-center gap-2">
                  Audience
                  <select
                    value={form.audience}
                    onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                    className="border border-border rounded-lg px-2 py-1.5 text-sm"
                  >
                    {AUDIENCES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                  Active
                </label>
                {!editing && (
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.publish}
                      onChange={e => setForm(f => ({ ...f, publish: e.target.checked }))}
                    />
                    Publish & notify
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: EMERALD }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Save Changes" : "Create")}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-border">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {loading && (
            <div className="py-12 flex justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No announcements yet</div>
          )}
          {filtered.map(a => (
            <div key={a.id} className="p-4 border-b border-border/50 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${EMERALD}15` }}>
                <Bell className="w-5 h-5" style={{ color: EMERALD }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold">{a.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted capitalize">{a.audience}</span>
                  {a.is_active
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#f0fdf4", color: GREEN }}>Active</span>
                    : <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>}
                </div>
                <p className="text-sm text-foreground/80 line-clamp-2 whitespace-pre-wrap">{a.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {a.creator?.name || "Admin"} · {fmtDateTime(a.published_at || a.created_at)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-muted" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => toggleActive(a)} className="p-2 rounded-lg hover:bg-muted" title="Toggle active">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: a.is_active ? GREEN : undefined }} />
                </button>
                <button type="button" onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-50" title="Delete">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
