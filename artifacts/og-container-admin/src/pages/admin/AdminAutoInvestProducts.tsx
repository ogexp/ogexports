import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw, Trash2, Zap } from "lucide-react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"

type AutoInvestCommodity = {
  id: number
  name: string
  enabled: boolean
  sort_order: number
}

type ApiList<T> = { data: T[] }
type ApiItem<T> = { data: T }

export default function AdminAutoInvestProducts() {
  const [items, setItems] = useState<AutoInvestCommodity[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await api.get<ApiList<AutoInvestCommodity>>("/api/admin/auto-invest-commodities")
      setItems(response.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load auto-invest products.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || saving) return
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const response = await api.post<ApiItem<AutoInvestCommodity>>("/api/admin/auto-invest-commodities", { name: trimmedName })
      setItems(current => [...current, response.data].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))
      setName("")
      setNotice(`${response.data.name} is available in investor mobile now.`)
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : saveError instanceof Error ? saveError.message : "Could not save this product.")
    } finally {
      setSaving(false)
    }
  }

  async function setEnabled(item: AutoInvestCommodity, enabled: boolean) {
    setPendingId(item.id)
    setError("")
    setNotice("")
    try {
      const response = await api.put<ApiItem<AutoInvestCommodity>>(`/api/admin/auto-invest-commodities/${item.id}`, { enabled })
      setItems(current => current.map(entry => entry.id === item.id ? response.data : entry))
      setNotice(enabled ? `${item.name} is visible in investor mobile.` : `${item.name} was removed from the mobile choices.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this product.")
    } finally {
      setPendingId(null)
    }
  }

  async function remove(item: AutoInvestCommodity) {
    if (!window.confirm(`Remove ${item.name} from the mobile Auto-invest list? Existing investor rules for it will stop matching.`)) return
    setPendingId(item.id)
    setError("")
    setNotice("")
    try {
      await api.delete(`/api/admin/auto-invest-commodities/${item.id}`)
      setItems(current => current.filter(entry => entry.id !== item.id))
      setNotice(`${item.name} was removed.`)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove this product.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <AdminLayout title="Auto-invest Mobile" subtitle="Choose the commodities investors can select in the mobile Auto-invest page">
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Mobile product choices</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Enabled products appear on the investor mobile screen. Turning one off also stops future auto-invest matches for that commodity.
              </p>
            </div>
            <Button type="button" variant="outline" size="icon" className="ml-auto shrink-0" onClick={() => void refresh()} disabled={loading} aria-label="Refresh products">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <form onSubmit={addProduct} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Add a commodity or product name"
              aria-label="New mobile Auto-invest product"
              maxLength={120}
              className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-emerald-800"
            />
            <Button type="submit" disabled={!name.trim() || saving} className="min-h-11 bg-emerald-900 hover:bg-emerald-800">
              <Plus className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Add product"}
            </Button>
          </form>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-foreground">Investor mobile list</h2>
              <p className="mt-1 text-xs text-muted-foreground">{items.filter(item => item.enabled).length} enabled · {items.length} total</p>
            </div>
          </div>
          {loading && !items.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading products…</div>
          ) : items.length ? (
            <ul className="divide-y divide-border">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.enabled ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-400"}`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.enabled ? "Shown in mobile" : "Hidden from mobile"}</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.enabled ? "On" : "Off"}</span>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={pendingId === item.id}
                      onChange={event => void setEnabled(item, event.target.checked)}
                      aria-label={`${item.enabled ? "Hide" : "Show"} ${item.name} in mobile`}
                      className="h-4 w-4 accent-emerald-800"
                    />
                  </label>
                  <Button type="button" variant="ghost" size="icon" disabled={pendingId === item.id} onClick={() => void remove(item)} aria-label={`Remove ${item.name}`}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No mobile products yet. Add a commodity above.</div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}
