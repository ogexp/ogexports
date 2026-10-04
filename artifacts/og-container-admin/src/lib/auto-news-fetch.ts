/**
 * Trade news helpers — Google Cloud ingest is server-side (Laravel).
 * Client RSS/localStorage auto-fetch is deprecated.
 */
import { useEffect } from "react"
import { api, unwrapList, unwrapPage } from "@/lib/api"

export const NEWS_KEY = "og-trade-news"
export const NEWS_AUTO_APPROVE_KEY = "og-news-auto-approve"

export type TradeNewsCat =
  | "commodity"
  | "shipping"
  | "currency"
  | "weather"
  | "regulation"
  | "market"
  | "risk"
  | "ai"

export interface ApiTradeNews {
  id: string
  title: string
  source: string
  sourceUrl: string
  category: TradeNewsCat
  region: string
  summary: string
  content: string
  status: "pending" | "approved" | "rejected" | "scheduled" | "archived"
  featured: boolean
  ogCommentary: string
  publishedAt: string
  scheduledFor: string
  priority: "high" | "medium" | "low"
  tags: string[]
  views?: number
  imageUrl?: string
}

const VALID_CATS = new Set<TradeNewsCat>([
  "commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai",
])

function asCat(raw: unknown): TradeNewsCat {
  const c = String(raw || "market").toLowerCase()
  return VALID_CATS.has(c as TradeNewsCat) ? (c as TradeNewsCat) : "market"
}

/** Map Laravel NewsArticleResource → TradeNews UI shape */
export function mapApiArticle(raw: any): ApiTradeNews {
  const published = Boolean(raw.published)
  const tags: string[] = Array.isArray(raw.tags) ? raw.tags : []
  let status: ApiTradeNews["status"] = published ? "approved" : "pending"
  if (!published && tags.includes("rejected")) status = "rejected"
  if (!published && tags.includes("archived")) status = "archived"
  if (!published && tags.includes("scheduled")) status = "scheduled"

  return {
    id: String(raw.id),
    title: raw.title || "",
    source: raw.source || raw.author || "OG Exports",
    sourceUrl: raw.source_url || raw.sourceUrl || "#",
    category: asCat(raw.category),
    region: raw.region || "Global",
    summary: raw.excerpt || raw.summary || "",
    content: raw.content || "",
    status,
    featured: Boolean(raw.featured),
    ogCommentary: "",
    publishedAt: raw.published_at || raw.publishedAt || new Date().toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags,
    views: Number(raw.views || 0),
    imageUrl: raw.image_url || raw.imageUrl || "",
  }
}

export async function fetchPublicTradeNews(params?: {
  search?: string
  category?: string
  page?: number
  per_page?: number
}): Promise<ApiTradeNews[]> {
  const res = await api.publicGet("/api/news", {
    type: "trade",
    search: params?.search,
    category: params?.category && params.category !== "all" ? params.category : undefined,
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 50,
  })
  return unwrapList(res).map(mapApiArticle)
}

export async function fetchAdminTradeNews(params?: {
  search?: string
  published?: boolean
  category?: string
  page?: number
  per_page?: number
}): Promise<ApiTradeNews[]> {
  const res = await api.get("/api/admin/cms/news", {
    type: "trade",
    search: params?.search,
    published: params?.published === undefined ? undefined : params.published ? 1 : 0,
    category: params?.category && params.category !== "all" ? params.category : undefined,
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 100,
  })
  return unwrapPage(res).data.map(mapApiArticle)
}

export async function syncGoogleNews(): Promise<{
  imported: number
  skipped: number
  errors: string[]
  provider: string
  message: string
}> {
  const res: any = await api.post("/api/admin/news/google-sync")
  const data = res?.data ?? res
  return {
    imported: Number(data?.imported ?? 0),
    skipped: Number(data?.skipped ?? 0),
    errors: Array.isArray(data?.errors) ? data.errors : [],
    provider: String(data?.provider ?? "unknown"),
    message: String(res?.message ?? "Sync complete"),
  }
}

export async function updateTradeNewsArticle(
  id: string,
  payload: Record<string, unknown>,
): Promise<ApiTradeNews> {
  const res: any = await api.put(`/api/admin/cms/news/${id}`, payload)
  return mapApiArticle(res?.data ?? res)
}

export async function deleteTradeNewsArticle(id: string): Promise<void> {
  await api.delete(`/api/admin/cms/news/${id}`)
}

/** @deprecated No-op client RSS fetch — use syncGoogleNews() from admin. */
export async function runAutoFetch(): Promise<number> {
  try {
    const result = await syncGoogleNews()
    return result.imported
  } catch {
    return 0
  }
}

export function isAutoApproveEnabled(): boolean {
  try {
    const val = localStorage.getItem(NEWS_AUTO_APPROVE_KEY)
    return val === null ? false : val === "true"
  } catch {
    return false
  }
}

export function getLastFetchTime(): string {
  try {
    const last = localStorage.getItem("og-trade-last-google-sync")
    if (!last) return "Never"
    const d = new Date(parseInt(last, 10))
    return (
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) +
      " · " +
      d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    )
  } catch {
    return "Never"
  }
}

export function getNextFetchTime(): string {
  return "Hourly (server schedule)"
}

export function markGoogleSyncDone(): void {
  try {
    localStorage.setItem("og-trade-last-google-sync", Date.now().toString())
  } catch {}
}

/** Public pages no longer poll RSS in the browser. */
export function useAutoNewsFetch() {
  useEffect(() => {
    // intentionally empty — news is loaded from Laravel API
  }, [])
}

/** Kept for Config UI display only */
export const RSS_SOURCES = [
  { name: "Google Cloud / Gemini", url: "server-side", category: "market" },
]
