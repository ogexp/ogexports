import { useCallback, useEffect, useMemo, useState, type ElementType } from "react"
import { useQuery } from "@tanstack/react-query"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  FolderOpen, FileText, Download, Eye, Search, Package, Shield,
  CheckCircle2, Lock, Archive, Loader2, AlertCircle, Star,
} from "lucide-react"
import {
  api, unwrapPage, downloadAuthenticatedFile, openAuthenticatedFile,
} from "@/lib/api"
import {
  notifyTradeDocumentDownloadError,
  notifyTradeDocumentViewError,
} from "@/lib/buyerTradeDocuments"
import { notify } from "@/lib/notify"
import { useSafeAuth } from "@/lib/use-safe-auth"

const CATEGORIES = ["Commercial", "Shipping", "Government", "Quality", "Insurance", "Finance"] as const
type Category = (typeof CATEGORIES)[number]

const TYPE_META: Record<Category | "Other", { icon: ElementType; color: string; bg: string }> = {
  Commercial: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/15" },
  Shipping: { icon: Package, color: "text-teal-600", bg: "bg-teal-500/15" },
  Government: { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/15" },
  Quality: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15" },
  Insurance: { icon: Lock, color: "text-purple-500", bg: "bg-purple-500/15" },
  Finance: { icon: Archive, color: "text-amber-700", bg: "bg-amber-700/15" },
  Other: { icon: FolderOpen, color: "text-muted-foreground", bg: "bg-muted" },
}

type DocRow = {
  id: number
  name: string
  orderId: string
  date: string
  dateSort: number
  type: Category | "Other"
  rawType: string
  sizeLabel: string
  status: "available" | "pending"
  source: "buyer" | "admin"
  downloadUrl: string
  viewUrl: string
}

function guessBucket(type?: string): Category | "Other" {
  const t = (type || "").toLowerCase()
  if (t.includes("invoice") || t.includes("packing")) return "Commercial"
  if (t.includes("bill of lading") || t.includes("bl ") || t === "bl" || t.includes("shipping")) return "Shipping"
  if (t.includes("origin") || t.includes("phyto") || t.includes("fumig")) return "Government"
  if (t.includes("coa") || t.includes("analysis") || t.includes("quality")) return "Quality"
  if (t.includes("insur")) return "Insurance"
  if (t.includes("lc") || t.includes("sblc") || t.includes("finance")) return "Finance"
  return "Other"
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDocDate(value: string | null | undefined): { label: string; sort: number } {
  if (!value) return { label: "TBC", sort: 0 }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { label: "TBC", sort: 0 }
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    sort: d.getTime(),
  }
}

function starStorageKey(userId: string | null | undefined) {
  return `buyer-docs-starred:${userId || "anon"}`
}

function readStarred(userId: string | null | undefined): Set<number> {
  try {
    const raw = localStorage.getItem(starStorageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as number[]
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [])
  } catch {
    return new Set()
  }
}

function writeStarred(userId: string | null | undefined, ids: Set<number>) {
  localStorage.setItem(starStorageKey(userId), JSON.stringify([...ids]))
}

function mapDoc(d: any): DocRow {
  const name = d.title || d.type || `Document #${d.id}`
  const { label: date, sort: dateSort } = formatDocDate(d.created_at)
  const status = d.status === "pending" ? "pending" : "available"
  return {
    id: d.id,
    name,
    orderId: d.order_number || (d.order_id ? `PO-${d.order_id}` : (d.shipment_id ? `SHP-${d.shipment_id}` : "—")),
    date,
    dateSort,
    type: guessBucket(d.type),
    rawType: d.type || "",
    sizeLabel: formatFileSize(d.file_size),
    status,
    source: d.source === "buyer" ? "buyer" : "admin",
    downloadUrl: `/api/buyer/documents/${d.id}/download`,
    viewUrl: `/api/buyer/documents/${d.id}/view`,
  }
}

export default function BuyerDocuments() {
  const { userId } = useSafeAuth()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("All")
  const [starredOnly, setStarredOnly] = useState(false)
  const [starred, setStarred] = useState<Set<number>>(() => readStarred(userId))
  const [downloadingAll, setDownloadingAll] = useState(false)

  useEffect(() => {
    setStarred(readStarred(userId))
  }, [userId])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["buyer", "documents"],
    queryFn: () => api.get("/api/buyer/documents", { per_page: 100 }),
    retry: 1,
  })

  const docs = useMemo(() => {
    const rows = unwrapPage<any>(data).data.map(mapDoc)
    rows.sort((a: DocRow, b: DocRow) => b.dateSort - a.dateSort)
    return rows as DocRow[]
  }, [data])

  const adminDocs = useMemo(() => docs.filter((d) => d.source === "admin"), [docs])

  const typeCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      Commercial: 0, Shipping: 0, Government: 0, Quality: 0, Insurance: 0, Finance: 0,
    }
    for (const d of adminDocs) {
      if (d.type in counts) counts[d.type as Category] += 1
    }
    return counts
  }, [adminDocs])

  const filteredAdmin = useMemo(() => {
    const q = search.toLowerCase().trim()
    return adminDocs.filter((d) => {
      const matchSearch = !q
        || d.name.toLowerCase().includes(q)
        || d.orderId.toLowerCase().includes(q)
        || d.rawType.toLowerCase().includes(q)
      const matchType = typeFilter === "All" || d.type === typeFilter
      const matchStar = !starredOnly || starred.has(d.id)
      return matchSearch && matchType && matchStar
    })
  }, [adminDocs, search, typeFilter, starredOnly, starred])

  const toggleStar = useCallback((id: number) => {
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      writeStarred(userId, next)
      return next
    })
  }, [userId])

  async function viewDoc(d: DocRow) {
    if (d.status === "pending") {
      notify.error("Document is not available yet")
      return
    }
    try {
      await openAuthenticatedFile(d.viewUrl)
    } catch (e) {
      notifyTradeDocumentViewError(e)
    }
  }

  async function downloadDoc(d: DocRow) {
    if (d.status === "pending") {
      notify.error("Document is not available yet")
      return
    }
    try {
      await downloadAuthenticatedFile(d.downloadUrl, d.name)
    } catch (e) {
      notifyTradeDocumentDownloadError(e)
    }
  }

  async function downloadAll() {
    const available = filteredAdmin.filter((d) => d.status === "available")
    if (!available.length) {
      notify.error("No available documents to download")
      return
    }
    setDownloadingAll(true)
    try {
      for (const d of available) {
        await downloadAuthenticatedFile(d.downloadUrl, d.name)
      }
      notify.success(`Downloaded ${available.length} document${available.length === 1 ? "" : "s"}`)
    } catch (e) {
      notifyTradeDocumentDownloadError(e, "Unable to download all documents")
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <BuyerPortalLayout title="Trade Documents" subtitle="View and download trade documents issued by OG Exports">
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-heading font-bold mb-3">Documents from OG Exports</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {CATEGORIES.map((cat) => {
              const meta = TYPE_META[cat]
              const active = typeFilter === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTypeFilter(active ? "All" : cat)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 bg-card hover:border-primary/30"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${meta.bg}`}>
                    <meta.icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{cat}</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">{typeCounts[cat]}</p>
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 h-10"
                  placeholder="Search documents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[120px]"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Button
                type="button"
                variant={starredOnly ? "default" : "outline"}
                size="sm"
                className="h-10 gap-1.5"
                onClick={() => setStarredOnly((v) => !v)}
              >
                <Star className={`w-3.5 h-3.5 ${starredOnly ? "fill-current" : ""}`} />
                Starred
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 ml-auto"
                disabled={downloadingAll || filteredAdmin.length === 0}
                onClick={() => void downloadAll()}
              >
                {downloadingAll
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                Download All
              </Button>
            </div>
            {!isLoading && !isError && (
              <p className="text-xs text-muted-foreground">
                {filteredAdmin.length} document{filteredAdmin.length === 1 ? "" : "s"} from admin — All documents are encrypted and access-controlled.
              </p>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading documents…
            </div>
          )}

          {!isLoading && isError && (
            <Card className="glass-card border-red-500/20">
              <CardContent className="py-12 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
                <p className="text-sm font-medium text-foreground">Could not load trade documents</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "Check your connection and try again."}
                </p>
                <Button size="sm" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
                  {isFetching ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && filteredAdmin.length === 0 && (
            <Card className="glass-card">
              <CardContent className="py-12 text-center space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  No admin documents yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Documents uploaded by OG Exports to your orders and shipments will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && filteredAdmin.length > 0 && (
            <Card className="glass-card overflow-hidden mt-3">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Title</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmin.map((d) => {
                      const meta = TYPE_META[d.type] || TYPE_META.Other
                      const isStarred = starred.has(d.id)
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                                <meta.icon className={`w-4 h-4 ${meta.color}`} />
                              </div>
                              <span className="text-sm font-semibold truncate">{d.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.orderId}</TableCell>
                          <TableCell>
                            <Badge className="border-0 text-[10px] bg-muted text-muted-foreground font-medium">
                              {d.rawType || d.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.date}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.sizeLabel}</TableCell>
                          <TableCell>
                            {d.status === "available" ? (
                              <Badge className="border-0 text-[10px] bg-emerald-500/15 text-emerald-600 font-medium">
                                Available
                              </Badge>
                            ) : (
                              <Badge className="border-0 text-[10px] bg-amber-500/15 text-amber-600 font-medium">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title={isStarred ? "Unstar" : "Star"}
                                onClick={() => toggleStar(d.id)}
                              >
                                <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="View"
                                disabled={d.status === "pending"}
                                onClick={() => void viewDoc(d)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Download"
                                disabled={d.status === "pending"}
                                onClick={() => void downloadDoc(d)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
